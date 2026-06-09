# bank_importer — Банкны хуулга Supabase Import Модул

## Зориулалт

Монголын банкуудын хуулга файлуудыг (XLS/XLSX) автоматаар уншиж,
гүйлгээг ангилж, Supabase PostgreSQL database-д хадгалдаг Python модул.

Энэ модулыг санхүүгийн системийн **нэг хэсэг болгон** нэгтгэх зориулалттай.

---

## Дэмжих банкууд

| account_id | Банк | Файлын нэр дэх тоо | Формат |
|-----------|------|---------------------|--------|
| `TT` | ХХБ/ТДБ (Түмэн Тээх) | `411096635` | `.XLS` |
| `TR` | ХХБ/ТДБ (Түмэн Ресурс) | `435013050` | `.XLS` |
| `GM` | Голомт банк | `C000074932` | `.xlsx` |
| `MB` | М Банк | `9006906192` | `.XLS` |

Файлын нэрнд дээрх тоо агуулагдахад автоматаар танина.
Жнь: `ST_411096635_9697.XLS` → `TT` данс гэж ойлгоно.

---

## Компани бүтэц

```
Түмэн Тээх ХХК (TT компани)
  ├── TDB данс 411096635  (account_id = TT)
  ├── Голомт данс          (account_id = GM)
  └── М Банк данс          (account_id = MB)

Түмэн Ресурс ХХК (TR компани)
  └── TDB данс 435013050  (account_id = TR)
```

TT + GM + MB нь нэг компанийн данс тул нэгтгэж нэг sheet/view-д харуулна.
TR нь тусдаа компани тул тусдаа харуулна.

---

## Суурилуулалт

```bash
pip install supabase xlrd openpyxl pandas
```

---

## Supabase тохиргоо

### 1. Schema үүсгэх

`schema.sql` файлыг Supabase Dashboard → SQL Editor-д ажиллуулна.
Дараах хүснэгтүүд үүснэ:
- `transactions` — бүх гүйлгээ
- `cutoffs` — дансаар хамгийн сүүлийн import огноо
- `account_balances` — жил бүрийн эхлэлийн үлдэгдэл

Дараах view-үүд үүснэ:
- `monthly_cashflow` — жил/сар/данс нэгтгэл
- `monthly_by_category` — ангиллаар нэгтгэл
- `account_running_balance` — одоогийн үлдэгдэл
- `counterparty_summary` — харилцагчаар нэгтгэл

### 2. Environment хувьсагч

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...   # service_role key (anon биш!)
```

**АНХААР:** `service_role` key ашиглах — `anon` key-ээр RLS бодлого давахгүй.

---

## Хэрэглээ

### Python код дотроос

```python
from bank_importer import BankImporter

importer = BankImporter(
    supabase_url=os.environ['SUPABASE_URL'],
    supabase_key=os.environ['SUPABASE_SERVICE_KEY'],
    master_data_path='Master Data TT.xlsx',
)

# Нэг файл
result = importer.import_file('ST_411096635_9697.XLS')
print(result)
# → {'account_id': 'TT', 'added': 40, 'skipped': 0, 'cutoff': datetime(...)}

# Олон файл нэгэн зэрэг
results = importer.import_files([
    'ST_411096635_9697.XLS',
    'C000074932_61450860828855026.xlsx',
])
```

### FastAPI endpoint болгох

```python
from fastapi import FastAPI, UploadFile, HTTPException
from bank_importer import BankImporter
import tempfile, os

app = FastAPI()
importer = BankImporter(
    supabase_url=os.environ['SUPABASE_URL'],
    supabase_key=os.environ['SUPABASE_SERVICE_KEY'],
    master_data_path='Master Data TT.xlsx',
)

@app.post('/api/bank/import')
async def upload_bank_file(file: UploadFile):
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        result = importer.import_file(tmp_path)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        os.unlink(tmp_path)

@app.get('/api/cashflow/{year}')
async def get_cashflow(year: int):
    rows = importer.supabase.table('monthly_cashflow').select('*').eq('year', year).execute()
    return rows.data
