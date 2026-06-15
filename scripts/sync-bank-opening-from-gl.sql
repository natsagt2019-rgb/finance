-- ============================================================
-- account_balances (банкны жилийн эхний үлдэгдэл) ← GL-д тааруулах
-- ============================================================
-- account_balances нь гараар хийгддэг снапшот тул GL-ээс хуучирч зөрдөг
-- (жишээ нь MB=0 атал GL дээр 928,234). Энэ нь bank-summary (Мөнгөн
-- хөрөнгийн нэгтгэл)-ийн эхний үлдэгдлийг буруу харуулдаг.
-- Энэ скрипт банкны данс (GM/TT/MB) -ийн эхний үлдэгдлийг GL-ийн
-- хуримтлагдсан дансны үлдэгдэлд (journal_entries) тааруулна.
-- TR (Түмэн Ресурс) тусдаа компани тул энэ журналд алга — хэвээр үлдэнэ.
--   node scripts/apply-sql.mjs scripts/sync-bank-opening-from-gl.sql
-- ============================================================

UPDATE account_balances ab
SET opening_balance = ROUND(gl.opening, 2)
FROM trial_balance_range('2026-01-01', '2026-01-01') gl
WHERE ab.year = 2026
  AND (
       (ab.account_id = 'GM' AND gl.code = '110101')  -- Голомт
    OR (ab.account_id = 'TT' AND gl.code = '110102')  -- ХХБ/ТДБ
    OR (ab.account_id = 'MB' AND gl.code = '110103')  -- М банк
  );
