-- ============================================================
-- inv_moves.journal_id backfill — хөдөлгөөн ↔ журнал холбоос сэргээх
-- ============================================================
-- Үндсэн addMove урсгал journal_id-г зөв холбодог. Гэвч тест өгөгдөл (TST-*)
-- нь хөдөлгөөн ба журналыг тусад нь үүсгэсэн тул холбоос дутуу. doc_no =
-- journals.reference (source='inventory') тулгуураар 1:1 (давхцалгүй) тааруулна.
-- Ингэснээр хөдөлгөөнийг устгахад холбоотой журнал автоматаар устна.
-- Давхцсан doc_no (ж: дотоод шилжүүлэг 2 мөр, хөрвүүлэлт) ба тусгай урсгал
-- (ҮХ/хөрвүүлэлт — журнал нь assets/inv_conversions-д холбоотой) хамаарахгүй.
--   node scripts/apply-sql.mjs scripts/backfill-inv-move-journal-id.sql
-- ============================================================

WITH uniq_j AS (
  SELECT reference, MIN(id) AS jid
  FROM journals
  WHERE source = 'inventory' AND reference IS NOT NULL AND reference <> ''
  GROUP BY reference
  HAVING count(*) = 1
),
uniq_m AS (
  SELECT doc_no
  FROM inv_moves
  WHERE journal_id IS NULL AND doc_no IS NOT NULL AND doc_no <> ''
  GROUP BY doc_no
  HAVING count(*) = 1
)
UPDATE inv_moves m
SET journal_id = uj.jid
FROM uniq_j uj
WHERE m.doc_no = uj.reference
  AND m.journal_id IS NULL
  AND m.doc_no IN (SELECT doc_no FROM uniq_m);
