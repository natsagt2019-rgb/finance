"""
matcher.py — Харилцагчийн Master Data тулгалт

Master Data файл: 'Master Data TT.xlsx' → 'Mapping' sheet

Баганын бүтэц (0-indexed):
  col 0:  Код (жнь: C10164-01)
  col 2:  Мастер нэр (стандарт нэр)
  col 2-9: Нэрийн хувилбарууд (ижил кодтой өөр өөр нэр)
  col 10: Регистрийн дугаар (7 оронтой тоо)

Тулгалтын дарааллал:
  1. Нэрийн яг тохирол (цагаан зай, цэг хасаад)
  2. Нэрийн хэсэгчилсэн тохирол (6+ тэмдэгт)
  3. Тайлбар дахь 7 оронтой регистрийн дугаар
"""

import re
import openpyxl


class MasterDataMatcher:
    """
    Master Data-г нэг удаа уншиж санах ойд хадгалана.
    Дараа нь match() функцийг олон удаа дуудаж болно.
    """

    def __init__(self, master_data_path: str):
        self.name_to_code: dict[str, str] = {}
        self.rd_to_code:   dict[str, str] = {}  # регистр → код
        self.code_to_name: dict[str, str] = {}  # код → мастер нэр

        self._load(master_data_path)

    def _load(self, path: str):
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        ws = wb['Mapping']

        for row in ws.iter_rows(min_row=2, values_only=True):
            code = str(row[0]).strip() if row[0] else ''
            if not code or code == 'None':
                continue

            # Мастер нэр (col 2)
            master = str(row[2]).strip() if len(row) > 2 and row[2] else ''
            if master and master != 'None':
                self.code_to_name[code] = master

            # Регистрийн дугаар (col 10)
            rd_val = str(row[10]).strip() if len(row) > 10 and row[10] else ''
            if re.match(r'^\d{7}$', rd_val):
                self.rd_to_code[rd_val] = code

            # Нэрийн бүх хувилбар (col 2-9)
            for ci in range(2, 10):
                if ci < len(row) and row[ci]:
                    nm = re.sub(r'\s+', '', str(row[ci])).upper().rstrip('.')
                    if nm and nm != 'NONE':
                        self.name_to_code[nm] = code

        wb.close()

    def match(self, counterparty: str, description: str = '') -> tuple[str | None, str | None]:
        """
        Харилцагчийн мастер код болон стандарт нэрийг олно.

        Returns:
            (code, master_name) эсвэл (None, None)
        """
        # 1. Яг тохирол
        key = re.sub(r'\s+', '', str(counterparty)).upper().rstrip('.')
        if key in self.name_to_code:
            code = self.name_to_code[key]
            return code, self.code_to_name.get(code)

        # 2. Хэсэгчилсэн тохирол (6+ тэмдэгт)
        if len(key) >= 6:
            for nk, cd in self.name_to_code.items():
                if len(nk) >= 6 and (nk in key or key in nk):
                    return cd, self.code_to_name.get(cd)

        # 3. Регистрийн дугаар тайлбараас
        for rd in re.findall(r'\b(\d{7})\b', str(description)):
            if rd in self.rd_to_code:
                code = self.rd_to_code[rd]
                return code, self.code_to_name.get(code)

        return None, None

    def enrich(self, transaction: dict) -> dict:
        """
        Гүйлгээний dict-д master_code, master_name нэмж буцаана.
        """
        code, name = self.match(
            transaction.get('counterparty', ''),
            transaction.get('description', ''),
        )
        return {
            **transaction,
            'master_code': code,
            'master_name': name,
        }
