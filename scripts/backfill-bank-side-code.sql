-- ============================================================
-- transactions — банкны талын GL код авто backfill
-- ============================================================
-- Банкны гүйлгээний нэг тал нь үргэлж тухайн харилцах дансны өөрийн код:
--   орлого → debit_code = банк,  зарлага → credit_code = банк.
-- Энэ тал тогтмол тул гараар кодлох шаардлагагүй — энд хоосон үлдсэнг нөхнө.
-- Нөгөө тал (харьцсан данс) хэвээр (нягтлан кодлоно).
-- TT→110102, GM→110101, MB→110103, TTU→110105, TTE→110106. (TR-д гүйлгээгүй.)
--   node scripts/apply-sql.mjs scripts/backfill-bank-side-code.sql
-- ============================================================

-- Орлого: Дт = банкны данс
UPDATE transactions
SET debit_code = CASE account_id
  WHEN 'TT' THEN '110102' WHEN 'GM' THEN '110101' WHEN 'MB' THEN '110103'
  WHEN 'TTU' THEN '110105' WHEN 'TTE' THEN '110106' END
WHERE account_id IN ('TT', 'GM', 'MB', 'TTU', 'TTE')
  AND income IS NOT NULL AND income <> 0
  AND (debit_code IS NULL OR debit_code = '');

-- Зарлага: Кт = банкны данс
UPDATE transactions
SET credit_code = CASE account_id
  WHEN 'TT' THEN '110102' WHEN 'GM' THEN '110101' WHEN 'MB' THEN '110103'
  WHEN 'TTU' THEN '110105' WHEN 'TTE' THEN '110106' END
WHERE account_id IN ('TT', 'GM', 'MB', 'TTU', 'TTE')
  AND expense IS NOT NULL AND expense <> 0
  AND (credit_code IS NULL OR credit_code = '');
