# -*- coding: utf-8 -*-
"""
Түмэн Тээх 2025 жилийн тайлан (Тайлан TT 2025-12-31.xlsx → Gbalance) →
  1) accounts-seed.sql        — компанийн БОДИТ дансны чарт (159 данс) + fs_line
  2) trial-balance-2025.sql   — 2025 оны гүйлгээ баланс (data давхарга)

fs_line нь нягтлан бодогчийн Баланс/ОДТ томьёоноос гаргасан ЯГ зураглал.
Дансны үлдэгдэл debit-positive: BS данс = cdt-ckt, P&L данс = эргэлт tdt-tkt.
"""
import json

GB = "C:/finance 2.0/scripts/_gbalance.json"
ACC_OUT = "C:/finance 2.0/scripts/accounts-seed.sql"
TB_OUT = "C:/finance 2.0/scripts/trial-balance-2025.sql"
YEAR = 2025

rows = json.load(open(GB, encoding="utf-8"))
accts = [r for r in rows if isinstance(r["code"], int)]  # зөвхөн кодтой данс


# ── Төрөл (type) кодын prefix-ээр ────────────────────────────────────────
def acc_type(code):
    c = str(code)
    if c[0] in ("1", "2"):  # 1xxxxx эргэлтийн, 2xxxxx үндсэн хөрөнгө
        return "asset"
    if c[0] == "3":
        return "liability"
    if c[0] == "4":
        return "equity"
    if c[:3] in ("510", "520", "840", "850"):
        return "income"
    return "expense"  # 610,70x,71x,87x,88x,91x,92x


# ── Баланс fs_line (нягтлан бодогчийн томьёоны дагуу, код тус бүрээр) ──────
def bs_fs(code):
    c = str(code)
    if c in ("100101", "110101", "110102", "110103", "110104"):
        return "СБТ 1.1.1 Мөнгө, түүнтэй адилтгах хөрөнгө"
    if c == "120101":
        return "СБТ 1.1.2 Дансны авлага"
    if c in ("120201", "120301", "120401", "120501", "120502"):
        return "СБТ 1.1.3 Татвар, НДШ-ийн авлага"
    if c in ("120105", "120601"):
        return "СБТ 1.1.4 Бусад авлага"
    if c[:3] in ("140", "150"):
        return "СБТ 1.1.6 Бараа материал"
    if c[:3] == "180":
        return "СБТ 1.1.7 Урьдчилж төлсөн зардал/тооцоо"
    if c == "201001":
        return "СБТ 1.2.2 Биет бус хөрөнгө"
    if c[:3] in ("200", "201"):
        return "СБТ 1.2.1 Үндсэн хөрөнгө"
    if c == "310101":
        return "СБТ 2.1.1.1 Дансны өглөг"
    if c == "310201":
        return "СБТ 2.1.1.2 Цалингийн өглөг"
    if c in ("310301", "310401", "310402", "310601", "310701", "310901", "311301"):
        return "СБТ 2.1.1.3 Татварын өр"
    if c == "310501":
        return "СБТ 2.1.1.4 НДШ-ийн өглөг"
    if c == "311001":
        return "СБТ 2.1.1.5 Богино хугацаат зээл"
    if c == "310801":
        return "СБТ 2.1.1.6 Хүүний өглөг"
    if c == "311201":
        return "СБТ 2.1.1.7 Ногдол ашгийн өглөг"
    if c == "320101":
        return "СБТ 2.1.1.8 Урьдчилж орсон орлого"
    if c == "311101":
        return "СБТ 2.1.1.10 Бусад богино хугацаат өр төлбөр"
    if c == "320102":
        return "СБТ 2.1.2.1 Урт хугацаат зээл"
    if c == "340104":
        return "СБТ 2.1.2.4 Бусад урт хугацаат өр төлбөр"
    if c[:3] == "410":
        return "СБТ 2.3.1 Өмч"
    if c[:3] == "420":
        return "СБТ 2.3.6 Эздийн өмчийн бусад хэсэг"
    if c[:3] == "430":
        return "СБТ 2.3.7 Хуримтлагдсан ашиг"
    return None


# ── Орлогын тайлан fs_line (prefix-ээр ойролцоо) ─────────────────────────
def is_fs(code):
    c = str(code)
    if c[:3] in ("510", "520"):
        return "ОДТ 1 Борлуулалтын орлого (цэвэр)"
    if c[:3] == "610" or c[:2] == "71":
        return "ОДТ 2 Борлуулсан бүтээгдэхүүний өртөг"
    if c[:2] == "70":
        return "ОДТ 10 Ерөнхий ба удирдлагын зардал"
    if c == "840101":
        return "ОДТ 4 Түрээсийн орлого"
    if c == "840201":
        return "ОДТ 5 Хүүний орлого"
    if c == "840301":
        return "ОДТ 6 Ногдол ашгийн орлого"
    if c == "840401":
        return "ОДТ 7 Эрхийн шимтгэлийн орлого"
    if c[:4] == "8405":
        return "ОДТ 8 Бусад орлого"
    if c in ("840601", "840701", "870201", "870202"):
        return "ОДТ 14 Үндсэн хөрөнгө данснаас хассаны олз (гарз)"
    if c in ("840801", "870301"):
        return "ОДТ 15 Биет бус хөрөнгө данснаас хассаны олз (гарз)"
    if c[:3] in ("850", "880"):
        return "ОДТ 13 Гадаад валютын ханшийн зөрүүний олз (гарз)"
    if c == "870101":
        return "ОДТ 11 Санхүүгийн зардал"
    if c[:4] == "8704":  # найдваргүй авлага, бусад зардал
        return "ОДТ 12 Бусад зардал"
    if c[:3] == "910":
        return "ОДТ 19 Орлогын татварын зардал"
    # 920xxx = орлого-зардлын нэгдсэн (хаалтын) данс — тайланд ороохгүй
    return None