```

---

## Файлын бүтэц

```
bank_importer/
├── __init__.py        exports
├── config.py          тогтмолууд, баганын индекс, ангиллын кодын тайлбар
├── parsers.py         банк тус бүрийн XLS/XLSX унших логик
├── coder.py           авто ангиллын дүрмүүд (TT + TR)
├── matcher.py         Master Data харилцагч нэр тулгалт
├── importer.py        Supabase upsert + cutoff логик
└── schema.sql         PostgreSQL хүснэгт + view үүсгэх SQL
```

---

## Гүйлгээний ангиллын дүрмүүд

### Ерөнхий зарчим

Гүйлгээний **тайлбар** болон **харилцагчийн нэр**-ийг доош lowercase хийж,
тодорхой түлхүүр үгсийн эрэмбэчилсэн шалгалтыг хийнэ.
Эхний таарсан дүрэм хэрэглэгдэнэ.

### Орлогын ангилал (direction = 'M')

| Код | Нэр | Шалгах нөхцөл |
|-----|-----|---------------|
| `1.1.1` | Үндсэн тээврийн орлого | default (бусад тохирохгүй бол) |
| `1.1.2` | Авлага / тооцоо | description-д 'тооцоо' эсвэл 'авлага' |
| `1.1.3` | Хүүгийн орлого | 'хүү', 'interest' |
| `1.1.4` | Буцаалт | 'буцаалт', 'буцаан' |
| `5.1.1` | Охин компани — тооцоо | counterparty-д охин компани + 'тооцоо' |
| `5.1.2` | Охин компани — зээл | counterparty-д охин компани |
| `5.1.3` | Ажилтан зээл буцаалт | counterparty-д 'өнөрсайхан' эсвэл зээл+ажилтан |

TT охин компани: `['түмэн ресурс', 'түмэн тээх сити']`
TR охин компани: `['түмэн тээх']`

### Зарлагын ангилал (direction = 'N')

| Код | Нэр | Шалгах нөхцөл |
|-----|-----|---------------|
| `1.2.1` | Тээврийн зардал (одоогийн сар) | k2/k3/k7/k9, уб-, кран, машин — default зарлага |
| `1.2.2` | Тээврийн зардал (өмнөх сар) | 'өмнөх сар' эсвэл desc-д сарын тоо < одоогийн сар |
| `2.1.1` | Цалин | 'цалин' |
| `2.1.3` | Томилолт | 'томилолт' |
| `2.1.5` | Сургалт | 'сургалт' |
| `2.1.10` | Түрээс (Гацуурт) | counterparty-д 'гацуурт' эсвэл 'түрээс' |
| `2.1.14` | Банкны шимтгэл | 'шимтгэл', 'charge', 'хөтөлсний' |
| `2.2.1` | ХХОАТ | МТА татвар + desc '126' эхэлтэй |
| `2.2.2` | Мост Мони (цалин систем) | 'мост мони' |
| `2.2.3` | НӨАТ / ААН татвар | 'нөат' эсвэл МТА татвар + '1251' |
| `2.2.4` | НДШ / ЭМНДШ | 'эмндш', 'ндш' |
| `3.2.1` | Компьютер / техник | dell, notebook, laptop, ssd гэх мэт |
| `3.2.2` | Тавилга / эд хогшил | сандал, шкаф, тавилга гэх мэт |
| `5.2.1` | Охин компани — тооцоо | counterparty-д охин компани + 'тооцоо' |
| `5.2.2` | Охин компани — зээл | counterparty-д охин компани |
| `5.2.3` | Ажилтан зээл | counterparty-д 'өнөрсайхан' эсвэл зээл+ажилтан |

---

## Харилцагчийн Master Data

`Master Data TT.xlsx` файлын `Mapping` sheet:

| Багана | Агуулга |
|--------|---------|
| 0 | Код (жнь: `C10164-01`) |
| 2 | Мастер нэр (стандарт) |
| 2–9 | Нэрийн хувилбарууд |
| 10 | Регистрийн дугаар (7 оронтой) |

Тулгалтын дараалал:
1. Яг нэрийн тохирол (цагаан зай, цэг хасаж uppercase болгоно)
2. Хэсэгчилсэн нэрийн тохирол (6+ тэмдэгт)
3. Тайлбар дахь 7 оронтой регистрийн дугаар

---

## Cutoff логик

Давхардлаас сэргийлэх зорилгоор хамгийн сүүлд import хийсэн
гүйлгээний огноог `cutoffs` хүснэгтэд хадгална.

```
cutoffs хүснэгт:
  TT → 2026-06-09T17:00:00  (TDB TT + Golomt + M Bank хамт)
  TR → 2026-06-08T16:56:42
  MB → (MB-ийн хувьд TT cutoff ашиглана — нэг компани)
```

**АНХААР:** Голомт (GM) болон M Bank (MB) нь Түмэн Тээх ХХК-ийн данс тул
TT-тэй ижил cutoff ашигладаг. Хэрэв тусдаа cutoff хэрэгтэй болвол
`cutoffs` хүснэгтэд `GM`, `MB` мөр нэмж `importer.py`-д тохируулна.

---

## Үлдэгдэл тулгалт

`account_running_balance` view ашиглан Excel-тэй тулгана:

```sql
SELECT * FROM account_running_balance WHERE year = 2026;
```

Хариу:
```
account_id | opening_balance | total_income | total_expense | current_balance
TT         | 140117453.62    | 3648143810   | 3709559618    | 78701645.99
TR         | 45819264.22     | ...          | ...           | 10907123.60
GM         | 32496186.27     | 372665026    | 356882386     | 48278826.44
```

Энэ утга банкны хуулгын эцсийн үлдэгдэлтэй ₮0.00 зөрүүтэй байна.

---

## Мэдэгдэж байгаа хязгаарлалт

1. **M Bank cutoff**: Одоогоор MB нь TT-тэй ижил cutoff ашигладаг.
   Хэрэв M Bank нь TT-ээс хожуу хуулга авдаг бол зарим гүйлгээ алдагдаж болно.
   Засах: `cutoffs` хүснэгтэд `MB` мөр нэмж `get_cutoff('MB')` тусдаа болгох.

2. **Ангилал нарийвчлал**: Дүрмүүд keyword-based тул 100% зөв биш.
   Тайлбар стандарт бус байвал default (`1.2.1` тээвэр) ангилалд орно.
   Хэрэглэгч UI-д гараар засах боломж нэмэхийг зөвлөж байна.

3. **Master Data**: `Master Data TT.xlsx` файл нь гадаад файл.
   Цаашид Supabase `master_data` хүснэгтэд шилжүүлж web UI-аас засах боломж нэмэх.

4. **Валют**: Одоогоор зөвхөн MNT (ханш = 1.0). USD гүйлгээ байвал
   `exchange_rate` баганыг ашиглаж тохируулна.
