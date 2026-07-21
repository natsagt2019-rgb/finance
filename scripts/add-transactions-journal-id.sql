-- ============================================================
-- transactions — journal_id багана нэмэх (гараар журналд холбоход)
-- ============================================================
-- Гараар журнал үүсгэхэд банкны гүйлгээг СОНГОЖ холбоно. Холбогдсон гүйлгээ
-- энэ баганаар тэмдэглэгдэж, "Журналд бичих" (postBankJournal) түүнийг
-- алгасна → давхар бичигдэхгүй, дэд бүртгэл ↔ гүйлгээ баланс зөрөхгүй.
--   node scripts/apply-sql.mjs scripts/add-transactions-journal-id.sql
-- ============================================================

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS journal_id BIGINT;  -- гараар холбосон журнал (FK-гүй, softlink)

CREATE INDEX IF NOT EXISTS idx_transactions_journal_id ON transactions (journal_id);
