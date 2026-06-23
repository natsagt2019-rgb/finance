-- ============================================================
-- Үндсэн хөрөнгө — БАЙРШИЛ (мастер) + БААР КОД (идемпотент migration)
-- ============================================================
--   node scripts/apply-sql.mjs scripts/assets-location-schema.sql
-- ============================================================

-- ── asset_locations — байршлын лавлах (001 Ашиглалт, 002 Агуулах ...) ──
CREATE TABLE IF NOT EXISTS asset_locations (
    id          BIGSERIAL PRIMARY KEY,
    code        TEXT,                          -- байршлын код (001, 002 ...)
    name        TEXT NOT NULL,                 -- байршлын нэр
    is_active   BOOLEAN NOT NULL DEFAULT TRUE, -- зөөлөн устгал
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asset_locations_active_idx ON asset_locations (is_active);

-- ── assets — байршлын холбоос + баар код ──
ALTER TABLE assets ADD COLUMN IF NOT EXISTS location_id BIGINT
  REFERENCES asset_locations(id) ON DELETE SET NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS barcode TEXT;
CREATE INDEX IF NOT EXISTS assets_location_idx ON assets (location_id);
CREATE INDEX IF NOT EXISTS assets_barcode_idx  ON assets (barcode);

-- ── Анхдагч байршил (идемпотент — кодоор шалгана) ──
INSERT INTO asset_locations (code, name)
SELECT v.code, v.name
FROM (VALUES ('001', 'Ашиглалт'), ('002', 'Агуулах')) AS v(code, name)
WHERE NOT EXISTS (SELECT 1 FROM asset_locations l WHERE l.code = v.code);
