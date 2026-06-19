-- ============================================================
-- Хуучин банкуудыг динамик bank_accounts бүртгэлд бодит дугаараар нэмэх
-- + эхний үлдэгдлийг (account_balances) богино кодоос дугаар руу re-key
-- ============================================================
-- Динамик руу шилжсэний дараа Голомт/ХХБ/М банк/Түмэн Ресурс нэгтгэлээс
-- алга болсон (богино кодоор GM/TT/MB/TR байсан). Эдгээрийг бодит дансны
-- дугаараар бүртгэж, эхний үлдэгдлийг тэр дугаар руу шилжүүлнэ.
-- Шинэ дансны төлөвлөгөө: 110200 = Харилцах дансны мөнгө (MNT).
--   node scripts/apply-sql.mjs scripts/register-legacy-banks.sql
-- ============================================================

-- 1) Хуучин MNT банкуудыг бүртгэх (давхардвал алгасна).
INSERT INTO bank_accounts (account_no, bank_type, label, gl_code, currency, company, sort, is_active)
SELECT v.account_no, v.bank_type, v.label, v.gl_code, v.currency, v.company, v.sort, true
FROM (VALUES
  ('1175156757', 'golomt', 'Голомт банк — 1175156757', '110200', 'MNT', 'Түмэн Тээх',  1),
  ('411096635',  'tdb',    'ХХБ / ТДБ — 411096635',    '110200', 'MNT', 'Түмэн Тээх',  2),
  ('9006906192', 'mbank',  'М банк — 9006906192',       '110200', 'MNT', 'Түмэн Тээх',  3),
  ('435013050',  'tdb',    'ТДБ — 435013050',           '110200', 'MNT', 'Түмэн Ресурс', 4)
) AS v(account_no, bank_type, label, gl_code, currency, company, sort)
WHERE NOT EXISTS (
  SELECT 1 FROM bank_accounts b WHERE b.account_no = v.account_no
);

-- 2) Одоо бүртгэлтэй шинэ дансуудад компани оноох (хоосон бол → Түмэн Тээх).
--    Буруу бол Тохиргоо → Банкны данс дээр засна.
UPDATE bank_accounts SET company = 'Түмэн Тээх'
WHERE account_no IN ('5000240908', '411099344') AND company IS NULL;

-- 3) Эхний үлдэгдлийг богино кодоос дансны дугаар руу re-key.
UPDATE account_balances SET account_id = '1175156757' WHERE account_id = 'GM';
UPDATE account_balances SET account_id = '411096635'  WHERE account_id = 'TT';
UPDATE account_balances SET account_id = '9006906192' WHERE account_id = 'MB';
UPDATE account_balances SET account_id = '435013050'  WHERE account_id = 'TR';
