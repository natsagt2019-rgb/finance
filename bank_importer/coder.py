"""
coder.py — Гүйлгээний авто ангилалын дүрмүүд

Хоёр компанид тусдаа дүрэм:
  - code_tt(desc, income, expense, month, counterparty) → (direction, code)
  - code_tr(desc, income, expense, month, counterparty) → (direction, code)

direction: 'M' = орлого ангилал, 'N' = зарлага ангилал, '' = тодорхойгүй
code:      '1.1.1', '1.2.1' гэх мэт (config.py-д тайлбар байна)

Дүрмийн эрэмбэ (дээрээс доош, эхний таарсан дүрэм хэрэглэгдэнэ):
  1. Тусгай харилцагч (Өнөрсайхан, охин компани гэх мэт)
  2. Тайлбарын түлхүүр үгс (шимтгэл, цалин, сургалт гэх мэт)
  3. Тээврийн ангилал (K2/K3/K9 карго, УБ-ДА чиглэл)
  4. Өмнөх сарын тааруулалт (огнооноос автомат)
  5. Үндсэн тээврийн зардал (default)
"""

import re


# ── TT компанийн ангилалын дүрэм ─────────────────────────────────────────

def code_tt(desc: str, income: float, expense: float,
            month: int | None = None, counterparty: str = '') -> tuple[str, str]:
    """
    Түмэн Тээх ХХК (TT + Golomt + MBank) гүйлгээний ангилал.

    Returns:
        ('M', '1.1.1') — орлого ангилал
        ('N', '1.2.1') — зарлага ангилал
        ('', '')       — ангилал тодорхойлж чадаагүй
    """
    d   = str(desc).lower()
    ctp = str(counterparty).lower()

    # Охин компани болон холбоотой харилцагчид
    _related = ['түмэн ресурс', 'түмэн тээх сити']

    if income > 0:
        # Тусгай харилцагчид
        if any(x in ctp for x in [
            'мастер фүүдс', 'премиум бьюлдинг', 'премиум иннова',
            'премиум конкрит', 'тера-экспресс', 'тера экспресс',
        ]):
            return 'M', '1.1.2'

        if 'өнөрсайхан' in ctp:
            return 'M', '5.1.3'

        if any(x in ctp for x in _related):
            return ('M', '5.1.1') if 'тооцоо' in d else ('M', '5.1.2')

        # Тайлбарын түлхүүр үгс
        if any(x in d for x in ['тооцоо', 'авлага']):
            return 'M', '1.1.2'
        if any(x in d for x in ['хүүгийн орлого', 'хүү', 'interest']):
            return 'M', '1.1.3'
        if any(x in d for x in ['буцаалт', 'буцаан']):
            return 'M', '1.1.4'
        if 'зээл' in d:
            return ('M', '5.1.3') if any(x in d + ctp for x in ['ажилтан', 'ажилч']) else ('M', '5.1.2')

        # Default орлого
        return 'M', '1.1.1'

    if expense > 0:
        # Тусгай харилцагчид
        if 'өнөрсайхан' in ctp:
            return 'N', '5.2.3'

        if any(x in ctp for x in _related):
            return ('N', '5.2.1') if 'тооцоо' in d else ('N', '5.2.2')

        # Банкны шимтгэл
        if any(x in d + ctp for x in ['шимтгэл', 'charge', 'хөтөлсний']):
            return 'N', '2.1.14'

        # Мост Мони (цалин шилжүүлгийн систем)
        if 'мост мони' in ctp or 'мост мони' in d:
            return 'N', '2.2.2'

        # МТА татварын шилжүүлэг
        if 'мта' in ctp and 'татвар' in ctp:
            if d.startswith('1251') or ';1251' in d:
                return 'N', '2.2.3'   # НӨАТ
            if d.startswith('126') or ';126' in d:
                return 'N', '2.2.1'   # ХХОАТ
            return 'N', '2.2.3'

        # Цалин / НДШ / татвар
        if 'цалин' in d:                              return 'N', '2.1.1'
        if 'нөат' in d:                               return 'N', '2.2.3'
        if any(x in d for x in ['эмндш', 'ндш']):    return 'N', '2.2.4'
        if 'томилолт' in d:                           return 'N', '2.1.3'
        if 'сургалт' in d:                            return 'N', '2.1.5'

        # Гацуурт түрээс
        if 'гацуурт' in ctp:                          return 'N', '2.1.10'
        if 'түрээс' in d:                             return 'N', '2.1.10'

        # Техник хэрэгсэл / тавилга
        if any(x in d for x in [
            'dell', 'notebook', 'laptop', 'ноутбук', 'компьютер',
            '16gb', '512 gb', 'ssd',
        ]):
            return 'N', '3.2.1'
        if any(x in d for x in ['сандал', 'шкаф', 'шүүгээ', 'тавилга', 'эд хогшил']):
            return 'N', '3.2.2'

        # Тээврийн зардал (K2/K3/K7/K9 карго, УБ-ДА чиглэл)
        is_transport = (
            ('кран' in d and 'гацуурт' not in ctp)
            or any(x in d for x in ['k2', 'k3', 'k7', 'k9', 'уб-', 'ub-', 'машин'])
        )
        if is_transport or 'өмнөх сар' in d:
            if 'өмнөх сар' in d:
                return 'N', '1.2.2'
            # Тайлбарт сарын тоо байвал шалгах
            if month:
                months_in_desc = [
                    int(m)
                    for m in re.findall(r'\b(\d{1,2})/\d{1,2}', d)
                    if 1 <= int(m) <= 12
                ]
                if months_in_desc and all(m < month for m in months_in_desc):
                    return 'N', '1.2.2'
            return 'N', '1.2.1'

        # Зээл
        if 'зээл' in d:
            return ('N', '5.2.3') if any(x in d + ctp for x in ['ажилтан', 'ажилч']) else ('N', '5.2.2')

        # Default зарлага → тээвэр
        return 'N', '1.2.1'

    return '', ''


