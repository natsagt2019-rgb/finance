-- ============================================================
-- Үндсэн хөрөнгө — ХУДАЛДАН АВАЛТЫН журналын холбоос (идемпотент migration)
-- ============================================================
--   node scripts/apply-sql.mjs scripts/assets-acquisition-schema.sql
-- ============================================================

ALTER TABLE assets ADD COLUMN IF NOT EXISTS acquisition_vat NUMERIC(18, 2) NOT NULL DEFAULT 0; -- худалдан авалтын НӨАТ
ALTER TABLE assets ADD COLUMN IF NOT EXISTS acquisition_journal_id BIGINT
  REFERENCES journals(id) ON DELETE SET NULL;                  -- холбогдох GL журнал (буцаахад ашиглана)
