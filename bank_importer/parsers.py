"""
parsers.py — Банкны хуулга файл унших

Дэмжих форматууд:
  - TDB  (.XLS)   — Голландын xlrd library
  - Golomt (.xlsx) — pandas read_excel
  - M Bank (.XLS)  — xlrd

Бүх parser нь нийтлэг dict бүтэц буцаана:
  {
    'account_id':   str,          # 'TT' | 'TR' | 'GM' | 'MB'
    'txn_date':     datetime,
    'bank':         str,          # BANK_DISPLAY-с
    'description':  str,          # цэвэрлэсэн
    'counterparty': str,
    'account_no':   str,
    'exchange_rate': float,       # 1.0 (MNT)
    'income':       float | None,
    'expense':      float | None,
  }
"""

import re
import pandas as pd
import xlrd
from xlrd import xldate_as_datetime
from datetime import datetime

from config import (
    TDB_COL, GOLOMT_COL, MBANK_COL,
    BANK_DISPLAY, SKIP_KEYWORDS, GENERIC_COUNTERPARTIES,
    TDB_TT_ACCOUNT, TDB_TR_ACCOUNT,
)


# ── Тусламжийн функцүүд ───────────────────────────────────────────────────

def _should_skip(description: str) -> bool:
    """Орхих гүйлгээ мөн эсэх шалгах."""
    d = description.lower()
    return any(kw in d for kw in SKIP_KEYWORDS)


def _clean_description(desc: str, account_no: str = '') -> str:
    """
    Гүйлгээний утгыг стандарт хэлбэрт оруулах:
    - 'EB-' угтвар хасах
    - 'дансны дугаар -> данс' хэлбэрийн мэдээлэл хасах
    """
    s = str(desc).strip()
    s = re.sub(r'^[EЕ][BВ]\s*[-–]\s*', '', s, flags=re.IGNORECASE).strip()
    if account_no:
        s = re.sub(
            rf'\s*:\s*\d+-\({account_no}[^)]*\)->.*$', '', s, flags=re.DOTALL
        ).strip()
    s = re.sub(r'\s*:\s*\d+-\([^)]*\)->\s*\d+-[^:]*$', '', s, flags=re.DOTALL).strip()
    return s


def _extract_counterparty(raw_desc: str, ctpy: str) -> str:
    """
    Харилцагч нь ерөнхий нэр (жнь: 'БАГА ДҮНТЭЙ ГҮЙЛГЭЭ') байвал
    тайлбараас бодит нэрийг олох оролдлого хийнэ.
    """
    if ctpy.strip().upper() not in GENERIC_COUNTERPARTIES:
        return ctpy

    # (дансны_дугаар-Компанийн нэр) хэлбэр
    for _acct, nm in re.findall(r'\((\d+)-([^)]+)\)', raw_desc):
        nm = nm.strip()
        if 'ТҮМЭН ТЭЭХ' not in nm.upper() and len(nm) > 3:
            return nm

    # Монгол үсгийн компанийн нэр хайх
    m = re.search(
        r'([А-ЯЁҮӨA-Z][А-ЯЁҮӨA-Z\s\-]+?(?:ХХК|ХК|ТББ|ХНН|ТҮЦ|ОНД))(?:[^А-ЯЁҮӨA-Z]|$)',
        raw_desc,
    )
    if m:
        nm = m.group(1).strip(' -')
        if 'ТҮМЭН ТЭЭХ' not in nm.upper() and len(nm) > 3:
            return nm

    return ctpy


# ── Parser функцүүд ───────────────────────────────────────────────────────

def parse_tdb(filepath: str, account_id: str, cutoff: datetime) -> list[dict]:
    """
    TDB XLS файл унших (TT болон TR хоёуланд ашиглана).

    account_id: 'TT' эсвэл 'TR'
    cutoff:     энэ огнооноос хойших гүйлгээг л авна
    """
    account_no = TDB_TT_ACCOUNT if account_id == 'TT' else TDB_TR_ACCOUNT
    col = TDB_COL
    result = []

    wb = xlrd.open_workbook(filepath)
    ws = wb.sheet_by_index(0)

    for i in range(col['data_start_row'], ws.nrows):
        date_val = ws.cell_value(i, col['date'])

        # Огноо мөрүүд л float (Excel serial) байна
        if not isinstance(date_val, float) or date_val < 40000:
            continue

        try:
            txn_date = xldate_as_datetime(date_val, wb.datemode)
        except Exception:
            continue

        if txn_date <= cutoff:
            continue

        income  = float(ws.cell_value(i, col['income'])  or 0)
        expense = float(ws.cell_value(i, col['expense']) or 0)
        if income == 0 and expense == 0:
            continue

        raw_desc = str(ws.cell_value(i, col['description']) or '')
        if _should_skip(raw_desc):
            continue

        raw_ctpy = str(ws.cell_value(i, col['counterparty']) or '').strip()
        ctpy     = _extract_counterparty(raw_desc, raw_ctpy)
        desc     = _clean_description(raw_desc, account_no)

        result.append({
            'account_id':    account_id,
            'txn_date':      txn_date,
            'bank':          BANK_DISPLAY[account_id],
            'description':   desc,
            'counterparty':  ctpy,
            'account_no':    '',
            'exchange_rate': 1.0,
            'income':        income  if income  > 0 else None,
            'expense':       expense if expense > 0 else None,
        })

    wb.release_resources()
    return result


