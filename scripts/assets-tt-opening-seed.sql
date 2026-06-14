-- ============================================================
-- Үндсэн хөрөнгийн ЭХНИЙ ҮЛДЭГДЭЛ — "Түмэн Тээх" ХХК (2026-01-01)
-- ============================================================
-- assets-schema.sql дараа ажиллуулна. Эх сурвалж: TT_CashFlow_2026_Journal
-- → «Үндсэн хөрөнгө» шийт. 22 хөрөнгө (#19 Dell нь 2026 нэмэгдэл тул ороогүй).
-- Эд хариуцагч (responsible): HR системийн картаас (бүгд Отгонбаатар).
-- Мөр бүр идемпотент (нэр+компаниар шалгана) — дахин ажиллуулж болно.
-- ============================================================

-- 1) TT-ийн ангилал (дансаар)
INSERT INTO asset_categories (code, name, useful_life_years, account_code, accum_account_code)
SELECT '200501','Тавилга, эд хогшил',10,'200501','201501'
WHERE NOT EXISTS (SELECT 1 FROM asset_categories c WHERE c.code='200501');
INSERT INTO asset_categories (code, name, useful_life_years, account_code, accum_account_code)
SELECT '200601','Компьютер, бусад хэрэгсэл',3,'200601','201601'
WHERE NOT EXISTS (SELECT 1 FROM asset_categories c WHERE c.code='200601');
INSERT INTO asset_categories (code, name, useful_life_years, account_code, accum_account_code)
SELECT '200701','Бусад үндсэн хөрөнгө',10,'200701','201701'
WHERE NOT EXISTS (SELECT 1 FROM asset_categories c WHERE c.code='200701');
INSERT INTO asset_categories (code, name, useful_life_years, account_code, accum_account_code)
SELECT '201001','Програм хангамж',5,'201001',NULL
WHERE NOT EXISTS (SELECT 1 FROM asset_categories c WHERE c.code='201001');

-- 2) Хөрөнгийн карт (opening_date=2025-12-31, responsible=эд хариуцагч)
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Сандал захирал','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200501' LIMIT 1),'2023-12-20',219461.87,0,'2025-12-31',21946,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Сандал захирал' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Сандал Оогий','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200501' LIMIT 1),'2023-12-20',182601.35,0,'2025-12-31',18260,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Сандал Оогий' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Ширээ сургалт','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200501' LIMIT 1),'2023-12-20',214358.11,0,'2025-12-31',21436,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Ширээ сургалт' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Ширээ Лхагва','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200501' LIMIT 1),'2023-12-20',720197.88,0,'2025-12-31',72020,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Ширээ Лхагва' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Ширээ захирал','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200501' LIMIT 1),'2023-12-20',1013380.79,0,'2025-12-31',101338,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Ширээ захирал' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT '8ш сандал','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200501' LIMIT 1),'2024-02-29',1320000,0,'2025-12-31',132000,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='8ш сандал' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Ажлын ширээ — 4-н хүний 3ш + 2-н хүний 1ш (4ш нийт)','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200501' LIMIT 1),'2024-02-29',4152000,0,'2025-12-31',415200,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Ажлын ширээ — 4-н хүний 3ш + 2-н хүний 1ш (4ш нийт)' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Шүүгээ шкаф','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200501' LIMIT 1),'2024-02-29',1078000,0,'2025-12-31',107800,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Шүүгээ шкаф' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Ширээ карго','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200501' LIMIT 1),'2024-11-06',472400,0,'2025-12-31',47240,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Ширээ карго' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Сургалтын сандал (14ш)','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200501' LIMIT 1),'2025-04-29',1792000,0,'2025-12-31',0,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Сургалтын сандал (14ш)' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT '2 хаалгатай шилэн нүүртэй шкаф (4ш)','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200501' LIMIT 1),'2025-08-15',2170000,0,'2025-12-31',0,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='2 хаалгатай шилэн нүүртэй шкаф (4ш)' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Шүүгээ','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200501' LIMIT 1),'2025-12-16',360000,0,'2025-12-31',0,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Шүүгээ' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Ноутбүүк компьютер №1','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200601' LIMIT 1),'2023-08-01',2200000,0,'2025-12-31',733333,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Ноутбүүк компьютер №1' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Ноутбүүк компьютер №2','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200601' LIMIT 1),'2023-08-01',2200000,0,'2025-12-31',733334,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Ноутбүүк компьютер №2' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Компьютер I5 13үе','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200601' LIMIT 1),'2024-04-06',2200000,0,'2025-12-31',733333,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Компьютер I5 13үе' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Dell 3530 I7 Gen13 Notebook','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200601' LIMIT 1),'2025-07-30',2200000,0,'2025-12-31',0,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Dell 3530 I7 Gen13 Notebook' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Dell I-13 16GB 512GB SSD','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200601' LIMIT 1),'2025-12-09',1990000,0,'2025-12-31',0,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Dell I-13 16GB 512GB SSD' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Dell Inspiron 3530 I7 Gen13','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200601' LIMIT 1),'2025-12-17',1990000,0,'2025-12-31',0,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Dell Inspiron 3530 I7 Gen13' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Тоос сорогч','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200701' LIMIT 1),'2024-01-03',469990,0,'2025-12-31',46999,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Тоос сорогч' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Печь (жижиг зуух)','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='200701' LIMIT 1),'2025-06-18',160500,0,'2025-12-31',0,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Печь (жижиг зуух)' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Smart ERP Pro — лиценз 1 (12512060)','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='201001' LIMIT 1),'2025-12-18',3102000,0,'2025-12-31',0,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Smart ERP Pro — лиценз 1 (12512060)' AND a.company='ТҮМЭН ТЭЭХ');
INSERT INTO assets (name, company, category_id, acquired_date, cost, salvage_value, opening_date, opening_accum_depreciation, responsible, status)
SELECT 'Smart ERP Pro — лиценз 2 (12512061)','ТҮМЭН ТЭЭХ',(SELECT id FROM asset_categories WHERE code='201001' LIMIT 1),'2025-12-18',1663200,0,'2025-12-31',0,'Отгонбаатар','active'
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.name='Smart ERP Pro — лиценз 2 (12512061)' AND a.company='ТҮМЭН ТЭЭХ');
