-- ============================================================
-- Үндсэн хөрөнгө — ХАСАЛТ / БОРЛУУЛАЛТЫН багана (идемпотент migration)
-- ============================================================
-- assets хүснэгтэд хасалт/борлуулалтын дэлгэрэнгүй + журналын холбоос нэмнэ.
--   node scripts/apply-sql.mjs scripts/assets-disposal-schema.sql
-- ============================================================

ALTER TABLE assets ADD COLUMN IF NOT EXISTS disposal_type TEXT
  CHECK (disposal_type IN ('writeoff', 'sale'));               -- хасалт | борлуулалт
ALTER TABLE assets ADD COLUMN IF NOT EXISTS disposal_proceeds NUMERIC(18, 2) NOT NULL DEFAULT 0; -- борлуулах үнэ (НӨАТгүй)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS disposal_vat NUMERIC(18, 2) NOT NULL DEFAULT 0;      -- НӨАТ-ын дүн
ALTER TABLE assets ADD COLUMN IF NOT EXISTS disposal_journal_id BIGINT
  REFERENCES journals(id) ON DELETE SET NULL;                  -- холбогдох GL журнал (буцаахад ашиглана)
