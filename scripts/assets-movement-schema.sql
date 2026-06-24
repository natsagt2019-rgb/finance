-- ============================================================
-- Үндсэн хөрөнгө — ХӨДӨЛГӨӨН (эзэмшил шилжүүлэх / дотоод) — идемпотент migration
-- ============================================================
--   node scripts/apply-sql.mjs scripts/assets-movement-schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS asset_movements (
    id               BIGSERIAL PRIMARY KEY,
    asset_id         BIGINT REFERENCES assets(id) ON DELETE CASCADE,
    moved_date       DATE NOT NULL,                 -- хөдөлгөөний огноо
    move_type        TEXT NOT NULL                  -- custody=эзэмшил | internal=дотоод
                       CHECK (move_type IN ('custody', 'internal')),
    from_responsible TEXT,                          -- хуучин эд хариуцагч
    to_responsible   TEXT,                          -- шинэ эд хариуцагч
    from_location_id BIGINT REFERENCES asset_locations(id) ON DELETE SET NULL, -- хуучин байршил
    to_location_id   BIGINT REFERENCES asset_locations(id) ON DELETE SET NULL, -- шинэ байршил
    note             TEXT,                          -- акт/тэмдэглэл
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asset_movements_asset_idx ON asset_movements (asset_id);
CREATE INDEX IF NOT EXISTS asset_movements_date_idx  ON asset_movements (moved_date);