def parse_golomt(filepath: str, cutoff: datetime) -> list[dict]:
    """
    Golomt XLSX файл унших.
    Cutoff: TT-тэй ижил (Golomт нь TT компанийн данс учраас).
    """
    col = GOLOMT_COL
    result = []

    df = pd.read_excel(filepath, header=None)

    for _, row in df.iterrows():
        date_val = row.iloc[col['date']] if len(row) > col['date'] else None
        if pd.isna(date_val):
            continue

        try:
            txn_date = datetime.fromisoformat(str(date_val).strip())
        except Exception:
            continue

        if txn_date <= cutoff:
            continue

        income  = float(row.iloc[col['income']])  if len(row) > col['income']  and pd.notna(row.iloc[col['income']])  else 0.0
        expense = float(row.iloc[col['expense']]) if len(row) > col['expense'] and pd.notna(row.iloc[col['expense']]) else 0.0
        if income == 0 and expense == 0:
            continue

        raw_desc = str(row.iloc[col['description']]) if len(row) > col['description'] and pd.notna(row.iloc[col['description']]) else ''
        ctpy     = str(row.iloc[col['counterparty']]) if len(row) > col['counterparty'] and pd.notna(row.iloc[col['counterparty']]) else ''
        acct     = str(row.iloc[col['account_no']])   if len(row) > col['account_no']   and pd.notna(row.iloc[col['account_no']])   else ''
        desc     = _clean_description(raw_desc)

        result.append({
            'account_id':    'GM',
            'txn_date':      txn_date,
            'bank':          BANK_DISPLAY['GM'],
            'description':   desc,
            'counterparty':  ctpy,
            'account_no':    acct,
            'exchange_rate': 1.0,
            'income':        income  if income  > 0 else None,
            'expense':       expense if expense > 0 else None,
        })

    return result


def parse_mbank(filepath: str, cutoff: datetime) -> list[dict]:
    """
    M Bank XLS файл унших.

    АНХААР: M Bank cutoff нь TT-тэй ижил (CUT_TDB) — учир нь
    M Bank данс нь Түмэн Тээх ХХК-ийн данс.
    Гэхдээ хэрэв тусдаа cutoff хадгалбал илүү нарийвчлалтай.
    """
    col = MBANK_COL
    result = []

    wb = xlrd.open_workbook(filepath)
    ws = wb.sheet_by_index(0)

    for i in range(col['data_start_row'], ws.nrows):
        row_no = ws.cell_value(i, col['row_no'])
        # Data мөрүүд л numeric дугаартай байна
        if not isinstance(row_no, float):
            continue

        date_val = ws.cell_value(i, col['date'])
        if not date_val:
            continue

        try:
            txn_date = datetime.fromisoformat(str(date_val).strip())
        except Exception:
            continue

        if txn_date <= cutoff:
            continue

        income  = float(ws.cell_value(i, col['income'])  or 0)
        expense = float(ws.cell_value(i, col['expense']) or 0)
        if income == 0 and expense == 0:
            continue

        raw_desc = str(ws.cell_value(i, col['description']) or '')
        if _should_skip(raw_desc):
            continue

        ctpy = str(ws.cell_value(i, col['counterparty']) or '').strip()
        acct = str(ws.cell_value(i, col['account_no'])   or '').strip()
        desc = _clean_description(raw_desc)

        result.append({
            'account_id':    'MB',
            'txn_date':      txn_date,
            'bank':          BANK_DISPLAY['MB'],
            'description':   desc,
            'counterparty':  ctpy,
            'account_no':    acct,
            'exchange_rate': 1.0,
            'income':        income  if income  > 0 else None,
            'expense':       expense if expense > 0 else None,
        })

    wb.release_resources()
    return result


def parse_file(filepath: str, account_id: str, cutoff: datetime) -> list[dict]:
    """
    Файлын төрлийг account_id-оор тодорхойлж парсер дуудна.
    Бүх parser нь ижил бүтэцтэй dict жагсаалт буцаана.
    """
    if account_id in ('TT', 'TR'):
        return parse_tdb(filepath, account_id, cutoff)
    elif account_id == 'GM':
        return parse_golomt(filepath, cutoff)
    elif account_id == 'MB':
        return parse_mbank(filepath, cutoff)
    else:
        raise ValueError(f'Танихгүй account_id: {account_id}')
