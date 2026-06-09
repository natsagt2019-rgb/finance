"""
importer.py — Гол import логик

Хэрэглээ (Python код дотор):
    from importer import BankImporter

    importer = BankImporter(
        supabase_url=os.environ['SUPABASE_URL'],
        supabase_key=os.environ['SUPABASE_SERVICE_KEY'],  # service_role key хэрэгтэй
        master_data_path='Master Data TT.xlsx',
    )

    result = importer.import_file('ST_411096635_9697.XLS')
    # → {'account_id': 'TT', 'added': 40, 'skipped': 0, 'cutoff': datetime(...)}

Хэрэглээ (FastAPI endpoint-оос):
    @app.post('/api/bank/import')
    async def upload(file: UploadFile):
        with tempfile.NamedTemporaryFile(suffix=file.filename, delete=False) as tmp:
            tmp.write(await file.read())
            result = importer.import_file(tmp.name)
        return result
"""

import os
import re
import tempfile
from datetime import datetime

from supabase import create_client, Client

from config import ACCOUNT_PATTERNS, COMPANY_TT, COMPANY_TR
from parsers import parse_file
from coder import apply_codes
from matcher import MasterDataMatcher


def detect_account_id(filename: str) -> str | None:
    """
    Файлын нэрнд байгаа дансны дугаараар account_id тодорхойлно.
    Жнь: 'ST_411096635_9697.XLS' → 'TT'
    """
    name = os.path.basename(filename).upper()
    for pattern, account_id in ACCOUNT_PATTERNS.items():
        if pattern.upper() in name:
            return account_id
    return None


class BankImporter:
    """
    Банкны хуулга Supabase-д import хийх гол класс.
    """

    def __init__(
        self,
        supabase_url: str,
        supabase_key: str,
        master_data_path: str,
    ):
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.matcher = MasterDataMatcher(master_data_path)

    # ── Cutoff ───────────────────────────────────────────────────────────

    def get_cutoff(self, account_id: str) -> datetime:
        """
        Supabase-аас хамгийн сүүлийн import огноог уншина.
        Голомт (GM) нь TT-тэй ижил cutoff ашигладаг.
        M Bank (MB) нь тусдаа cutoff-тай.
        """
        lookup_id = 'TT' if account_id == 'GM' else account_id
        row = (
            self.supabase
            .table('cutoffs')
            .select('last_txn_at')
            .eq('account_id', lookup_id)
            .single()
            .execute()
        )
        return datetime.fromisoformat(row.data['last_txn_at'])

    def set_cutoff(self, account_id: str, last_txn_at: datetime):
        """Cutoff шинэчлэх."""
        # GM-ийн cutoff TT-д хадгална
        save_id = 'TT' if account_id == 'GM' else account_id
        self.supabase.table('cutoffs').upsert({
            'account_id':   save_id,
            'last_txn_at':  last_txn_at.isoformat(),
            'updated_at':   datetime.utcnow().isoformat(),
        }).execute()

    # ── Import ───────────────────────────────────────────────────────────

    def import_file(self, filepath: str) -> dict:
        """
        Нэг банкны файлыг Supabase-д import хийнэ.

        Returns:
            {
                'account_id': 'TT',
                'added':      40,
                'skipped':    5,
                'cutoff':     datetime(2026, 6, 9, ...),
            }
        """
        account_id = detect_account_id(filepath)
        if not account_id:
            raise ValueError(
                f'Файлын нэрнд данс тодорхойлж чадсангүй: {os.path.basename(filepath)}\n'
                f'Файлын нэрэнд дараах утгуудын нэг байх ёстой: '
                f'{list(ACCOUNT_PATTERNS.keys())}'
            )

        # 1. Cutoff уншина
        cutoff = self.get_cutoff(account_id)

        # 2. Файл parse хийнэ
        transactions = parse_file(filepath, account_id, cutoff)

        if not transactions:
            return {
                'account_id': account_id,
                'added':      0,
                'skipped':    0,
                'cutoff':     cutoff,
                'message':    'Шинэ гүйлгээ байхгүй',
            }

        # 3. Ангилал нэмнэ (auto-coding)
        transactions = [
            apply_codes(txn, account_id)
            for txn in transactions
        ]

        # 4. Master Data тулгана
        transactions = [
            self.matcher.enrich(txn)
            for txn in transactions
        ]

        # 5. Company нэр нэмнэ
        company = COMPANY_TT if account_id in ('TT', 'GM', 'MB') else COMPANY_TR
        for txn in transactions:
            txn['company'] = company

        # 6. datetime → ISO string (Supabase JSON serialization)
        rows = []
        for txn in transactions:
            row = dict(txn)
            row['txn_date'] = txn['txn_date'].isoformat()
            rows.append(row)

        # 7. Supabase upsert (давхардал conflict дээр skip)
        response = (
            self.supabase
            .table('transactions')
            .upsert(rows, on_conflict='account_id,txn_date,description,income,expense')
            .execute()
        )

        added = len(response.data) if response.data else 0
        skipped = len(rows) - added

        # 8. Cutoff шинэчлэх
        new_cutoff = max(txn['txn_date'] for txn in transactions)
        if new_cutoff > cutoff:
            self.set_cutoff(account_id, new_cutoff)

        return {
            'account_id': account_id,
            'added':      added,
            'skipped':    skipped,
            'cutoff':     new_cutoff,
        }

    def import_files(self, filepaths: list[str]) -> list[dict]:
        """Олон файлыг нэг дор import хийнэ."""
        return [self.import_file(fp) for fp in filepaths]
