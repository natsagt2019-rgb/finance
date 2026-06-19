-- ============================================================
-- account_balances — орфан мөр цэвэрлэх
-- ============================================================
-- Тохиргооноос устгасан банкны эхний үлдэгдэл account_balances-д үлддэг
-- (bank_accounts-д таарах account_no байхгүй). Эдгээр нь хаана ч харагдахгүй
-- тул цэвэрлэнэ. (Банкийг дахин нэмбэл үлдэгдлийг шинээр оруулна.)
--   node scripts/apply-sql.mjs scripts/clean-orphan-balances.sql
-- ============================================================

DELETE FROM account_balances ab
WHERE NOT EXISTS (
  SELECT 1 FROM bank_accounts b WHERE b.account_no = ab.account_id
);