# ── TR компанийн ангилалын дүрэм ─────────────────────────────────────────

def code_tr(desc: str, income: float, expense: float,
            month: int | None = None, counterparty: str = '') -> tuple[str, str]:
    """
    Түмэн Ресурс ХХК (TR) гүйлгээний ангилал.

    TT-тэй ижил логик, зөвхөн харилцагч нэр өөр:
    - 'түмэн тээх' → охин компани холбоосын ангилал
    """
    d   = str(desc).lower()
    ctp = str(counterparty).lower()

    if income > 0:
        if 'өнөрсайхан' in ctp:
            return 'M', '5.1.3'
        if 'түмэн тээх' in ctp:
            return ('M', '5.1.1') if 'тооцоо' in d else ('M', '5.1.2')

        if any(x in d for x in ['тооцоо', 'авлага']):
            return 'M', '1.1.2'
        if any(x in d for x in ['хүүгийн орлого', 'хүү', 'interest']):
            return 'M', '1.1.3'
        if any(x in d for x in ['буцаалт', 'буцаан']):
            return 'M', '1.1.4'
        if 'зээл' in d:
            return ('M', '5.1.3') if any(x in d + ctp for x in ['ажилтан', 'ажилч']) else ('M', '5.1.2')

        return 'M', '1.1.1'

    if expense > 0:
        if 'өнөрсайхан' in ctp:
            return 'N', '5.2.3'
        if 'түмэн тээх' in ctp:
            return ('N', '5.2.1') if 'тооцоо' in d else ('N', '5.2.2')

        if any(x in d + ctp for x in ['шимтгэл', 'charge']):
            return 'N', '2.1.14'
        if 'мост мони' in ctp or 'мост мони' in d:
            return 'N', '2.2.2'

        if 'цалин' in d:                              return 'N', '2.1.1'
        if 'нөат' in d:                               return 'N', '2.2.3'
        if any(x in d for x in ['эмндш', 'ндш']):    return 'N', '2.2.4'
        if 'томилолт' in d:                           return 'N', '2.1.3'
        if 'сургалт' in d:                            return 'N', '2.1.5'
        if 'гацуурт' in ctp:                          return 'N', '2.1.10'
        if 'түрээс' in d:                             return 'N', '2.1.10'

        if any(x in d for x in ['dell', 'notebook', 'laptop', 'ноутбук', 'компьютер']):
            return 'N', '3.2.1'

        is_transport = (
            ('кран' in d and 'гацуурт' not in ctp)
            or any(x in d for x in ['k2', 'k3', 'k7', 'k9', 'уб-', 'ub-', 'машин'])
        )
        if is_transport or 'өмнөх сар' in d:
            if 'өмнөх сар' in d:
                return 'N', '1.2.2'
            if month:
                months_in_desc = [
                    int(m)
                    for m in re.findall(r'\b(\d{1,2})/\d{1,2}', d)
                    if 1 <= int(m) <= 12
                ]
                if months_in_desc and all(m < month for m in months_in_desc):
                    return 'N', '1.2.2'
            return 'N', '1.2.1'

        if 'зээл' in d:
            return ('N', '5.2.3') if any(x in d + ctp for x in ['ажилтан', 'ажилч']) else ('N', '5.2.2')

        return 'N', '1.2.1'

    return '', ''


def apply_codes(transaction: dict, company: str) -> dict:
    """
    Гүйлгээний dict-д ангиллын кодыг нэмж буцаана.

    company: 'TT' | 'TR'
    """
    desc  = transaction.get('description', '')
    inc   = transaction.get('income')   or 0
    exp   = transaction.get('expense')  or 0
    month = transaction.get('txn_date').month if transaction.get('txn_date') else None
    ctpy  = transaction.get('counterparty', '')

    if company in ('TT', 'GM', 'MB'):
        direction, code = code_tt(desc, inc, exp, month, ctpy)
    else:  # TR
        direction, code = code_tr(desc, inc, exp, month, ctpy)

    return {
        **transaction,
        'income_code':  code if direction == 'M' else None,
        'expense_code': code if direction == 'N' else None,
    }
