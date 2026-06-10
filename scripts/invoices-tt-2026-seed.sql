-- ============================================================
-- Түмэн Тээх ХХК — 2026 оны нэхэмжлэх (эх сурвалж: Нэхэмжлэх (35).xlsx)
-- 436 нэхэмжлэл | нийт 4,146,653,812.81₮ (НӨАТ-гүй)
-- Төлөгдсөн: 283 | Нээлттэй: 153
-- Урьдчилсан нөхцөл: invoices + partners хүснэгт үүссэн, partners seed хийгдсэн байх.
-- partner_id нь register-ээр (нэрээр fallback) apply үед тулгагдана.
-- Idempotent: ижил invoice_no дахин орохгүй.
-- ============================================================

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1820', '2026-03-11'::date, '2026-03-18'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6229654' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Апу дэйри ХХК') AND is_active ORDER BY id LIMIT 1)), 'Апу дэйри ХХК', 'Баяраа', 'Улаанбаатар-Орон нутаг 5хөргүүртэй контейнер тээвэр/крантай машин', 8915000, 8915000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1820');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1960', '2026-01-02'::date, '2026-01-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '12/01-ээс 12/13-ны өдөр хүртэлхи , хот дотор болон Хан-алтай уурхайн тээврийн төлбөр.', 34196000, 34196000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1960');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1968', '2026-01-02'::date, '2026-01-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6266258' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Премиум Бьюлдинг Материалс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Премиум Бьюлдинг Материалс ХХК', 'Нямдорж', '12/01-нд Best shoes - Premium 1 үйлдвэр. ( 1.5тн задгай - 5351УАУ )', 2115000, 2115000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1968');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1961', '2026-01-02'::date, '2026-01-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5528534' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Premium concrete LLC') AND is_active ORDER BY id LIMIT 1)), 'Premium concrete LLC', 'Нямдорж', '12/05-нд ,УБ - Оюутолгой ( Шалаанз - 5841УБЧ )', 22761818, 22761818, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1961');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1962', '2026-01-02'::date, '2026-01-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Нямдорж', 'Barlo 12/01 - 12/31 хүртэлхи тээвэрийн төлбөр.', 69532400, 69532400, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1962');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1963', '2026-01-02'::date, '2026-01-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6625223' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Премиум Иннова ххк') AND is_active ORDER BY id LIMIT 1)), 'Премиум Иннова ххк', 'Нямдорж', '12 сарын дээж , хэв тээвэрлэлтийн төлбөрийн нэхэмжлэх', 4904727.28, 4904727.28, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1963');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1967', '2026-01-05'::date, '2026-02-05'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '01/05-01/06 2 өдөр  уб-хэнтий / хүн тээвэр', 600000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1967');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1970', '2026-01-05'::date, '2026-01-05'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6846548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Юрика ХХК') AND is_active ORDER BY id LIMIT 1)), 'Юрика ХХК', 'Баяраа', '01/05 ти ай гааль-зүүн салаа эцэс/ крантай машин тээвэр', 500000, 500000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1970');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1971', '2026-01-05'::date, '2026-01-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '01/05 НАЛАЙХ-100Н АЙЛ/ 9.60 машин/ 8н боодол хавтан тээвэр', 1221300, 1221300, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1971');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1972', '2026-01-06'::date, '2026-01-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/06 УБ-Бөөрөлжүүт/ портер 6393УНП/метал ххк сэлбэг тээвэр / буцахдаа хроп ачсан', 450000, 450000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1972');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1974', '2026-01-06'::date, '2026-01-09'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5644984' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Соёолон интернэшнл ХХК') AND is_active ORDER BY id LIMIT 1)), 'Соёолон интернэшнл ХХК', 'Баяраа', '01/07 эрдэнэт-дархан/ портер 5018ДАУ/ бутлуурын хуяг', 650000, 650000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1974');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1975', '2026-01-07'::date, '2026-01-10'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5644984' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Соёолон интернэшнл ХХК') AND is_active ORDER BY id LIMIT 1)), 'Соёолон интернэшнл ХХК', 'Баяраа', '01/07 натур-да хүрээ/ бонго 3- ачилтын машинаар тээвэрлэв', 160000, 160000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1975');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1978', '2026-01-08'::date, '2026-01-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/08 УБ-бөөрөлжүүт/ 7тонн крантай машин / 20тонн доторлосон чингэлэг тээвэр', 1300000, 1300000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1978');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1979', '2026-01-08'::date, '2026-01-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5644984' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Соёолон интернэшнл ХХК') AND is_active ORDER BY id LIMIT 1)), 'Соёолон интернэшнл ХХК', 'Баяраа', '01/09 УБ-Салхит мө орд/ 10тонн крантай машин тээвэр 1658УНТ/ буцахдаа багануурт ачаа буулгах', 4200000, 4200000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1979');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1980', '2026-01-09'::date, '2026-01-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '01/09 налайх-гурвалжин/ шланз', 712425, 712425, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1980');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1981', '2026-02-24'::date, '2025-02-26'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6229654' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Апу дэйри ХХК') AND is_active ORDER BY id LIMIT 1)), 'Апу дэйри ХХК', 'Одонтунгалаг', 'EB -Машин түрээс 1/21-2/20,-АПУ ДЭЙРИ ХХК', 42125824.55, 42125824.55, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1981');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1983', '2026-01-09'::date, '2026-01-13'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/09 УБ-БӨӨРӨЛЖҮҮТ/ 5тон маяти 0525УЕК/ хера, метал', 1000000, 1000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1983');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1984', '2026-01-10'::date, '2026-01-14'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '1/10  УБ-БӨӨРӨЛЖҮҮТ/ 5тон маяти 0525УЕК/  шат , 100н сав тос', 1000000, 1000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1984');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1985', '2026-01-12'::date, '2026-01-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '01/10 сонсголон-гурвалжин портер тээвэр', 90000, 90000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1985');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1986', '2026-01-12'::date, '2026-01-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/10 уб-бөөрөлжүүт/ портер / карверийн гол тээвэр', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1986');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1987', '2026-01-12'::date, '2026-01-16'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/12 уб-бөөрөлжүүт/ портер 5660УАХ/ гал тогооны төнөг төхөөрөмжүүд/ цагаан байр', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1987');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1988', '2026-01-12'::date, '2026-01-17'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/12 баянхошуу-барло/ амжиргаа 6831/ сэлбэг', 80000, 80000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1988');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1990', '2026-01-13'::date, '2026-01-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '8415595' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хөрс пакежинг хоршоо') AND is_active ORDER BY id LIMIT 1)), 'Хөрс пакежинг хоршоо', 'Одонтунгалаг', '2025оны 12сарын 23-наас 2026оны 01сарын 10-ны хоорондох тээврийн төлбөр', 1914750, 1914750, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1990');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1991', '2026-01-13'::date, '2026-01-19'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '01/13 сонсголон-нисэх  / портер хүргэлт', 90000, 90000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1991');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1992', '2026-01-13'::date, '2026-01-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/13 уб-бөөрөлжүүт/ портер 5660 / 2 ширээ 40 сандал', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1992');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1993', '2026-01-14'::date, '2026-01-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '8418438' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('DRE LLC') AND is_active ORDER BY id LIMIT 1)), 'DRE LLC', 'Баяраа', '01/14 УБ-эрдэнэт ачаа тээвэр 5977УЕА', 3040000, 3040000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1993');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1994', '2026-01-14'::date, '2026-01-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'Тера УБ - ОТ сэлбэг хангамж тээвэр - 01/14', 1312500, 1312500, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1994');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1995', '2026-01-14'::date, '2026-01-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК Нүүрс тээвэр 12/22-31-ний Нүүрс тээврийн төлбөр', 35750696, 35750696, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1995');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1996', '2026-01-15'::date, '2026-01-16'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7161785' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Аркилект трэйд ХХК') AND is_active ORDER BY id LIMIT 1)), 'Аркилект трэйд ХХК', 'Одонтунгалаг', '01сарын 04ны тээврийн төлбөр', 4282000, 4282000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1996');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1997', '2026-01-15'::date, '2026-01-19'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '1/14  УБ-Бөөрөлжүүт/ портер 5660/ хера, метал, AGG -сэлбэг бараа материал', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1997');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1998', '2026-01-15'::date, '2026-01-19'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '1/14 сонсголон-нисэх / 2 цэгийн хүргэлт', 110000, 110000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1998');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV1999', '2026-01-15'::date, '2026-01-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5644984' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Соёолон интернэшнл ХХК') AND is_active ORDER BY id LIMIT 1)), 'Соёолон интернэшнл ХХК', 'Баяраа', '01/15 шувуу фафрик-тэц4/ крантай машин тээвэр', 450000, 450000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV1999');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2000', '2026-01-15'::date, '2026-01-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/15 уб-бөөрөлжүүт/ 5тонн маяти 0525УЕК/ barlo, sinopec, lux oil', 1000000, 1000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2000');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2001', '2026-01-15'::date, '2026-01-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/15уб-бөөрөлжүүт/ 5660 портер / глобал ацтелин, 22 товчоо / 6ш баллоон / хроп', 500000, 500000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2001');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2002', '2026-01-15'::date, '2026-01-23'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/15 уб-бөөрөлжүүт / түрээсийн экскэ тээвэрлэлт / трайлер', 2600000, 2600000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2002');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2003', '2026-01-15'::date, '2026-01-24'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/15 уб-бөөрөлжүүт / түрээсийн унагалдай тээвэрлэлт / ачилтын машин', 900000, 900000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2003');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2004', '2026-01-16'::date, '2026-01-25'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '01/17-01/19 УБ-хэнтий кэмп-хэнтий аймаг-УБ / хүн тээвэр', 600000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2004');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2006', '2026-01-16'::date, '2026-01-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/16 уб-бөөрөлжүүт/ 5тонн маяти 0525УЕК/ барло, монос, 22 товчоо', 1000000, 1000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2006');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2007', '2026-01-17'::date, '2026-01-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '1/16 уб-бөөрөлжүүт/ портер / дарь эх -сандал/ хишиг дөлгөөн хэм-лист төмөр бусад бараа материал', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2007');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2008', '2026-01-17'::date, '2026-01-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/16 уб-бөөрөлжүүт/ портер 8211УНВ / ЮНИТРА, канивер гол', 700000, 700000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2008');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2010', '2026-01-19'::date, '2026-01-19'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '01/18 сонсголон-титан центр /портер /8211унв', 90000, 90000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2010');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2011', '2026-01-19'::date, '2026-01-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '01/13 - Улаанбаатар-аас - PowerROC D60 өрөм тээвэрлэн хүргэсэн төлбөр.  / Хан-алтай ресурс уурхай /', 14800000, 14800000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2011');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2012', '2026-01-19'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '01/19 УБ-хэнтий/ ХҮН ТЭЭВЭР / 19ны өглөө яваад хүргэж өгсөн.', 300000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2012');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2013', '2026-01-19'::date, '2026-01-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '01/16-нд ,UB to Оюутолгой толгой , төслийн бараа материал 5тоны машинаар тээвэрлэсэн төлбөр. 8310УАА', 4048000, 4048000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2013');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2014', '2026-01-20'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/20 уб-бөөрөлжүүт / маяти 0525 / домогт хан алтай-шүд, алстод-61гарамаас сэлбэг тос, түмэн төмөрт / Х', 1000000, 1000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2014');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2015', '2026-01-19'::date, '2026-01-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6625223' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Премиум Иннова ххк') AND is_active ORDER BY id LIMIT 1)), 'Премиум Иннова ххк', 'Нямдорж', '01/19-нд, Сайншанд газрын тосны үйлдвэр - Улаанбаатарлуу , 48ширхэг IBC танк нэмэлтны сав. 2308УАС', 2454545.45, 2454545.45, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2015');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2016', '2026-01-20'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/20 уб-бөөрөлжүүт/ карго-с бараа тээвэр/ 1645УБЧ / O', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2016');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2017', '2026-01-20'::date, '2026-01-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК Нүүрс тээврийн төлбөр 1/1-17', 183509393, 183509393, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2017');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2018', '2026-01-20'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '01/20 уб-хэнтий / 2 шланз/ ачаатай 40тонн чингэлэг тээвэр', 10600000, 10600000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2018');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2019', '2026-01-21'::date, '2026-01-26'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5644984' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Соёолон интернэшнл ХХК') AND is_active ORDER BY id LIMIT 1)), 'Соёолон интернэшнл ХХК', 'Баяраа', '01/22 УБ-салхит, мө. орд/ 5тонн маяти 0525УЕК/ буцахдаа ачаатай налайх дээр буулгана.', 3000000, 3000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2019');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2021', '2026-01-21'::date, '2026-01-26'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '01/21 сонсголон-яармаг-нарны гүүр', 240000, 240000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2021');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2022', '2026-01-21'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/21 уб-бөөрөлжүүт/ портер 2681/ юнитра / Б', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2022');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2023', '2026-01-22'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/22 уб-бөөрөлжүүт/  портер 2681/ вагнер ази / маск коврал ХАБ-н хэрэгсэл / X', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2023');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2024', '2026-01-22'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/22 уб-бөөрөлжүүт / 5тонн маяти 1701УЕЕ/ 22 ТОВЧОО, тос, шүд, бусад сэлбэг, / Б', 1000000, 1000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2024');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2025', '2026-01-22'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '01/22 налайх-эко констракшн/ шланз тээвэр', 2137275, 2137275, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2025');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2026', '2026-01-22'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '01/22 уб-хэнтий/ шланз тээвэр/ сонсголон-агуулахын бараа ачилт', 2800000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2026');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2027', '2026-01-23'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/23 уб-бөөрөлжүүт/ 5тонн маяти/ 50ш хоолой  тээвэр / О', 2000000, 2000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2027');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2028', '2026-01-23'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/23 уб-бөөрөлжүүт/ 5тонн маяти 6541УКМ/ түмэн төмөрт, гурвалжин/ Б', 4600000, 4600000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2028');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2029', '2026-01-23'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/23 уб-бөөрөлжүүт/ 5660УАХ портер / хера, барло Х', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2029');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2030', '2026-01-24'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/24 уб-бөөрөлжүүт / портер / 5660/  ХАБ-н хэрэгсэл , шүд  сандал, халаагч  Х', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2030');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2031', '2026-01-25'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/25 уб-бөөрөлжүүт / портер / хабын хэрэгсэл, Х', 800000, 800000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2031');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2032', '2026-01-26'::date, '2026-01-26'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'Тера УБ-ОТ сэлбэг тээвэр 01/26', 2730000, 2730000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2032');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2033', '2026-01-27'::date, '2026-02-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '4551958' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('БНЦМУ ХХК') AND is_active ORDER BY id LIMIT 1)), 'БНЦМУ ХХК', 'Баяраа', '01/27 сонсголон-гурвалжин / портер 5660', 90000, 90000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2033');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2034', '2026-01-27'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/27 УБ-БӨӨРӨЛЖҮҮТ/ амбаартай бонго 5480УНТ/ ус ундаа тээвэр O', 500000, 500000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2034');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2035', '2026-01-27'::date, '2026-01-28'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6229654' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Апу дэйри ХХК') AND is_active ORDER BY id LIMIT 1)), 'Апу дэйри ХХК', 'Одонтунгалаг', '12/21-ээс 01/20 хоорондох тээврийн тооцоо', 56986474.5, 56986474.5, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2035');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2036', '2026-01-27'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/27 уб-бөөрөлжүүт/ оффисс/ портер 5660/ сандал шүүгээ', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2036');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2037', '2026-01-27'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '1/27/ уб-бөөрөлжүүт/  портер / юнитра Б', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2037');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2038', '2026-01-28'::date, '2026-02-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7178801' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Говь Рэмөүт Сервисес ХХК') AND is_active ORDER BY id LIMIT 1)), 'Говь Рэмөүт Сервисес ХХК', 'Баяраа', '01/27 УБ-Завхан/ айраг кэмп/ 5тонн маяти 8171УКУ/ мах тээвэр', 11808000, 11808000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2038');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2039', '2026-01-28'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/28 уб-бөөрөлжүүт/ 5тонн маяти 0858/ түмэн төмөрт, барло-safety X', 1000000, 1000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2039');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2040', '2026-01-28'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/28 уб-бөөрөлжүүт/ портер 5660/ техник импорт, 100н айл, оффис Э', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2040');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2041', '2026-01-28'::date, '2026-02-01'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '01/28 сонсголон-налайх/траст/ задгай маяти/ махны дэгээ', 550000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2041');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2042', '2026-01-29'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/29 уб-бөөрөлжүүт/ 5тонн маяти 0525УЕК/ түмэн төмөрт, домогт, хермес X', 1000000, 1000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2042');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2043', '2026-01-29'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/29 уб-бөөрөлжүүт/ 5тонн маяти 7855УБТ/ ус ундаа тээвэр  О', 1000000, 1000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2043');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2044', '2026-01-30'::date, '2026-01-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/30 уб-бөөрөлжүүт/ 50тонн кран түрээс Э', 3250000, 3250000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2044');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2046', '2026-01-30'::date, '2026-01-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '4551958' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('БНЦМУ ХХК') AND is_active ORDER BY id LIMIT 1)), 'БНЦМУ ХХК', 'Баяраа', '01/30  сонсголон-маршл / портер хүргэлт', 110000, 110000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2046');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2047', '2026-01-30'::date, '2026-02-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6446876' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Мастер фүүдс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Мастер фүүдс ХХК', 'Баяраа', '01/05 УБ-ХАН АЛТАЙ', 18501818, 18501818, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2047');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2048', '2026-01-19'::date, '2026-01-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '01/19-нд , Оюутолгой толгойгоос ирсэн RT5526 porter-ийг ачилтын машинаар засварын газар хүргэсэн төлбөр.', 200000, 200000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2048');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2049', '2026-01-30'::date, '2026-01-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '01/26-нд ,UB to Оюутолгой толгой ,( Хавтан Брусс мод , бусад ачаа ) шалаанз машинаар тээвэрлэсэн төлбөр. 4338УАС', 3960000, 3960000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2049');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2050', '2026-01-30'::date, '2026-01-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '01/26-нд ,UB to Оюутолгой толгой ,( Арматур ) шалаанз машинаар тээвэрлэсэн төлбөр. 1626УАВ', 3960000, 3960000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2050');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2051', '2026-01-30'::date, '2026-01-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '01/26-нд ,UB to Оюутолгой толгой ,( Арматур ) шалаанз машинаар тээвэрлэсэн төлбөр. 3467УАК', 3960000, 3960000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2051');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2052', '2026-01-30'::date, '2026-01-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '01/30-нд ,UB to Цогтцэций ,( Холимог ачаа ) 1.5тн машинаар тээвэрлэсэн төлбөр. 5351УАУ', 1495000, 1495000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2052');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2053', '2026-01-30'::date, '2026-01-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '01/30 УБ-БӨӨРӨЛЖҮҮТ/ амжиргаа/ hsct8 new remedy, hishig dolgoon Э', 300000, 300000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2053');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2054', '2026-01-30'::date, '2026-02-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5387051' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Интермед эмнэлэг') AND is_active ORDER BY id LIMIT 1)), 'Интермед эмнэлэг', 'Баяраа', '01/30 3р эмнэлэг-интермед/ ачигчтай портер', 1380000, 1380000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2054');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2055', '2026-02-02'::date, '2026-02-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5528534' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Premium concrete LLC') AND is_active ORDER BY id LIMIT 1)), 'Premium concrete LLC', 'Нямдорж', '1/08-нд ,УБ - Оюутолгой , 5тн машин - ( Цементны дээж , төслийн ачаа ) 3657УКО', 22036364, 22036364, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2055');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2056', '2026-02-02'::date, '2026-02-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6266258' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Премиум Бьюлдинг Материалс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Премиум Бьюлдинг Материалс ХХК', 'Нямдорж', '01/02-нд , 10тн крантай машинаар ,  Амгалан үйдвэрээс - Өлзийт хороо генератор тээвэрлэсэн. 4822УАУ', 2280000, 2280000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2056');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2057', '2026-02-02'::date, '2026-02-04'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7161785' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Аркилект трэйд ХХК') AND is_active ORDER BY id LIMIT 1)), 'Аркилект трэйд ХХК', 'Одонтунгалаг', '01/17, УБ-Дархан тээврийн төлбөр', 2584500, 2584500, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2057');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2058', '2026-02-02'::date, '2026-02-04'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '02/03 налайх-цайз / шланз тээвэр', 661538, 661538, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2058');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2059', '2026-02-03'::date, '2026-02-10'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', NULL, 13020000, 13020000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2059');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2060', '2026-02-03'::date, '2026-02-11'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '02/03 УБ-ХЭНТИЙ/ 9.60 ачигчтай/ махны дэгээ төмөр', 2740000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2060');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2061', '2026-02-03'::date, '2026-02-11'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '02/03 ти ай гааль -анун/ маяти / шошго тээвэр', 180000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2061');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2062', '2026-02-04'::date, NULL, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК Нүүрс тээврийн төлбөр 1/18-31', 124893811, 124893811, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2062');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2063', '2026-02-04'::date, NULL, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК Вест 22 элс хайрга тээврийн төлбөр 1-р сар', 8964348, 8964348, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2063');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2064', '2026-02-04'::date, '2026-01-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Нямдорж', 'Barlo 01/01 - 01/31 хүртэлхи тээвэрийн төлбөр.', 66991199, 66991199, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2064');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2066', '2026-02-05'::date, '2026-02-01'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '02/05 уб-бөөрөлжүүт/ маяти 0525/ хера, юнитра / товуд, 3 поошиктой тос, халаагч Б', 1000000, 1000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2066');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2067', '2026-02-05'::date, '2026-02-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '02/05 УБ-БӨӨРӨЛЖҮҮТ/ портер 5660 / оффисоос хөргөгч ширээ', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2067');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2068', '2026-02-05'::date, NULL, COALESCE((SELECT id FROM partners WHERE btrim(register) = '4551958' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('БНЦМУ ХХК') AND is_active ORDER BY id LIMIT 1)), 'БНЦМУ ХХК', 'Баяраа', '02/05  сонсголон-нарантуул / портер', 150000, 150000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2068');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2069', '2026-02-05'::date, '2026-01-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6625223' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Премиум Иннова ххк') AND is_active ORDER BY id LIMIT 1)), 'Премиум Иннова ххк', 'Нямдорж', '26/01 сарын дээж , хэв тээвэрлэлтийн төлбөрийн нэхэмжлэх', 240000, 240000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2069');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2070', '2026-02-06'::date, '2026-02-03'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '02/06 уб-бөөрөлжүүт/ портер 5660/ safety  Х', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2070');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2071', '2026-02-06'::date, NULL, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5213339' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Номин трейдинг ХХК') AND is_active ORDER BY id LIMIT 1)), 'Номин трейдинг ХХК', 'Одонтунгалаг', 'Тээврийн төлбөр', 183636.36, 183636.36, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2071');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2075', '2026-02-09'::date, '2026-03-11'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '02/09 уб-бөөрөлжүүт/ портер 5660/ техник импорт, хера, метал /нийт 3н портер Х', 1400000, 1400000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2075');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2073', '2026-01-31'::date, '2026-02-10'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '01/01-ээс 01/16 өдрийг хүртэлхи ( Хот дотор ) хийгдсэн тээврийн төлбөрийн нэхэмжлэх.', 4602000, 4602000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2073');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2074', '2026-01-31'::date, '2026-02-10'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '01/20-ээс 01/31 өдрийг хүртэлхи ( Хот дотор ) хийгдсэн тээврийн төлбөрийн нэхэмжлэх.', 2535000, 2535000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2074');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2076', '2026-02-10'::date, '2026-02-10'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2878593' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Юнисервис Солюшн ХХК') AND is_active ORDER BY id LIMIT 1)), 'Юнисервис Солюшн ХХК', 'Баяраа', '02/10 УБ-УХАА ХУДАГ/ цэвэрлэгээний материал/ хөргүүргүй 9.60 /4489УКМ', 2497000, 2497000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2076');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2077', '2026-02-10'::date, '2026-02-10'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '02/10 хүслийн ундарга-анун/ амжиргаа / уут тээвэр', 70000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2077');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2078', '2026-02-11'::date, '2026-02-11'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '02/11 налайх-цайз-100н айл-гурвалжин/ шланз', 861538, 861538, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2078');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2079', '2026-02-12'::date, '2026-02-23'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5644984' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Соёолон интернэшнл ХХК') AND is_active ORDER BY id LIMIT 1)), 'Соёолон интернэшнл ХХК', 'Баяраа', '02/12 уб-салхит мө, орд/ 10тонн крантай машин/ буцахдаа налайх-устгалын материал,   хотод баллон буулгана.', 4000000, 4000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2079');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2080', '2026-02-12'::date, '2026-02-28'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '02/12 хэнтий-эмээлт/ шланз / 1000ш арьс тээвэр', 2500000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2080');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2081', '2026-02-12'::date, '2026-02-13'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', 'молдоктой унгалдтай түрээс /7476УР/ Урьдчилгаа', 18000000, 18000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2081');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2082', '2026-02-12'::date, '2026-02-16'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '02/11 сонсголон-22 товчоо, титан центр', 190000, 190000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2082');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2083', '2026-02-12'::date, '2026-03-01'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '02/12 уб-хэнтий/ портер / анунаас ачилт, 3ш баллоон / буцахдаа 25шуудай шийр', 1100000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2083');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2084', '2026-02-12'::date, '2026-02-16'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '02/12-нд Монгол транс гаалийн талбайгаас - Хан-алтай агуудах ( Хот дотор - Портер ) хийгдсэн тээврийн төлбөрийн нэхэмжлэх.', 117000, 117000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2084');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2085', '2026-02-13'::date, '2026-02-23'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7178801' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Говь Рэмөүт Сервисес ХХК') AND is_active ORDER BY id LIMIT 1)), 'Говь Рэмөүт Сервисес ХХК', 'Баяраа', '02/13 УБ-ЗАВХАН/ 5тонн  1553УБУ/ өндөг, сүүн бүтээгэдхүүн', 4988000, 4988000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2085');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2086', '2026-02-13'::date, '2026-02-23'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '02/13 налайх- гурвалжин/ шланз', 712425, 712425, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2086');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2088', '2026-02-13'::date, '2026-02-24'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '02/13 ти ай гааль-анун/ 4подон ачаа/ 2портер явсан', 200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2088');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2089', '2026-02-13'::date, '2026-02-27'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '02/13 уб-бөөрөлжүүт/ 5тонн маяти 0858УКМ /  Х', 1000000, 1000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2089');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2090', '2026-02-13'::date, '2026-02-16'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6229654' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Апу дэйри ХХК') AND is_active ORDER BY id LIMIT 1)), 'Апу дэйри ХХК', 'Одонтунгалаг', '01/21-ээс 02/13 хоорондох тээврийн тооцоо', 53180342, 53180342, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2090');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2091', '2026-02-13'::date, '2026-02-27'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '02/13 уб-бөөрөлжүүт/ крантай маяти / каргоноос төмөр ачсан Б', 840000, 840000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2091');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2092', '2026-02-23'::date, '2026-02-23'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '02/16-нд Монгол транс гаалийн талбайгаас - 22 товчооруу хүргэсэн ( Хот дотор - 5тн маяти ) хийгдсэн тээврийн төлбөрийн нэхэмжлэх.', 245454.8, 245454.8, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2092');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2093', '2026-02-16'::date, '2026-03-01'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '02/16 уб-хэнтий/ крантай машин/ ти ай гааль ачаа/ анунаас ковшийн дугуй', 2000000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2093');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2094', '2026-02-20'::date, '2026-03-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '02/20 уб-бөөрөлжүүт 02/20 hera  prius сэлбэг Х', 250000, 250000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2094');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2095', '2026-02-24'::date, '2026-03-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5644984' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Соёолон интернэшнл ХХК') AND is_active ORDER BY id LIMIT 1)), 'Соёолон интернэшнл ХХК', 'Баяраа', '02/24 шувуу фафрик- энгүй ундарга крантай машин', 400000, 400000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2095');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2096', '2026-02-24'::date, '2026-02-24'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2704358' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Major drilling mongolia llc') AND is_active ORDER BY id LIMIT 1)), 'Major drilling mongolia llc', 'Нямдорж', 'PO: A1076527  , Оюутолгой сайтаас - Улаанбаатарлуу 3 шалаанз тээврийн төлбөр.', 7200000, 7200000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2096');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2097', '2026-02-24'::date, '2026-02-28'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '02/16-нд ,UB to Оюутолгой толгой , төслийн бараа материал 5тоны машинаар тээвэрлэсэн төлбөр. 3657УКО', 2530000, 2530000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2097');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2098', '2026-02-24'::date, '2026-02-24'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5403502' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('НБИК ХХК') AND is_active ORDER BY id LIMIT 1)), 'НБИК ХХК', 'Нямдорж', '02/08,  Шалаанз , ОТ-УБ , Шатны материал тээвэрийн төлбөр. 92-89УАР', 13800000, 13800000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2098');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2099', '2026-02-24'::date, '2026-03-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5644984' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Соёолон интернэшнл ХХК') AND is_active ORDER BY id LIMIT 1)), 'Соёолон интернэшнл ХХК', 'Баяраа', '02/25 УБ-ЭРдэнэт үйлдвэр/ крантай маяти 4367УКМ', 3500000, 3500000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2099');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2100', '2026-02-25'::date, '2026-03-01'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '02/25 уб-бөөрөлжүүт/ 5тонн маяти/ 100н айл, 32тойрог, terasteel О', 1090000, 1090000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2100');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2101', '2026-02-25'::date, '2026-03-01'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '02/25 уб-бөөрөлжүүт/ портер 5660УАХ/ хера / BSB/ Х', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2101');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2102', '2026-02-16'::date, '2026-02-25'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '02/16 сонсголон-сүү / портер хүргэлт', 90000, 90000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2102');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2103', '2026-02-25'::date, '2026-04-11'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1145 , MMS to MSM , Axle-4 , 02/10 , Porter', 340000, 340000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2103');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2104', '2026-02-25'::date, '2026-04-11'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: NA , OT warehouse to Yarmag 23th khoroo 882bair , Operator seat , 02/13 , Amjirgaa', 118000, 118000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2104');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2105', '2026-02-25'::date, '2026-04-11'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1148 , MMS to Engui Undarga , Tool cabinet , 02/26 , 5tn - Mighty', 460000, 460000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2105');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2106', '2026-02-26'::date, '2026-02-28'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '02/26 АНУН-НАЛАЙХ / ХАЙРЦАГТАЙ БАРАА / ПОРТЕР', 250000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2106');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2107', '2026-02-25'::date, '2026-04-11'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1153 , MMS to Engui Undarga , Agaar shuugchiin system 3set , 02/26 , Amjirgaa', 130000, 130000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2107');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2108', '2026-02-27'::date, '2026-03-07'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '02/27 уб-бөөрөлжүүт / портер 1645УБЧ/ 600кг техникийн давс О', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2108');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2109', '2026-02-27'::date, '2026-03-07'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '02/27 уб-бөөрөлжүүт/ портер 5660УАХ / барло- 5ш поошиктой тос Э', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2109');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2110', '2026-02-27'::date, '2026-03-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '300LC экскаватор / 8878УН/ түрээс 40хоног 757цаг', 78513100, 78513100, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2110');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2111', '2026-02-27'::date, '2026-04-13'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1131 , MMS үйлдвэр дээр , Тэвш өргөлт , 02/26 , 25тн кран', 2119500, 2119500, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2111');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2112', '2026-02-27'::date, '2026-03-27'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '02/27 УБ-ХЭНТИЙ / 2.5тонн маяти / Анунаас бараа материал / буцахдаа элэг, үхрийн шийр', 2000000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2112');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2113', '2026-03-02'::date, '2026-03-16'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7178801' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Говь Рэмөүт Сервисес ХХК') AND is_active ORDER BY id LIMIT 1)), 'Говь Рэмөүт Сервисес ХХК', 'Баяраа', '03/02 УБ-Завхан/ дөрвөлжин сум, / 5тонн маяти 1553УБУ', 4988000, 4988000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2113');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2114', '2026-03-02'::date, '2026-03-03'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '02/27 сонсголон-тэц3 портер хүргэлт', 180000, 180000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2114');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2115', '2026-03-02'::date, '2026-03-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6446876' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Мастер фүүдс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Мастер фүүдс ХХК', 'Баяраа', '02/02 УБ-ХАН АЛТАЙ', 14081818, 14081818, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2115');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2116', '2026-03-02'::date, '2026-03-03'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '4551958' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('БНЦМУ ХХК') AND is_active ORDER BY id LIMIT 1)), 'БНЦМУ ХХК', 'Баяраа', '02/28 СОНСГОЛОН-БАГА ТЭНГЭР/ портер хүргэлт', 90000, 90000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2116');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2117', '2026-03-02'::date, '2026-04-16'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1093 , M1126 , MMS to Engui Undarga , Arc Gate , 02/27 , 5tn - Mighty', 460000, 460000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2117');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2118', '2026-03-02'::date, '2026-04-16'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1145 , MMS to MSM , Axle#4 , 02/28 , Amjirgaa', 130000, 130000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2118');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2119', '2026-03-02'::date, '2026-04-16'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1141 , MMS to Engui Undarga , Drum , 02/28 , 3.5tn - Mighty', 250000, 250000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2119');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2120', '2026-03-02'::date, '2026-04-16'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', '1102/07, УБ-Дархан машин түрээс', 245000, 245000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2120');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2121', '2026-03-02'::date, '2026-03-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Нямдорж', 'Barlo 02/01 - 02/28 хүртэлхи тээвэрийн төлбөр.', 85856000, 85856000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2121');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2122', '2026-03-02'::date, '2026-03-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5528534' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Premium concrete LLC') AND is_active ORDER BY id LIMIT 1)), 'Premium concrete LLC', 'Нямдорж', '02/06-нд ,УБ - Оюутолгой , 5тн машин - ( төслийн ачаа ) 5824УБЯ', 18610909, 18610909, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2122');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2123', '2026-03-02'::date, '2026-03-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6625223' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Премиум Иннова ххк') AND is_active ORDER BY id LIMIT 1)), 'Премиум Иннова ххк', 'Нямдорж', '26/02 сарын дээж , хэв тээвэрлэлтийн төлбөрийн нэхэмжлэх', 1392000, 1392000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2123');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2124', '2026-03-03'::date, '2026-03-03'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК Нүүрс тээврийн төлбөр 2/1-16', 160097018, 160097018, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2124');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2125', '2026-03-03'::date, '2026-03-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '03/03 УБ-Бөөрөлжүүт/ 5тонн маяти 0525УЕК/тос, масло, экскэ шүд  Х', 1000000, 1000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2125');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2126', '2026-03-03'::date, '2026-03-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5356083' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Saade constraction LLC') AND is_active ORDER BY id LIMIT 1)), 'Saade constraction LLC', 'Нямдорж', 'UB to Энержи ресурс 40тоны контанер тээвэрлэх шалаанзны төлбөрийн нэхэмжлэх', 3600000, 3600000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2126');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2128', '2026-03-04'::date, '2026-03-06'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7161785' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Аркилект трэйд ХХК') AND is_active ORDER BY id LIMIT 1)), 'Аркилект трэйд ХХК', 'Одонтунгалаг', '1140УБР, 02/07, УБ-Дархан машин түрээс', 4249000, 4249000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2128');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2129', '2026-03-04'::date, '2026-03-06'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', 'унагалдай экскаватор / 7476УР/ түрээс 43хоног 860цаг', 24100000, 24100000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2129');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2130', '2026-03-04'::date, '2026-03-05'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '03/04 25тонн кран түрээс / трайлер дээр нүүрсний пункер ачих', 500000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2130');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2131', '2026-03-03'::date, '2026-04-17'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: CC01 , MMS to Engui Undarga , Window glass , 03/02 , Amjirgaa', 260000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2131');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2132', '2026-03-05'::date, '2026-03-09'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '03/05 УБ-Дундговь/дэлгэрхангай / нүүрсний пункер / трэйлер тээвэр 7180УЕО', 3600000, 3600000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2132');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2133', '2026-03-05'::date, '2026-03-10'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '03/05 уб-хэнтий / 5тонн маяти 0525УЕК/ Анунаас бараа материал/ буцахдаа дайвар бүтээгдэхүүн', 2500000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2133');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2134', '2026-03-05'::date, '2026-03-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '02/01-ээс 02/28, өдрийг хүртэлхи ( Хот дотор ) хийгдсэн тээврийн төлбөрийн нэхэмжлэх.', 1729000, 1729000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2134');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2135', '2026-03-05'::date, '2026-03-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '02/01-ээс 02/28 өдрийг хүртэлхи ( Уурхайруу ) хийгдсэн тээврийн төлбөрийн нэхэмжлэх.', 8825454.55, 8825454.55, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2135');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2136', '2026-03-05'::date, '2026-03-09'::date, (SELECT id FROM partners WHERE lower(btrim(name)) = lower('interasia energy LLC') AND is_active ORDER BY id LIMIT 1), 'interasia energy LLC', 'Нямдорж', 'MMS LLC - ийн хашаанд өргөлт хийх 25тоны авто краны төлбөр', 3505000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2136');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2137', '2026-03-06'::date, '2026-03-06'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '03/06 уб-бөөрөлжүүт/ 5660УАХ/ Хера, гранд хас, нисдэг машин Э', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2137');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2138', '2026-03-08'::date, '2026-03-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '03/08 хэнтий-уб/ арьс тээвэр/ шланз 9576УБР', 2500000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2138');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2139', '2026-03-09'::date, '2026-03-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '03/09 сонсголон-чингэлтэй портер', 100000, 100000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2139');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2140', '2026-03-09'::date, '2026-03-16'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7178801' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Говь Рэмөүт Сервисес ХХК') AND is_active ORDER BY id LIMIT 1)), 'Говь Рэмөүт Сервисес ХХК', 'Баяраа', '03/09 УБ-завхан/ айраг кэмп / 5тонн/  өндөг сүү, хуурай хүнсний бүтээгдэхүүн', 4988000, 4988000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2140');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2141', '2026-03-09'::date, '2026-03-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '03/03-нд ,Анун төвөөс - Үүртээл-рүү төслийн бараа материал 5тоны машинаар тээвэрлэсэн төлбөр. 5824УБЯ', 230000, 230000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2141');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2142', '2026-03-09'::date, '2026-03-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '03/03-нд ,UB to Оюутолгой толгой , Үүртээс-ээс Ребар шалаанзаар тээвэрлэсэн төлбөр. 3688УАВ', 7920000, 7920000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2142');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2143', '2026-03-09'::date, '2026-03-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '03/03-нд , Энгүй ундрагаас - Анун төврүү 1.5тоны машинаар тээвэрлэсэн төлбөр. 6899УБУ', 172500, 172500, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2143');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2144', '2026-03-09'::date, '2026-03-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2082675' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Туушин ХХК') AND is_active ORDER BY id LIMIT 1)), 'Туушин ХХК', 'Баяраа', '03/09 уб-дархан /портер 5955УКО', 1400000, 1400000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2144');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2145', '2026-03-09'::date, '2026-03-13'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '03/09 УБ-бөөрөлжүүт/ 5тонн маяти 0858УКМ/ палк, хучлага Б', 1000000, 1000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2145');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2146', '2026-03-09'::date, '2026-03-14'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '03/09 уб-хэнтий / амжиргаа/ анунаас бараа материал ачсан', 600000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2146');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2147', '2026-03-11'::date, '2026-03-11'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2704358' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Major drilling mongolia llc') AND is_active ORDER BY id LIMIT 1)), 'Major drilling mongolia llc', 'Нямдорж', 'PO: A1077838  , Оюутолгой сайтаас - Улаанбаатарлуу 1 шалаанз тээврийн төлбөр.', 2400000, 2400000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2147');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2148', '2026-03-11'::date, '2026-03-11'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2704358' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Major drilling mongolia llc') AND is_active ORDER BY id LIMIT 1)), 'Major drilling mongolia llc', 'Нямдорж', 'PO:  A1077898 , Оюутолгой сайтаас - Улаанбаатарлуу 1 шалаанз тээврийн төлбөр.', 2400000, 2400000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2148');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2150', '2026-03-11'::date, '2026-03-11'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'УБ-ОТ HSE, ҮА, ИТА сэлбэг хүргэлт 0310', 1407000, 1407000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2150');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2151', '2026-03-12'::date, '2026-03-11'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '2/14 уб-яармаг хүргэлт', 90000, 90000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2151');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2152', '2026-03-11'::date, '2026-03-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '03/11 уб-бөөрөлжүүт/ 5660УАХ портер/ амгалан карго-с бараа ачсан Х', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2152');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2153', '2026-03-11'::date, '2026-03-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК нүүрс тээвэр 2/22-2/28 хооронд тээврийн төлбөр', 44208889, 44208889, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2153');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2157', '2026-03-13'::date, '2026-03-16'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5644984' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Соёолон интернэшнл ХХК') AND is_active ORDER BY id LIMIT 1)), 'Соёолон интернэшнл ХХК', 'Баяраа', '03/13 УБ-Салхит. мө, орд/ 5тонн маяти/ шувуун фафрик-налайх ачилт', 2600000, 2600000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2157');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2158', '2026-03-13'::date, '2026-03-17'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '03/13 уб-бөөрөлжүүт/ портер 5660/ нисдэг машин, хермес/ Э', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2158');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2159', '2026-03-12'::date, '2026-03-18'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '03/12 яармаг-сонсголон хүргэлт', 90000, 90000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2159');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2160', '2026-03-14'::date, '2026-03-19'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '03/14  03/15 УБ-БӨӨРӨЛЖҮҮТ / барло сэлбэг тээвэр/жижиг тэрэг Э', 400000, 400000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2160');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2161', '2026-03-14'::date, '2026-04-28'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1105 , M1106 , Хужирбулан to MMS ,Cable tray , 03/10 , Amjirgaa', 130000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2161');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2162', '2026-03-14'::date, '2026-04-28'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1150 , tsaiz ( Tumen tumurt to MMS ,List 1.5x1.5x12mm , 03/12 , Amjirgaa', 130000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2162');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2168', '2026-03-16'::date, '2026-04-13'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '03/16 уб-бөөрөлжүүт/ портер / юнитра/ хера/ техник импорт/ Х', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2168');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2165', '2026-03-16'::date, '2026-03-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7161785' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Аркилект трэйд ХХК') AND is_active ORDER BY id LIMIT 1)), 'Аркилект трэйд ХХК', 'Одонтунгалаг', '03/04, УБ-Дархан машин түрээс', 4123000, 4123000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2165');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2166', '2026-03-17'::date, '2026-03-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6846548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Юрика ХХК') AND is_active ORDER BY id LIMIT 1)), 'Юрика ХХК', 'Баяраа', '03/17 ачигчтай амжиргаа/ НҮБ-чингэлтэй, зайсан агуулах', 200000, 200000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2166');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2167', '2026-03-17'::date, '2026-03-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '03/17 УБ-Бөөрөлжүүт/ маятти 0525/ хера Х', 1000000, 1000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2167');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2169', '2026-03-17'::date, '2026-03-23'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '03/17 уб-хэнтий/ амжиргаа / анунаас бараа материал ачив', 600000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2169');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2172', '2026-03-17'::date, '2026-03-18'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК нүүрс тээвэр 3/1-14-ний хооронд тээврийн төлбөр', 222127924, 222127924, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2172');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2173', '2026-03-18'::date, '2026-03-19'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '03/18 ХЭНТИЙ-УБ / шланз / арьс тээвэр', 2500000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2173');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2174', '2026-03-18'::date, '2026-03-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '03/18 уб-бөөрөлжүүт/ 2000ш coverall/ портер / Э', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2174');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2175', '2026-03-18'::date, '2026-03-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '03/18 сонсголон-портер хүргэлт', 90000, 90000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2175');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2176', '2026-03-18'::date, '2026-03-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2077108' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Сүү ХК') AND is_active ORDER BY id LIMIT 1)), 'Сүү ХК', 'Нямдорж', '03/18 - нд 22-ийн гаалиас - Сүү ХХК-руу 30cbm ачаа тээвэрлэсэн төлбөр.', 300000, 300000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2176');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2177', '2026-03-19'::date, '2026-03-23'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5644984' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Соёолон интернэшнл ХХК') AND is_active ORDER BY id LIMIT 1)), 'Соёолон интернэшнл ХХК', 'Баяраа', '03/20 УБ-салхит мө орд/ 3тонн маяти', 2050000, 2050000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2177');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2178', '2026-03-19'::date, '2026-03-25'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5182018' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ULE LLC.') AND is_active ORDER BY id LIMIT 1)), 'ULE LLC.', 'Нямдорж', '01/08 -нд, ULE-ээс Энгүй ундрага-руу Телетрак , ачилтын машинаар тээвэрлэсэн.', 1550000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2178');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2179', '2026-03-19'::date, '2026-03-19'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '03/19 уб-бөөрөлжүүт/ портер/ хeра, барло, HHI/ Х', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2179');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2180', '2026-03-19'::date, '2026-03-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5946239' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Алтгана ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Алтгана ресурс ХХК', 'Нямдорж', '03/18 - нд Дэнжийн 1000-ийн чиглэл-ээс - Алтгана ресурс уурхай ачаа тээвэрлэсэн төлбөр.', 480000, 480000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2180');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2181', '2026-03-20'::date, '2026-03-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '03/20 налайх-ботаник/ портер 2 боодол', 212400, 212400, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2181');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2182', '2026-03-20'::date, '2026-03-23'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '03/20  уб-бөөрөлжүүт/ 2 портер /3600ш ундаа / Э', 700000, 700000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2182');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2183', '2026-03-20'::date, '2026-05-04'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: T01  , MONNIS work shop to MMS , Vent fan and spare parts , 03/18 , Шалаанз', 5667500, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2183');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2184', '2026-03-20'::date, '2026-05-04'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1181 , MONNIS work shop , Тэвш ачилт , 03/17 , 25тн кран', 2119500, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2184');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2185', '2026-03-20'::date, '2026-05-04'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1106 , Энгүй ундрагаас - MMS work shop , Water tank, seals , 03/16 , 2.5тн маяти', 250000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2185');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2186', '2026-03-20'::date, '2026-05-04'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1154 , MMS work shop to Oyutolgoi site, Vent door 12tn , 03/19 , Шалаанз', 3795000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2186');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2187', '2026-03-20'::date, '2026-05-04'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1175 , 22товчоо - MMS work shop , Water tank, seals , 03/19 , 1.5тн портер', 170000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2187');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2188', '2026-03-20'::date, '2026-05-04'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1147 , MMS work shop - Энгүй ундрага , Drum , 03/20 , 5тн Маяти', 460000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2188');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2189', '2026-03-20'::date, '2026-05-04'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1122 , MMS work shop - Энгүй ундрага , Thermic oxygen , 03/20 , 2.5тн маяти', 250000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2189');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2190', '2026-03-20'::date, '2026-05-04'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1171 , 22товчоо - MMS work shop , Bolt Racks , 03/23 , 1.5тн портер', 170000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2190');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2191', '2026-03-24'::date, '2026-03-24'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6846548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Юрика ХХК') AND is_active ORDER BY id LIMIT 1)), 'Юрика ХХК', 'Баяраа', '03/24 эмээлт-зайсан/ амжиргаа', 150000, 150000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2191');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2192', '2026-03-24'::date, '2026-03-26'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6229654' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Апу дэйри ХХК') AND is_active ORDER BY id LIMIT 1)), 'Апу дэйри ХХК', 'Одонтунгалаг', 'Түмэн Тээх ХХК 02/14-ээс 03/20 хоорондох тээврийн тооцоо', 71323924.6, 71323924.6, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2192');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2194', '2026-03-25'::date, '2026-03-25'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = 'УС86061216' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Пүрэвсүрэн') AND is_active ORDER BY id LIMIT 1)), 'Пүрэвсүрэн', 'Баяраа', '03/25 Кино үйлдвэр-улиастай/ ачигчтай портер', 150000, 150000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2194');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2197', '2026-03-26'::date, '2026-04-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '03/26 уб-бөөрөлжүүт/ 5660УАХ/ барло, нисдэг машин, хермес/ Э', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2197');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2198', '2026-03-26'::date, '2026-04-03'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '03/26 налайх-гурвалжин/ шланз', 712425, 712425, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2198');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2199', '2026-03-27'::date, '2026-03-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '03/27 Сонсголон -тэц3-Хермес  машин түрээс', 135000, 135000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2199');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2200', '2026-03-28'::date, '2026-03-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '03/28 нисдэг машин-бөөрөлжүүт/  жижиг тэрэг Э', 200000, 200000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2200');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2201', '2026-03-30'::date, '2026-04-06'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '03/30 Сонсголон- БИГ  задгай портер', 290000, 290000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2201');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2202', '2026-03-31'::date, '2026-04-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6446876' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Мастер фүүдс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Мастер фүүдс ХХК', 'Баяраа', '03/02 уб-хан алтай', 16907727, 16907727, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2202');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2203', '2026-03-31'::date, '2026-04-01'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6625223' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Премиум Иннова ххк') AND is_active ORDER BY id LIMIT 1)), 'Премиум Иннова ххк', 'Нямдорж', '03/31 , Сайншанд газрын тосны үйлдвэрээс - Улаанбаатараас , 24тн химийн нэмэлт тээвэрлэлт.', 3920000, 3920000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2203');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2204', '2026-04-02'::date, '2026-04-06'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7178801' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Говь Рэмөүт Сервисес ХХК') AND is_active ORDER BY id LIMIT 1)), 'Говь Рэмөүт Сервисес ХХК', 'Баяраа', '04/02 УБ- завхан/ айраг кемп, 5тонн 1553УБУ', 4988000, 4988000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2204');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2205', '2026-04-01'::date, '2026-04-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6625223' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Премиум Иннова ххк') AND is_active ORDER BY id LIMIT 1)), 'Премиум Иннова ххк', 'Нямдорж', '26/03 сарын дээж , хэв тээвэрлэлтийн төлбөрийн нэхэмжлэх', 4128000, 4128000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2205');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2206', '2026-04-02'::date, '2026-04-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Нямдорж', 'Barlo 03/01 - 03/30 хүртэлхи тээвэрийн төлбөр.', 125198800, 125198800, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2206');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2208', '2026-04-01'::date, '2026-04-03'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/01 уб-бөөрөлжүүт/ портер/ хера, метал, трансхидроулиг Х', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2208');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2209', '2026-04-02'::date, '2026-04-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5528534' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Premium concrete LLC') AND is_active ORDER BY id LIMIT 1)), 'Premium concrete LLC', 'Нямдорж', '03/02-нд , 22тоочооноос - Premium үйлдвэр1 ( Porter - 90м ремен ) 3230УАН', 15522727.5, 15522727.5, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2209');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2210', '2026-04-02'::date, '2026-04-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5528534' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Premium concrete LLC') AND is_active ORDER BY id LIMIT 1)), 'Premium concrete LLC', 'Нямдорж', '03/26-нд , Амгалан үйлдвэр дээр 20тоны контайнер байрлуулсан.', 4510000, 4510000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2210');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2211', '2026-04-03'::date, '2026-04-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/03 уб-бөөрөлжүүт/ 5тонн маяти/ хера, 22 түмэн төмөрт / Х', 1000000, 1000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2211');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2212', '2026-04-03'::date, '2026-04-06'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '4/1 Сонсголон-Яармаг задгай портер', 310000, 310000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2212');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2216', '2026-04-03'::date, '2026-04-03'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК нүүрс тээвэр 3-р сарын 16-31', 55398268, 55398268, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2216');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2217', '2026-04-03'::date, '2026-04-03'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК 22 элс тээвэр 3-р сар', 5675417, 5675417, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2217');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2218', '2026-04-06'::date, '2026-04-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5946239' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Алтгана ресурс ХХК.') AND is_active ORDER BY id LIMIT 1)), 'Алтгана ресурс ХХК.', 'Нямдорж', 'Хан-алтай уурхайгаас - Алтгана ресурс уурхайруу Бутлуур тээвэрлэсэн. Трайлер - 4862УКС', 124600000, 124600000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2218');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2220', '2026-04-06'::date, '2026-05-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: NA, Sandvik to MMS workshop , lift armor , 04/02 , 2.5тн маяти', 250000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2220');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2221', '2026-04-06'::date, '2026-05-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: NA, Engui undraga to MMS workshop , Backet , 04/03 , 5тн маяти', 460000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2221');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2222', '2026-04-06'::date, '2026-04-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '03/01-ээс 03/31, өдрийг хүртэлхи ( Хот дотор ) хийгдсэн тээврийн төлбөрийн нэхэмжлэх.', 3579636.36, 3579636.36, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2222');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2223', '2026-04-07'::date, '2026-04-07'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '8385173' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Мөнх Сондор Гранд ХХК') AND is_active ORDER BY id LIMIT 1)), 'Мөнх Сондор Гранд ХХК', 'Баяраа', '04/04 чойр-жаргалант/ 50тонн ганбөмбөлөг', 4000000, 4000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2223');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2224', '2026-04-06'::date, '2026-04-07'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5511836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Амарвишн ХХК') AND is_active ORDER BY id LIMIT 1)), 'Амарвишн ХХК', 'Баяраа', '04/06 хот дотор тээвэр', 800000, 800000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2224');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2225', '2026-04-07'::date, '2026-05-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1184,  MMS workshop to  Major Drilling ,Mud tank, 04/07  , 1.5 тн Портер', 170000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2225');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2226', '2026-04-07'::date, '2026-05-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1171,  22 Tovchoo to MMS workshop ,Bolt Racks , 03/23, 1.5 тн Портер', 170000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2226');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2227', '2026-04-07'::date, '2026-05-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1175 , MMS workshop to OT site, Pipe stand , 3/25, 1тн амжиргаа', 1500000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2227');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2228', '2026-04-07'::date, '2026-05-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1097 , MMS workshop to Энгүй ундрага ,Portable room,  3/25, Шалаанз', 700000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2228');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2229', '2026-04-07'::date, '2026-05-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1083 , Transwest - MMS work shop , Cabin and glass ,  3/25, 5тн маяти', 460000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2229');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2230', '2026-04-07'::date, '2026-05-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1181, MMS workshop , Ejector of dumpbox , 3/26, Crane', 517500, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2230');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2231', '2026-04-08'::date, '2026-04-09'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7161785' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Аркилект трэйд ХХК') AND is_active ORDER BY id LIMIT 1)), 'Аркилект трэйд ХХК', 'Одонтунгалаг', '03/18, УБ-Дархан машин түрээс жижиг тэрэг', 1664500, 1664500, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2231');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2232', '2026-04-08'::date, '2026-04-10'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '04/07 УБ-НАЛАЙХ-ХЭНТИЙ/ 5тонн маяти/ подонтой вакум уут тээвэр', 2000000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2232');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2234', '2026-04-03'::date, '2026-04-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '04/03-нд ,UB to Оюутолгой толгой , Төслийн бараа материал 1.5тн портероор тээвэрлэсэн төлбөр. 3230УАН', 1725000, 1725000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2234');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2237', '2026-04-08'::date, '2026-04-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/08 уб-бөөрөлжүүт/ портер 5660 / галын хор, моторын жийрэг, Coverall/ Э', 432000, 432000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2237');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2238', '2026-04-08'::date, '2026-04-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/08 уб-бөөрөлжүүт/ портер 5660 / шуудай, шүд / М', 432000, 432000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2238');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2239', '2026-04-09'::date, '2026-05-24'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1150 ,MMS work shop to Энгүй ундрага , LB02 Bucket , 04/9 , Mighty 5t', 460000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2239');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2240', '2026-03-31'::date, '2026-04-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5946239' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Алтгана ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Алтгана ресурс ХХК', 'Нямдорж', '03/31 - нд МАК Централ-аас - Алтгана ресурс уурхайруу 404ш Блокны цавуу тээвэрлэсэн төлбөр.', 1409090.5, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2240');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2241', '2026-04-07'::date, '2026-04-13'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '4/9 -нд   Сонсголон - 100 айл  1.5 тн Портер', 550000, 550000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2241');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2242', '2026-04-09'::date, '2026-04-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/09 уб-бөөрөлжүүт/ портер / хера- хроп, бусад сэлбэг/ Х', 432000, 432000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2242');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2243', '2026-04-10'::date, '2026-04-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/10 уб-бөөрөлжүүт/ портер / хутга, хроп, холхивч/  Х', 582000, 582000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2243');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2244', '2026-04-10'::date, '2026-04-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/10 уб-бөөрөлжүүт/ портер / 100н айл- тавиур, бодис, Барло-сэлбэг  / Б', 432000, 432000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2244');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2245', '2026-04-10'::date, '2026-04-13'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5511836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Амарвишн ХХК') AND is_active ORDER BY id LIMIT 1)), 'Амарвишн ХХК', 'Баяраа', '04/10 уб-дархан/ 5тонн маяти', 1500000, 1500000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2245');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2246', '2026-04-11'::date, '2026-04-14'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '04/11 налайх- чулуун овоо- гурвалжин / шланз', 812425, 812425, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2246');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2247', '2026-04-13'::date, '2026-04-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/13 уб-бөөрөлжүүт/ 5тонн маяти 1701 / хера, метал, hhi/ Х', 1200000, 1200000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2247');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2248', '2026-04-13'::date, '2026-05-28'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1183 , Engui Undarga (OTWH) to MMS workshop , 04/13 , Амжиргаа', 130000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2248');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2249', '2026-04-13'::date, '2026-04-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '04/13 өнөр төмөрт-налайх үйлдвэр/ шланз/ лист төмөрнууд ачив.', 712425, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2249');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2250', '2026-04-13'::date, '2026-04-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК_Ts') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК_Ts', 'Нямдорж', '4/13-нд , Улиастайгаас - Морингийн давааруу , Портероор хайрацгтай ачаа тээвэрлэсэн төлбөр', 250000, 250000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2250');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2251', '2026-04-14'::date, '2026-04-16'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '04/14 налайх-яармаг/ шланз', 812425, 812425, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2251');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2252', '2026-04-14'::date, '2026-04-17'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/14 УБ-бөөрөлжүүт/ маяти / sinopec-тос ачна / Б', 1200000, 1200000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2252');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2253', '2026-04-14'::date, '2026-05-29'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: MMEC, Barlo World to100 ail, MMS workshop , 04/14 , Амжиргаа', 130000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2253');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2255', '2026-04-15'::date, '2026-04-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/15 уб-бөөрөлжүүт/ портер 5660 / Гранд майнинг -материал , D8 D9 ийн соёо Х', 432000, 432000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2255');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2256', '2026-04-14'::date, '2026-04-17'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Тэргэл', '4/14-нд   Сонсголон -BIg  1.5 тн Портер', 220000, 220000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2256');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2257', '2026-04-16'::date, '2026-04-17'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/16 уб-бөөрөлжүүт/ шланз/ түмэн төмөрт, хера Б', 1755000, 1755000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2257');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2258', '2026-04-16'::date, '2026-04-18'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/16 УБ-бөөрөлжүүт / портер / дүнжингарав -2 Подон ачаа / О', 432000, 432000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2258');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2259', '2026-04-17'::date, '2026-04-19'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/16 уб-Бөөрөлжүүт/ портер / оффис-с ачилт хийв/ Б', 432000, 432000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2259');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2260', '2026-04-16'::date, '2026-04-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '04/10, UB-ХАА уурхай Dozer D8 тээвэрлэсэн төлбөр.', 22800000, 22800000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2260');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2261', '2026-04-16'::date, '2026-04-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '04/16 ти ай гааль-анун/ 1 подон шуудайтай ачаа / портер', 120000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2261');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2262', '2026-04-16'::date, '2026-04-16'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5511836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Амарвишн ХХК') AND is_active ORDER BY id LIMIT 1)), 'Амарвишн ХХК', 'Баяраа', '04/16 эрин-сонсголон/ портер', 110000, 110000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2262');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2263', '2026-04-16'::date, '2026-04-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Тэргэл', '04/16  Сонсголон - 1-р эмнэлэг  портер', 130000, 130000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2263');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2264', '2026-04-16'::date, '2026-04-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7178801' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Говь Рэмөүт Сервисес ХХК') AND is_active ORDER BY id LIMIT 1)), 'Говь Рэмөүт Сервисес ХХК', 'Баяраа', '04/17 УБ-Завхан/ дөрвөлжин сум/ 5тонн', 5588000, 5588000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2264');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2265', '2026-04-17'::date, '2026-04-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/17 уб-бөөрөлжүүт/ 3тонн крантай машин / Allison Mongolia, карго Х', 910000, 910000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2265');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2266', '2026-04-17'::date, '2026-04-17'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК 22 элс тээвэр 4-р сар 1-17', 100277056, 100277056, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2266');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2269', '2026-04-16'::date, '2026-04-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '04/16, Шинэ нисэхээс - ХАА агуулах тээвэрлэсэн төлбөр.', 132000, 132000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2269');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2270', '2026-04-18'::date, '2026-04-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/18 уб-бөөрөлжүүт /2 портер/ 104ш савтай бодис / дүнжингараваас О', 864000, 864000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2270');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2271', '2026-04-18'::date, '2026-04-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '04/17 налайх-яармаг / шланз', 2024850, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2271');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2273', '2026-04-21'::date, '2026-05-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/20 уб-бөөрөлжүүт/ шланз 7449БНН/ түшиг даян од-СП6 13ш / Б', 8775000, 8775000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2273');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2276', '2026-04-21'::date, '2026-05-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7178801' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Говь Рэмөүт Сервисес ХХК') AND is_active ORDER BY id LIMIT 1)), 'Говь Рэмөүт Сервисес ХХК', 'Баяраа', '04/21 уб-завхан/ айраг кэмп /5тонн сүү, сүүн бүтээгдэхүүн тээвэр', 5588000, 5588000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2276');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2277', '2026-04-21'::date, '2026-05-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '04/21 налайх-өлзийт хороолол, нисэх/ шланз', 812425, 812425, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2277');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2278', '2026-04-21'::date, '2026-05-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/21 УБ-бөөрөлжүүт/ портер/ aode, metal - сэлбэг, хроп / Х', 582000, 582000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2278');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2275', '2026-04-21'::date, '2026-06-05'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Тэргэл', 'PO:NA   04/21   Энгүй ундрага - MMS   2.5 тн', 250000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2275');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2280', '2026-04-22'::date, '2026-04-23'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/22 уб-бөөрөлжүүт/ портер 5660/ арчих материал / Э', 432000, 432000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2280');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2283', '2026-03-24'::date, '2026-03-26'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6229654' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Апу дэйри ХХК') AND is_active ORDER BY id LIMIT 1)), 'Апу дэйри ХХК', 'Одонтунгалаг', 'Түмэн Тээх ХХК 03/20-ээс 04/20 хоорондох тээврийн тооцоо', 64444977, 64444977, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2283');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2284', '2026-04-23'::date, '2026-05-19'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/23 уб-бөөрөлжүүт/ портер / домогт, хера, BSB/ Х', 432000, 432000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2284');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2285', '2026-04-23'::date, '2026-04-23'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6004121' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Дорнын Мандах Төмөр ХХК') AND is_active ORDER BY id LIMIT 1)), 'Дорнын Мандах Төмөр ХХК', 'Баяраа', '04/23 Сайн шанд-Ханбогд агуулах/ 400тонн ганбөмбөлөг/ 5 чиргүүлтэй машин тээвэр', 38000000, 38000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2285');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2286', '2026-04-23'::date, '2026-04-24'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5511836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Амарвишн ХХК') AND is_active ORDER BY id LIMIT 1)), 'Амарвишн ХХК', 'Баяраа', '04/23 уб-дархан/ ган хоолой+3хайрцаг бараа/  10тонн маяти', 2200000, 2200000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2286');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2287', '2026-04-21'::date, '2026-06-05'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Тэргэл', 'PO:M1199   04/21   Энгүй ундрага - MMS  Задгай шаланз', 1400000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2287');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2288', '2026-04-22'::date, '2026-06-06'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Тэргэл', 'PO:M1178   04/22   Цайз 16  - MMS   Амжиргаа', 260000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2288');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2290', '2026-04-24'::date, '2026-04-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/24 бөөрөлжүүт/ 50тонн кран түрээс / нүүрсний пункер өргөх / Э', 4000000, 4000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2290');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2291', '2026-04-24'::date, '2026-04-27'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '04/24 уб-налайх/ 2*5тонн амбаартай маяти/ 9500ш цаасан хайрцаг', 700000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2291');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2293', '2026-04-24'::date, '2026-04-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7243425' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Max clean energy LLC') AND is_active ORDER BY id LIMIT 1)), 'Max clean energy LLC', 'Нямдорж', '04/13-нд УБ-ХАА уурхайруу тээвэрлэлт хийсэн Шалаанзны төлбөр. / 1661ГАЕ /', 23916363.18, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2293');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2294', '2026-04-24'::date, '2026-05-01'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/24 уб-бөөрөлжүүт/ портер 5660/ барло-с ачилт/ Э', 432000, 432000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2294');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2295', '2026-04-27'::date, '2026-05-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '4/27  УБ-бөөрөлжүүт / портер 5660/ металаас хроп / Х', 582000, 582000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2295');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2296', '2026-04-27'::date, '2026-06-11'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Тэргэл', 'PO: M1129  4/27  MMS - Энгүй ундрага   2.5 тн Маяти', 710000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2296');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2297', '2026-04-28'::date, '2026-05-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/28 уб-бөөрөлжүүт/ крантай маяти / амгалан карго  / Х', 910000, 910000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2297');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2298', '2026-04-28'::date, '2026-06-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Тэргэл', 'PO: M1191  4/27  MMS - Энгүй ундрага   5 тн Маяти', 460000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2298');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2299', '2026-04-29'::date, '2026-05-06'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/29 УБ-бөөрөлжүүт/ маяти 0525/ 30 ширээ 60 сандал, амгалангаас кабел / Ш', 1400000, 1400000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2299');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2300', '2026-04-29'::date, '2026-05-04'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5511836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Амарвишн ХХК') AND is_active ORDER BY id LIMIT 1)), 'Амарвишн ХХК', 'Баяраа', '04/29 уб-цагаан суварга/ 17м тавцан шланз', 5800000, 5800000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2300');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2301', '2026-04-22'::date, '2026-05-05'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5356083' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Saade constraction LLC') AND is_active ORDER BY id LIMIT 1)), 'Saade constraction LLC', 'Нямдорж', 'UB to Энержи ресурс 40тоны контанер тээвэрлэх шалаанзны төлбөрийн нэхэмжлэх', 3960000, 3960000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2301');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2302', '2026-04-24'::date, '2026-06-08'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Тэргэл', 'PO: M1181 , At MMS Workshop , Тэвш ачилт , 4/24, 25тн кран', 1639500, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2302');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2303', '2026-04-24'::date, '2026-05-10'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '04/22-нд ,UB to Оюутолгой толгой , Арматур тээвэрлэсэн Шалаанзны төлбөр. 8268УБТ', 14208072, 14208072, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2303');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2304', '2026-04-29'::date, '2026-04-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5411661' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Саммит ХХК') AND is_active ORDER BY id LIMIT 1)), 'Саммит ХХК', 'Одонтунгалаг', '04/26-ний УБ-Дархан чиглэл машин түрээсийн төлбөр', 1560000, 1560000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2304');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2305', '2026-04-29'::date, '2026-05-01'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/29 уб-бөөрөлжүүт/ соносмол/ 15м3 элс, 50н шуудай цемент/ Э', 2100000, 2100000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2305');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2306', '2026-04-29'::date, '2026-05-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/29 уб-бөөрөлжүүт/ амжиргаа/ шаврын тэрэг, жижиг миксер / Э', 350000, 350000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2306');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2307', '2026-04-30'::date, '2026-05-01'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6004121' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Дорнын Мандах Төмөр ХХК') AND is_active ORDER BY id LIMIT 1)), 'Дорнын Мандах Төмөр ХХК', 'Баяраа', '04/30 шанд-оюутолгой / 600тонн ганбөмбөлөг', 57000000, 57000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2307');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2308', '2026-04-30'::date, '2026-05-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '04/30 уб-бөөрөлжүүт / портер/ хера-сэлбэг, домогт-шүд, оффис-ус ундаа/ Х', 432000, 432000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2308');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2309', '2026-04-30'::date, '2026-05-03'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5511836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Амарвишн ХХК') AND is_active ORDER BY id LIMIT 1)), 'Амарвишн ХХК', 'Баяраа', '04/30 уб-цагаан суварга/ 2.5тонн маяти', 2700000, 2700000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2309');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2310', '2026-04-30'::date, '2026-05-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6446876' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Мастер фүүдс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Мастер фүүдс ХХК', 'Баяраа', '04/02 УБ- ХАН АЛТАЙ', 21209908.82, 21209908.82, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2310');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2311', '2026-04-30'::date, '2026-06-14'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Тэргэл', 'PO: M1205  4/30  Энгүй ундрага -MMS   5 тн Маяти', 920000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2311');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2312', '2026-04-30'::date, '2026-06-14'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '04/30 налайх-тулга төнөг төхөөрөмж / амжиргаа', 200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2312');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2313', '2026-05-01'::date, '2026-05-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6625223' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Премиум Иннова ххк') AND is_active ORDER BY id LIMIT 1)), 'Премиум Иннова ххк', 'Нямдорж', '26/04 сарын дээж , хэв тээвэрлэлтийн төлбөрийн нэхэмжлэх', 9072000, 9072000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2313');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2314', '2026-05-01'::date, '2026-05-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/1 уб-бөөрөлжүүт/ портер/ transwest, hera, -тос, сэлбэг / Х', 432000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2314');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2315', '2026-05-04'::date, '2026-05-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/04 бөөрөлжүүт станц/ 25тонн кран түрээс / Э', 2500000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2315');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2332', '2026-05-04'::date, '2026-05-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5946239' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Алтгана ресурс ХХК.') AND is_active ORDER BY id LIMIT 1)), 'Алтгана ресурс ХХК.', 'Нямдорж', '04/16-нд УБ-аас Алтгана ресурс уурхайруу 1.5тоны машинаар тээвэрлэлт хийсэн төлбөр. 3230УАН', 480000, 480000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2332');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2316', '2026-05-04'::date, '2026-06-05'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5946239' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Алтгана ресурс ХХК.') AND is_active ORDER BY id LIMIT 1)), 'Алтгана ресурс ХХК.', 'Нямдорж', '05/01-нд УБ-аас Лүнрүү 8тонн пилта тээвэрлэсэн төлбөр. 0522УАТ', 8477272.73, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2316');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2317', '2026-05-04'::date, '2026-05-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7243425' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Max clean energy LLC') AND is_active ORDER BY id LIMIT 1)), 'Max clean energy LLC', 'Нямдорж', '05/01-нд УБ-аас Хан-алтай ресурс ХХК-ийн уурхайруу 1.5тоны машинаар тээвэрлэлт хийсэн төлбөр. 3220УАН', 2640000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2317');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2319', '2026-05-04'::date, '2026-05-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '8446881' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('max machinery industry LLC') AND is_active ORDER BY id LIMIT 1)), 'max machinery industry LLC', 'Нямдорж', '04/27-нд Налайх-д D8 буулгалт угсралтын өргөлт тээвэрлэлт хийсэн төлбөрийн нэхэмэлэх', 1200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2319');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2320', '2026-05-04'::date, '2026-05-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5528534' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Premium concrete LLC') AND is_active ORDER BY id LIMIT 1)), 'Premium concrete LLC', 'Нямдорж', '04/03-нд ,УБ - Оюутолгой , 5тн машин - ( төслийн ачаа ) 5824УБЯ', 18019600, 18019600, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2320');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2321', '2026-05-04'::date, '2026-05-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6266258' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Премиум Бьюлдинг Материалс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Премиум Бьюлдинг Материалс ХХК', 'Нямдорж', '04/01-нд ,Тец4 - 17үйлдвэр , 1.5тн машин - ( 90метр ремен ) 3230УАН', 3770000, 3770000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2321');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2322', '2026-05-04'::date, '2026-05-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5166829' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Юу Эм Эс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Юу Эм Эс ХХК', 'Нямдорж', '04/07-нд , Тец4 үйлдвэрээс - Налайх карер , 3тн крантай машин - ( Турба зөөж ) 3683УБВ', 1680000, 1680000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2322');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2323', '2026-05-04'::date, '2026-05-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '05/04 уб-хэнтий/ портер/ монгол транс гаалийн талбайгаас ачаа ачсан', 1000000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2323');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2324', '2026-05-05'::date, '2026-05-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/02-05/04 ны хооронд 3 өдрийн 6тонн маяти кран түрээс / Э', 3150000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2324');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2325', '2026-05-05'::date, '2026-05-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '04/01-ээс 04/30, өдрийг хүртэлхи ( Хот дотор ) хийгдсэн тээврийн төлбөрийн нэхэмжлэх.', 1858272.73, 1858272.73, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2325');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2326', '2026-05-05'::date, '2026-05-09'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/05 уб-бөөрөлжүүт/ жижиг тэрэг/ барло-сэлбэг, метал-шланк /Х', 250000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2326');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2327', '2026-05-06'::date, '2026-05-10'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '05/06 ти ай гааль-анун агуулах/ маяти/ 10н подон вакум уут', 350000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2327');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2328', '2026-05-06'::date, '2026-05-08'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5511836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Амарвишн ХХК') AND is_active ORDER BY id LIMIT 1)), 'Амарвишн ХХК', 'Баяраа', '05/06 уб-дархан / портер / модон хайрцагтай бараа', 800000, 800000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2328');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2329', '2026-05-06'::date, '2026-05-13'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/06 уб-бөөрөлжүүт/ портер/ 494н гутал-сансар /Rockrooster / Э', 432000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2329');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2330', '2026-05-06'::date, '2026-05-14'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/06 уб-бөөрөлжүүт/ портер 1645УБЧ / transwest-1п тос, aode-6п товуд /Х', 432000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2330');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2331', '2026-05-06'::date, '2026-05-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '05/05-нд Хан-алтай уурхайгаас - УБ-Налайхруу ( Zoomlion ZWL55G ) тээврийн төлбөрийн нэхэмжлэх.', 7200000, 7200000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2331');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2336', '2026-05-07'::date, '2026-06-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Тэргэл', 'PO:M1208 5/7 Энгүй ундрага - MMS   5 тн Маяти', 1960000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2336');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2334', '2026-05-07'::date, '2026-06-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/07 уб-бөөрөлжүүт/ маяти/ барло, 22 товчоо/ тос масло /Э', 1200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2334');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2335', '2026-05-07'::date, '2026-06-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '05/07 тулга төхөөрөмж-налайх/ зассан тоног төхөөрөмж буцаад хүргэсэн', 200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2335');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2333', '2026-05-07'::date, '2026-05-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '8446881' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('max machinery industry LLC') AND is_active ORDER BY id LIMIT 1)), 'max machinery industry LLC', 'Нямдорж', '05/06-нд Монгол транс гаалийн талбайгаас - ХАА агуулах Шалаанзаар тээвэрлэлт хийсэн төлбөрийн нэхэмэлэх', 870000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2333');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2337', '2026-05-08'::date, '2026-05-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7178801' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Говь Рэмөүт Сервисес ХХК') AND is_active ORDER BY id LIMIT 1)), 'Говь Рэмөүт Сервисес ХХК', 'Баяраа', '05/08 уб-завхан/ айраг кемп/ 5тонн', 5588000, 5588000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2337');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2338', '2026-05-08'::date, '2026-05-16'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/08 уб-бөөрөлжүүт/ портер/ aode-хроп ачих / Х', 432000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2338');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2339', '2026-05-09'::date, '2026-05-17'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/09 уб-бөөрөлжүүт/ маяти/ юнитра-с 4ш халаагч / Б', 1200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2339');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2340', '2026-05-10'::date, '2026-05-18'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '05/11 налайх- icmall / шланз', 812425, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2340');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2342', '2026-05-11'::date, '2026-05-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК 22 элс тээвэр 5-р сар 1-10', 36440043, 36440043, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2342');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2343', '2026-05-11'::date, '2026-05-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК Нүүрс ЭЦС хайрга тээвэр 4-р сар', 73681227, 73681227, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2343');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2344', '2026-05-11'::date, '2026-05-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК Нүүрс ЭЦС хайрга тээвэр 5-р сар 1-10', 182262288, 182262288, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2344');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2345', '2026-05-11'::date, '2026-05-13'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/11 бөөрөлжүүт-уб/ барло/ трайлер 1778УНТ тээвэр/ dozzer d8 / Э', 2800000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2345');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2346', '2026-05-11'::date, '2026-05-14'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/12 уб-бөөрөлжүүт/ маяти 0522УАТ/ трансвест, хера, аодэ/ Э, Х', 1200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2346');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2347', '2026-05-12'::date, '2026-05-13'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5080894' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Батцэн чотон ХХК') AND is_active ORDER BY id LIMIT 1)), 'Батцэн чотон ХХК', 'Баяраа', '05/12 АМГАЛАН ГААЛЬ-БИГ/ 5тонн маяти тээвэр', 450000, 450000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2347');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2348', '2026-05-13'::date, '2026-05-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/13 уб-бөөрөлжүүт/ портер 5660/ 2600ш хармаг жүүс/ Э', 532000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2348');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2349', '2026-05-13'::date, '2026-05-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/13 уб-бөөрөлжүүт/ 5тонн маяти 0525/ түмэн төмөрт-төмөр тор / Б', 1200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2349');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2350', '2026-05-08'::date, '2026-06-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Тэргэл', '05/8   WO:M1191  Энгүй ундрага -Хангай зах - MMS /  амжиргаа', 890000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2350');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2353', '2026-05-14'::date, '2026-05-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/14 уб-бөөрөлжүүт/ 2.5тонн маяти / 2ш чулуун ширээ / Ш', 800000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2353');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2354', '2026-05-08'::date, '2026-05-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Тэргэл', '05/8  Сонсголон Нисэх / 1.5 тонн задгай портер  / Кабел утас  /', 110000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2354');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2355', '2026-05-15'::date, '2026-06-29'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/15 уб-бөөрөлжүүт / маяти/ 2.25тонн цемент, 10ш төмөр тор  / Б', 900000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2355');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2356', '2026-05-16'::date, '2026-06-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/18 уб-бөөрөлжүүт/ амжиргаа/ модны суулгац -тэц3 / М', 350000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2356');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2357', '2026-05-18'::date, '2026-07-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/18 уб-бөөрөлжүүт/ 50тонн кран түрээс / Э', 4000000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2357');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2359', '2026-05-18'::date, '2026-05-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '89195123' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Таван Богд Фүүдс Пицца ХХК') AND is_active ORDER BY id LIMIT 1)), 'Таван Богд Фүүдс Пицца ХХК', 'Баяраа', '05/18 уб-замын үүд/ хөргүүртэй 5тонн', 5084000, 5084000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2359');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2361', '2026-05-19'::date, '2026-05-25'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6229654' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Апу дэйри ХХК') AND is_active ORDER BY id LIMIT 1)), 'Апу дэйри ХХК', 'Баяраа', '05/18 жаргалант-уб/ ачилтын машин тээвэр', 600000, 600000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2361');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2362', '2026-05-02'::date, '2026-05-03'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Нямдорж', 'Barlo 04/01- 04/30 хүртэлхи тээвэрийн төлбөр.', 103774000, 103774000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2362');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2363', '2026-05-19'::date, '2026-05-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7271289' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Maxmining LLC') AND is_active ORDER BY id LIMIT 1)), 'Maxmining LLC', 'Нямдорж', '05/17-нд УБ-Говь-алтай ( Хан-өрнөд майнинг ) - Крантай машин тээвэрийн төлбөр', 6363636.36, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2363');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2366', '2026-05-06'::date, '2026-05-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '05/06-нд ,UB to Оюутолгой толгой , Арматур тээвэрлэсэн Шалаанзны төлбөр. 4338УАС', 4736024, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2366');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2367', '2026-05-06'::date, '2026-05-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '05/06-нд ,UB to Оюутолгой толгой , 1.5тн porter тээврийн төлбөр. 2913УАМ', 2024479, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2367');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2368', '2026-05-19'::date, '2026-05-26'::date, (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Замын битум ХХК') AND is_active ORDER BY id LIMIT 1), 'Замын битум ХХК', 'Нямдорж', '05/17-нд Өмнөговиос - Зүүнбаян , 520экскаватор тээврийн төлбөр.', 37386364, 37386364, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2368');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2369', '2026-05-19'::date, '2026-05-19'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК 22 Элс хайрга тээвэр 5/13-18 тээврийн төлбөр', 72142887, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2369');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2370', '2026-05-19'::date, '2026-05-29'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '05/20 УБ-хэнтий/ 5тонн маяти 0525/ анунаас бараа материал/ буцахдаа 4н подон ачаа -налайх дээр буулгасан.', 2300000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2370');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2371', '2026-05-20'::date, '2026-05-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5411661' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Саммит ХХК') AND is_active ORDER BY id LIMIT 1)), 'Саммит ХХК', 'Одонтунгалаг', '05/08, УБ-Өмнөговь машин түрээс', 8951500, 8951500, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2371');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2373', '2026-05-20'::date, '2026-05-23'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5511836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Амарвишн ХХК') AND is_active ORDER BY id LIMIT 1)), 'Амарвишн ХХК', 'Баяраа', '05/20 ботаник-бааз/ портер', 120000, 120000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2373');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2374', '2026-05-21'::date, '2026-05-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК нүүрс ЭЦС хайрга тээврийн төлбөр 05/11-20', 208087520, 208087520, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2374');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2375', '2026-05-21'::date, '2026-05-23'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/21 уб-бөөрөлжүүт/ портер 5660/ барло-тос, хера-сэлбэг/ Э', 432000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2375');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2376', '2026-05-22'::date, '2026-05-24'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/22 уб-бөөрөлжүүт/ шланз 5370УБХ/ байгууламж од- бохирын кольцо, бохирын хоолой/ Э', 1755000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2376');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2377', '2026-05-22'::date, '2026-05-25'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/22 уб-бөөрөлжүүт/ портер 9006УЕМ  / нарантуул-2ш насос, 5н шараас-500кг ачаа/ Х', 432000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2377');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2379', '2026-05-22'::date, '2026-05-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5105935' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('АПУ ТРЕЙДИНГ ХХК') AND is_active ORDER BY id LIMIT 1)), 'АПУ ТРЕЙДИНГ ХХК', 'Одонтунгалаг', 'Түмэн Тээх ХХК 04/20-ээс 05/15 хоорондох тээврийн тооцоо', 57970698, 57970698, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2379');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2380', '2026-05-22'::date, '2026-05-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2077108' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Сүү ХК') AND is_active ORDER BY id LIMIT 1)), 'Сүү ХК', 'Нямдорж', '5/21-нд , Техник импорт гаалиас Сүү ХХК-руу портер тээврийн төлбөр', 360000, 360000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2380');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2381', '2026-05-25'::date, '2026-05-29'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6004121' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Дорнын Мандах Төмөр ХХК') AND is_active ORDER BY id LIMIT 1)), 'Дорнын Мандах Төмөр ХХК', 'Баяраа', '05/25 шанд-оюутолгой агуулах/ 400тонн ганбөмбөлөг', 38000000, 38000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2381');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2382', '2026-05-25'::date, '2026-05-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/24 уб-бөөрөлжүүт/ амбаартай бонго 4574УАР/ хүүхдийн баярын бэлэг/ Ш', 500000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2382');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2383', '2026-05-25'::date, '2026-05-28'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6229654' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Апу дэйри ХХК') AND is_active ORDER BY id LIMIT 1)), 'Апу дэйри ХХК', 'Баяраа', 'жижиг хөргөгч', 14550000, 14550000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2383');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2384', '2026-05-22'::date, '2026-05-29'::date, (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Замын битум ХХК') AND is_active ORDER BY id LIMIT 1), 'Замын битум ХХК', 'Нямдорж', '05/20-нд Улаанбаатараас - Зүүнбаян , ( 40+20контайнер ) тээврийн төлбөр.', 7500000, 7500000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2384');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2385', '2026-05-22'::date, '2026-05-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '8446881' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Max machinery industry LLC') AND is_active ORDER BY id LIMIT 1)), 'Max machinery industry LLC', 'Баяраа', '05/21 25тонн 2 ширхэг кран түрээс/ алтаргана уурхай', 29200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2385');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2386', '2026-05-26'::date, '2026-06-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6303102' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MURRAY MINING SERVICES LLC') AND is_active ORDER BY id LIMIT 1)), 'MURRAY MINING SERVICES LLC', 'Нямдорж', 'PO: M1191, 05/21,  Murray’s workshop to OT site  , 1.5 тн Портер', 1725000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2386');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2387', '2026-05-25'::date, '2026-05-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7243425' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Max clean energy LLC') AND is_active ORDER BY id LIMIT 1)), 'Max clean energy LLC', 'Нямдорж', '05/24-нд УБ-Говь-алтай ( Хан-алтай ресурс уурхай ) - 1.5тн машины тээвэрийн төлбөр', 2280000, 2280000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2387');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2388', '2026-05-26'::date, '2026-05-31'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2878593' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Юнисервис Солюшн ХХК') AND is_active ORDER BY id LIMIT 1)), 'Юнисервис Солюшн ХХК', 'Баяраа', '05/26 уб-ухаа худаг / цэвэрлэгээний материал/ 9.60 0133ЗАН', 2866600, 2866600, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2388');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2389', '2026-05-26'::date, '2026-06-01'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5573548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М Агро ХХК') AND is_active ORDER BY id LIMIT 1)), 'М Агро ХХК', 'Баяраа', '05/26 УБ-хэнтий / портер / цалуутаас-траст- вакуум машин хүргэлт/ траст-хэнтий- вакуум машин хүргэлт,/ хэнтий-тулга төхөөрөмж- вакуум машин хүргэлт.', 1200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2389');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2390', '2026-05-27'::date, '2026-06-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7178801' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Говь Рэмөүт Сервисес ХХК') AND is_active ORDER BY id LIMIT 1)), 'Говь Рэмөүт Сервисес ХХК', 'Баяраа', '05/27 уб-завхан/ айраг кемп/ 5тонн', 5588000, 5588000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2390');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2391', '2026-05-22'::date, '2026-06-02'::date, (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MAK Aranjin Zes CO.,ltd') AND is_active ORDER BY id LIMIT 1), 'MAK Aranjin Zes CO.,ltd', 'Нямдорж', '5/08-нд , УБ-аас ЭЦС-руу 40тн контайнер + Бохирын ёмкос тээврийн төлбөрийн нэхэмжлэх', 4800000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2391');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2392', '2026-05-27'::date, '2026-06-03'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/27 уб-бөөрөлжүүт/ 5тонн маяти 0525/ хера, метал, аоде/ Х', 1200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2392');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2393', '2026-05-28'::date, '2026-06-03'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/28 уб-бөөрөлжүүт/ портер 5660/ нисдэг машин- lv сэлбэг, хермес-галын хор, hhi-тос/ Э', 432000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2393');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2394', '2026-05-28'::date, '2026-06-04'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '05/28 налайх-зайсан/ шланз 7293УБУ', 812425, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2394');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2396', '2026-05-29'::date, '2026-05-29'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2077108' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Сүү ХК') AND is_active ORDER BY id LIMIT 1)), 'Сүү ХК', 'Нямдорж', '5/29-нд , Техник импорт гаалиас Сүү ХХК-руу Маяти тээврийн төлбөр', 180000, 180000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2396');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2397', '2026-05-29'::date, '2026-06-27'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '89195123' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Таван Богд Фүүдс Пицца ХХК') AND is_active ORDER BY id LIMIT 1)), 'Таван Богд Фүүдс Пицца ХХК', 'Баяраа', '05/29 УБ-Замын үүд/ 5тонн хөргүүртэй', 3175000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2397');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2398', '2026-05-29'::date, '2026-06-28'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/29 уб-бөөрөлжүүт/ портер/ шилэн хийц-шил, юнтира-зүлэг тэгшлэгч/ Э', 432000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2398');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2399', '2026-05-30'::date, '2026-06-28'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/30 уб-бөөрөлжүүт/ портер/ 1600ш модны суулгац, 100н айл-шланк /М', 432000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2399');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2400', '2026-05-29'::date, '2026-06-29'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/29 уб-бөөрөлжүүт/ маяти 0525/ HHI, HERA, AODE-тос / Х', 1200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2400');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2401', '2026-05-31'::date, '2026-06-29'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/31 уб-бөөрөлжүүт/ маяти 0525/ түмэн төмөрт, барилга complex /  Б', 1200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2401');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2402', '2026-05-31'::date, '2026-06-29'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/31 уб-бөөрөлжүүт/ маяти 0858/ Мандуул мөнх төмөр хийц -10тонн / Э', 1200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2402');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2403', '2026-05-30'::date, '2026-06-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/30 уб-бөөрөлжүүт/ амбаартай бонго 5480УНТ / яармаг-үрслүүлсэн цэцэг/ М', 600000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2403');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2404', '2026-05-29'::date, '2026-06-30'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '05/29 налайх-нисэх/ шланз 2090УЕХ', 812425, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2404');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2405', '2026-05-31'::date, '2026-06-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6446876' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Мастер фүүдс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Мастер фүүдс ХХК', 'Баяраа', '05/01 УБ-ЛҮН', 22041817, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2405');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2406', '2026-05-30'::date, '2026-06-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '05/30-06/01 6тонн крантай машин түрээс  6095УНЛ/ худгийн насос дээр ажилласан, машинаас ачаа буулгасан. /Э', 3150000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2406');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2407', '2026-05-30'::date, '2026-06-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '5/26-нд ,UB to Оюутолгой толгой , Арматур тээвэрлэсэн Шалаанзны төлбөр. 4338УАС', 4736024, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2407');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2408', '2026-05-30'::date, '2026-06-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2090007' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('М-Си-Эс-Интернэйшнл ХХК...') AND is_active ORDER BY id LIMIT 1)), 'М-Си-Эс-Интернэйшнл ХХК...', 'Нямдорж', '5/28-нд ,UB to Оюутолгой толгой , Арматур тээвэрлэсэн Шалаанзны төлбөр. 5370УБХ', 4736024, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2408');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2410', '2026-06-02'::date, '2026-06-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '05/27-нд Хан-алтай уурхайгаас - Улаанбаатар ( MSM-рүү Генератор ) шалаанз тээврийн төлбөрийн нэхэмжлэх. 6116ГАЕ', 5000000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2410');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2411', '2026-06-02'::date, '2026-06-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '06/02-нд Улаанбаатараас - Хан-алтай уурхайруу 2.5тоны машины тээврийн төлбөрийн нэхэмжлэх. 3170УББ', 4340727.27, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2411');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2412', '2026-06-02'::date, '2026-06-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК нүүрс ЭЦС хайрга тээврийн төлбөр 05/21-31', 103485518, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2412');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2413', '2026-06-02'::date, '2026-06-02'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Отгонбаатар', 'МАК 22 Элс хайрга тээвэр 5/19-31 тээврийн төлбөр', 25855601, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2413');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2414', '2026-06-02'::date, '2026-06-05'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5105935' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('АПУ ТРЕЙДИНГ ХХК') AND is_active ORDER BY id LIMIT 1)), 'АПУ ТРЕЙДИНГ ХХК', 'Одонтунгалаг', 'Түмэн Тээх ХХК 05/16-05/31 хоорондох тээврийн тооцоо', 37403151, 37403151, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2414');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2415', '2026-06-02'::date, '2026-06-05'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5540836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Тера-Экспресс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Тера-Экспресс ХХК', 'Нямдорж', 'Barlo 05/01- 05/28 хүртэлхи тээврийн төлбөр.', 76095201, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2415');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2416', '2026-06-03'::date, '2026-06-10'::date, (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Замын битум ХХК') AND is_active ORDER BY id LIMIT 1), 'Замын битум ХХК', 'Нямдорж', 'Чулуу бутлуур / 48тонн /', 58750000, 58750000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2416');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2417', '2026-06-03'::date, '2026-06-11'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '06/03 уб-бөөрөлжүүт/ жижиг тэрэг/ шил, ажлын хувцас / Э', 250000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2417');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2418', '2026-06-03'::date, '2026-06-03'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5182018' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ULE LLC.') AND is_active ORDER BY id LIMIT 1)), 'ULE LLC.', 'Нямдорж', '5/22 -нд, ULE-ээс Амгалан-руу - Индүү тээвэрлэсэн төлбөр', 1818182, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2418');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2419', '2026-06-04'::date, '2026-06-25'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '06/04 Налайх-100н айл/ шланз', 812425, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2419');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2420', '2026-06-04'::date, '2026-06-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5166829' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('UMS LLC') AND is_active ORDER BY id LIMIT 1)), 'UMS LLC', 'Нямдорж', '5/1-нд MSM to Налайх UMS-рүү 4тн нэмэлт тээвэрлэсэн.', 300000, 300000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2420');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2421', '2026-06-04'::date, '2026-06-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6266258' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Премиум Бьюлдинг Материалс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Премиум Бьюлдинг Материалс ХХК', 'Нямдорж', '5/4-нд Төв үйлдвэрээс 17 үйлдвэрлүү квадрат төмөр тээвэрлэсэн.', 130000, 130000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2421');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2422', '2026-06-04'::date, '2026-06-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5528534' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Premium concrete LLC') AND is_active ORDER BY id LIMIT 1)), 'Premium concrete LLC', 'Нямдорж', '05/08-нд ,УБ - Оюутолгой , 5тн машин - ( төслийн ачаа ) 5824УБЯ', 19231091, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2422');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2423', '2026-06-05'::date, '2026-06-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '06/04 уб-бөөрөлжүүт/ портер/ хера, метал, автоарт / Х', 432000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2423');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2424', '2026-06-05'::date, '2026-06-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '06/04 уб-бөөрөлжүүт/ портер/ Гурвалжин, барло, нисдэг машин / Б', 432000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2424');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2425', '2026-06-04'::date, '2026-06-05'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6047637' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('КЕМ ТЕК ХХК') AND is_active ORDER BY id LIMIT 1)), 'КЕМ ТЕК ХХК', 'Нямдорж', '06/03-нд , УБ - Дархан - УБ шалаанз тээвэрийн төлбөр.', 3000000, 3000000, 'paid', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2425');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2426', '2026-06-04'::date, '2026-06-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6625223' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Премиум Иннова ххк') AND is_active ORDER BY id LIMIT 1)), 'Премиум Иннова ххк', 'Нямдорж', '26/05 сарын дээж , хэв тээвэрлэлтийн төлбөрийн нэхэмжлэх', 9468000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2426');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2427', '2026-06-05'::date, '2026-06-21'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7178801' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Говь Рэмөүт Сервисес ХХК') AND is_active ORDER BY id LIMIT 1)), 'Говь Рэмөүт Сервисес ХХК', 'Баяраа', '06/05 УБ-Завхан айраг / 5тонн хөргүүртэй', 5588000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2427');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2428', '2026-06-05'::date, '2026-06-22'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '06/05 уб-бөөрөлжүүт/ портер 5660/ 3600ш жүүс-машид хүнс/ Э', 432000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2428');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2429', '2026-06-04'::date, '2026-06-23'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '06/04 УБ-Бөөрөлжүүт/  маяти / gem design-самбар / Э', 1200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2429');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2430', '2026-06-05'::date, '2026-06-24'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '06/05 уб-бөөрөлжүүт/ крантай маяти/ сууц тээвэр/ Б', 910000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2430');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2431', '2026-06-05'::date, '2026-06-24'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '06/05 уб-бөөрөлжүүт/ портер / газ, газан халаагуур/ Ш', 432000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2431');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2432', '2026-06-05'::date, '2026-06-24'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '06/05 УБ-Бөөрөлжүүт/ портер / сэлбэг , шүршдэг хар будаг / Х', 432000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2432');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2433', '2026-06-05'::date, '2026-06-10'::date, (SELECT id FROM partners WHERE lower(btrim(name)) = lower('JENMOUR NEW ENERGY LLC') AND is_active ORDER BY id LIMIT 1), 'JENMOUR NEW ENERGY LLC', 'Нямдорж', '5/3-нд , УБ-ХАА уурхай тээврийн төлбөр. 3230УАН', 5037000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2433');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2434', '2026-06-05'::date, '2026-06-10'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7243425' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Max clean energy LLC') AND is_active ORDER BY id LIMIT 1)), 'Max clean energy LLC', 'Нямдорж', '5/30-нд , УБ - ГОА , Төгрөг сумруу 5тн машины тээврийн төлбөр. 1352УБӨ', 5181818, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2434');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2435', '2026-06-05'::date, '2026-06-10'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '5/23-нд , Хан-алтай уурхайгаас - Алтаган ресурс шалаанз тээврийн төлбөр. 3553ГАЕ', 5000000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2435');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2436', '2026-06-05'::date, '2026-06-08'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2747081' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ELECTROCOMPLECT LLC') AND is_active ORDER BY id LIMIT 1)), 'ELECTROCOMPLECT LLC', 'Баяраа', '06/05 8211УНВ сонсголон-амгалан', 270000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2436');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2437', '2026-06-06'::date, '2026-06-08'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6229654' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Апу дэйри ХХК') AND is_active ORDER BY id LIMIT 1)), 'Апу дэйри ХХК', 'Баяраа', '06/06 крантай машин/ 52ын даваа-уб/сүүний машин тээвэр', 1500000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2437');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2438', '2026-06-08'::date, '2026-06-09'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5511836' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Амарвишн ХХК') AND is_active ORDER BY id LIMIT 1)), 'Амарвишн ХХК', 'Баяраа', '06/08 ботаник-5р сургууль/ портер', 120000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2438');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2441', '2026-06-05'::date, '2026-06-20'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6413811' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-алтай ресурс ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-алтай ресурс ХХК', 'Нямдорж', '05/01-ээс 05/30, өдрийг хүртэлхи ( Хот дотор ) хийгдсэн тээврийн төлбөрийн нэхэмжлэх.', 9269727.27, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2441');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2443', '2026-06-08'::date, '2026-06-10'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2810301' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Арж капитал ХХК') AND is_active ORDER BY id LIMIT 1)), 'Арж капитал ХХК', 'Нямдорж', '26/05 сард  ( 419.350кг эрдэс ) тээвэрлэсэн төлбөрийн нэхэмжлэх', 45853700, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2443');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2444', '2026-06-08'::date, '2026-06-10'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5354013' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('МАКС РӨҮД ХХК') AND is_active ORDER BY id LIMIT 1)), 'МАКС РӨҮД ХХК', 'Нямдорж', '26/05 сард  ( 622.300кг эрдэс - нийт 24рейс  ) тээвэрлэсэн төлбөрийн нэхэмжлэх', 43200000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2444');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2445', '2026-06-09'::date, '2026-06-11'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '06/09 бөөрөлжүүт/ 1794ММВ 30см шанагтай унагалдай/ кабелийн нүх ухах/ Э', 1600000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2445');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2446', '2026-06-09'::date, '2026-06-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5644984' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Соёолон интернэшнл ХХК') AND is_active ORDER BY id LIMIT 1)), 'Соёолон интернэшнл ХХК', 'Баяраа', '06/09 шувуу фафрик-өлзийт / дайрга үйлдвэр / шланз', 4500000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2446');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2447', '2026-06-09'::date, '2026-06-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2695456' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('СББ Трейд ХХК') AND is_active ORDER BY id LIMIT 1)), 'СББ Трейд ХХК', 'Одонтунгалаг', 'Түрээсийн төлбөр 2026/06/02 4машин', 12600000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2447');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2448', '2026-06-09'::date, '2026-06-13'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '06/09 уб-бөөрөлжүүт/ трайлер / cat 3.36 ekske/ Б', 2800000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2448');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2449', '2026-06-09'::date, '2026-06-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6846548' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Юрика ХХК') AND is_active ORDER BY id LIMIT 1)), 'Юрика ХХК', 'Баяраа', '6/9/ ТИ Ай гааль-говийн зам/ 3тонн крантай машин', 500000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2449');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2450', '2026-06-09'::date, '2026-06-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '2077108' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Сүү ХК') AND is_active ORDER BY id LIMIT 1)), 'Сүү ХК', 'Нямдорж', '06/09-нд , Progress truns гаалиас Сүү ХХК-руу 5тоны машин тээврийн төлбөр', 500000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2450');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2451', '2026-06-03'::date, '2026-06-12'::date, (SELECT id FROM partners WHERE lower(btrim(name)) = lower('MAX POWER LLC') AND is_active ORDER BY id LIMIT 1), 'MAX POWER LLC', 'Нямдорж', '06/03-нд , Улаанбаатараас - ГОА Төгрөг сумруу 1.5тоны машин тээврийн төлбөр', 3360000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2451');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2452', '2026-05-26'::date, '2026-06-12'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '6533795' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Хан-өрнөд майнинг ХХК') AND is_active ORDER BY id LIMIT 1)), 'Хан-өрнөд майнинг ХХК', 'Нямдорж', '5/26-нд , Цайз 16 дээр Хөшөө ачиж өгсөн краны төлбөр.', 363636, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2452');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2453', '2026-06-09'::date, '2026-06-13'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '7004265' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('ECO Drywall Inc') AND is_active ORDER BY id LIMIT 1)), 'ECO Drywall Inc', 'Баяраа', '06/09 налайх-22товчоо / шланз', 812425, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2453');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2455', '2026-06-10'::date, '2026-06-14'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '06/10 уб-бөөрөлжүүт/ 2.5тонн маяти/ баянзүрх товчоо-кабел/ Э', 800000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2455');

INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)
SELECT 'INV2456', '2026-06-10'::date, '2026-06-15'::date, COALESCE((SELECT id FROM partners WHERE btrim(register) = '5482046' AND is_active ORDER BY id LIMIT 1), (SELECT id FROM partners WHERE lower(btrim(name)) = lower('Цэцэнс майнинг энд энержи ХХК') AND is_active ORDER BY id LIMIT 1)), 'Цэцэнс майнинг энд энержи ХХК', 'Баяраа', '06/10 6тонн крантай маяти түрээс', 2100000, 0, 'open', 'MNT'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = 'INV2456');

NOTIFY pgrst, 'reload schema';
