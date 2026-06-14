-- ============================================================
-- cash_entries — нэмэлт талбарууд (Кассын орлого/зарлагын ордер загвар)
-- ============================================================
-- Хуучин системийн КО/КЗ ордерын талбаруудтай тааруулна. Бүгд nullable.
-- node scripts/apply-sql.mjs scripts/cash-entries-extra-cols.sql
-- ============================================================

ALTER TABLE cash_entries
  ADD COLUMN IF NOT EXISTS payer          TEXT,   -- Мөнгө тушаагч (орлого) / хүлээн авагч (зарлага)
  ADD COLUMN IF NOT EXISTS contract       TEXT,   -- Гэрээ
  ADD COLUMN IF NOT EXISTS project        TEXT,   -- Төслийн үйл ажиллагаа
  ADD COLUMN IF NOT EXISTS description_en TEXT;   -- Гүйлгээний утга /ENG/
