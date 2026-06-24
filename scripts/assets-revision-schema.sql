-- ============================================================
-- Үндсэн хөрөнгө — REVISION (засвар / дахин үнэлгээ / хугацаа) — идемпотент
-- ============================================================
--   node scripts/apply-sql.mjs scripts/assets-revision-schema.sql
-- ============================================================

ALTER TABLE assets ADD COLUMN IF NOT EXISTS revision_kind TEXT
  CHECK (revision_kind IN ('repair', 'revaluation', 'life'));   -- засвар | дахин үнэлгээ | хугацаа
ALTER TABLE assets ADD COLUMN IF NOT EXISTS revision_date DATE;                -- хүчинтэй болох огноо
ALTER TABLE assets ADD COLUMN IF NOT EXISTS revision_cost NUMERIC(18, 2);      -- revision-ы дараах нийт өртөг
ALTER TABLE assets ADD COLUMN IF NOT EXISTS revision_accum NUMERIC(18, 2);     -- хөлдөөсөн хуримтлагдсан элэгдэл
ALTER TABLE assets ADD COLUMN IF NOT EXISTS revision_life_months INT;          -- үлдэх хугацаа (сар)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS revision_note TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS revision_journal_id BIGINT
  REFERENCES journals(id) ON DELETE SET NULL;                   -- засвар/дахин үнэлгээний журнал
