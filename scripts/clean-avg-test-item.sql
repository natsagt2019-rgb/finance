-- ============================================================
-- AVG тест барааг (item 1005 "ААА дундаж тест") бүрэн цэвэрлэх
-- ============================================================
-- Энэ тест бараа нь БМ тайлан ↔ гүйлгээ балансын 32,500₮ зөрүүг бүхэлд нь
-- үүсгэж байна: 2 receipt (AVG-1/AVG-2 = 30,000) журналгүй (GL-д ороогүй),
-- issue нь дундаж өртгөөр (FIFO-той зөрүүтэй). Item + хөдөлгөөн + журналыг
-- бүрэн устгана. Дараа нь subledger ба GL яг тулна.
--   node scripts/apply-sql.mjs scripts/clean-avg-test-item.sql
-- ============================================================

-- 1) Холбоотой журналын GL тусгал ба мөрүүд (inv_moves устгахаас өмнө).
DELETE FROM journal_entries
WHERE journal_id IN (
  SELECT journal_id FROM inv_moves WHERE item_id = 1005 AND journal_id IS NOT NULL
);
DELETE FROM journal_lines
WHERE journal_id IN (
  SELECT journal_id FROM inv_moves WHERE item_id = 1005 AND journal_id IS NOT NULL
);
DELETE FROM journals
WHERE id IN (
  SELECT journal_id FROM inv_moves WHERE item_id = 1005 AND journal_id IS NOT NULL
);

-- 2) Хөдөлгөөн ба бараа.
DELETE FROM inv_moves WHERE item_id = 1005;
DELETE FROM inv_items WHERE id = 1005;