def fs_of(code, t):
    return bs_fs(code) if t in ("asset", "liability", "equity") else is_fs(code)


DEBIT_NORMAL = {"asset", "expense"}


def nature_of(t):
    return "Актив" if t in DEBIT_NORMAL else "Пассив"


# ── Үлдэгдэл: BS = closing(cdt-ckt), P&L = эргэлт(tdt-tkt) ────────────────
def balances(r, t):
    if t in ("asset", "liability", "equity"):
        return (r["odt"] - r["okt"], r["cdt"] - r["ckt"])  # opening, closing
    return (0, r["tdt"] - r["tkt"])  # P&L: comparative 0, тайлант = эргэлт


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        return repr(round(v, 2))
    return "'" + str(v).replace("'", "''") + "'"


# ── accounts seed ────────────────────────────────────────────────────────
acc_cols = ["id", "code", "name", "type", "is_active", "fs_line", "currency", "nature"]
acc_vals = []
tb_cols = ["year", "period", "account_code", "account_name", "opening_balance", "closing_balance"]
tb_vals = []

for i, r in enumerate(accts):
    code = str(r["code"])
    t = acc_type(code)
    fs = fs_of(code, t)
    acc_vals.append("  (" + ", ".join(q(x) for x in [
        i + 1, code, r["name"], t, True, fs, "MNT", nature_of(t)]) + ")")
    op, cl = balances(r, t)
    tb_vals.append("  (" + ", ".join(q(x) for x in [
        YEAR, "annual", code, r["name"], op, cl]) + ")")

acc_sql = (
    "-- " + "=" * 58 + "\n"
    "-- accounts seed — Түмэн Тээх ХХК БОДИТ дансны чарт (Gbalance 2025)\n"
    f"-- Нийт: {len(accts)} данс. fs_line нь E-balance тайлангийн мөртэй холбоотой.\n"
    "-- Хүснэгт хоосон үед л оруулна. Supabase SQL Editor-д ажиллуулна.\n"
    "-- " + "=" * 58 + "\n\n"
    "DO $$\nBEGIN\nIF (SELECT COUNT(*) FROM accounts) = 0 THEN\n\n"
    f"INSERT INTO accounts ({', '.join(acc_cols)}) VALUES\n"
    + ",\n".join(acc_vals) + ";\n\n"
    "PERFORM setval(pg_get_serial_sequence('accounts','id'), (SELECT MAX(id) FROM accounts));\n\n"
    "END IF;\nEND $$;\n"
)
open(ACC_OUT, "w", encoding="utf-8").write(acc_sql)

tb_sql = (
    "-- " + "=" * 58 + "\n"
    "-- trial_balances seed — Түмэн Тээх 2025 гүйлгээ баланс\n"
    f"-- {len(accts)} данс. BS=эцсийн үлдэгдэл, P&L=жилийн эргэлт (debit-positive).\n"
    "-- accounts-seed.sql-ийн ДАРАА ажиллуулна.\n"
    "-- " + "=" * 58 + "\n\n"
    "DELETE FROM trial_balances WHERE year = " + str(YEAR) + " AND period = 'annual';\n\n"
    f"INSERT INTO trial_balances ({', '.join(tb_cols)}) VALUES\n"
    + ",\n".join(tb_vals) + ";\n"
)
open(TB_OUT, "w", encoding="utf-8").write(tb_sql)

# ── Шалгалт: баланс нэгтгэж known дүнтэй харьцуул ─────────────────────────
from collections import defaultdict
fs_close = defaultdict(float)
for r in accts:
    t = acc_type(str(r["code"]))
    fs = fs_of(str(r["code"]), t)
    if fs and fs.startswith("СБТ"):
        _, cl = balances(r, t)
        fs_close[fs] += cl


def sign(fs):
    return 1 if fs.startswith("СБТ 1") else -1


assets = sum(v for k, v in fs_close.items() if k.startswith("СБТ 1"))
liab_eq = -sum(v for k, v in fs_close.items() if k.startswith("СБТ 2"))
print("written accounts:", ACC_OUT, "|", len(accts), "данс")
print("written trial balance:", TB_OUT)
print(f"НИЙТ ХӨРӨНГӨ (1.3)        = {assets:>18,.2f}  (хүлээгдэх 1,173,924,008.86)")
print(f"ӨР+ӨМЧ (2.4)             = {liab_eq:>18,.2f}")
print(f"Зөрүү                    = {assets - liab_eq:>18,.2f}")
print(f"  1.1.1 Мөнгө            = {fs_close['СБТ 1.1.1 Мөнгө, түүнтэй адилтгах хөрөнгө']:>18,.2f}  (хүлээгдэх 173,733,062.20)")
print(f"  2.3.7 Хуримтлагдсан    = {-fs_close['СБТ 2.3.7 Хуримтлагдсан ашиг']:>18,.2f}  (хүлээгдэх 521,984,441.13)")
