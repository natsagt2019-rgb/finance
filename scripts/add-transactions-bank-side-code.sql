-- ============================================================
-- transactions — debit_code / credit_code багана нэмэх
-- ============================================================
-- Эдгээр багана нь канон schema.sql-д ороогүй (анх journal_entries-д л
-- байсан). Хуучин Supabase project дээр гар ALTER-ээр нэмсэн тул шинэ
-- project-д дутуу үлдсэн → хуулга цэгцлэгчийн «Батлах» INSERT амжилтгүй
-- болдог (commitImport нь эдгээр баганад бичдэг).
--   node scripts/apply-sql.mjs scripts/add-transactions-bank-side-code.sql
-- ============================================================

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS debit_code  TEXT,   -- банкны талын Дт (орлого)
  ADD COLUMN IF NOT EXISTS credit_code TEXT;   -- банкны талын Кт (зарлага)

-- Холболт хийгээгүй гүйлгээ хайхад (statements хуудас) хурдан болгох индекс.
CREATE INDEX IF NOT EXISTS idx_transactions_debit_code  ON transactions (debit_code);
CREATE INDEX IF NOT EXISTS idx_transactions_credit_code ON transactions (credit_code);
