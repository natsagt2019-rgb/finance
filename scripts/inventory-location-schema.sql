-- ============================================================
-- C. Байршил (агуулах) мастер дата + баар код + хөдөлгөөний байршил
-- ============================================================
CREATE TABLE IF NOT EXISTS inv_locations (
    id          BIGSERIAL PRIMARY KEY,
    code        TEXT,                            -- байршлын код (заавал биш)
    name        TEXT NOT NULL,                   -- агуулах/байршлын нэр
    keeper      TEXT,                            -- няраж (хариуцагч)
    note        TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Барааны баар код.
ALTER TABLE inv_items ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Хөдөлгөөний байршил (аль агуулахад орлого/зарлага хийгдсэн).
ALTER TABLE inv_moves ADD COLUMN IF NOT EXISTS location_id BIGINT
    REFERENCES inv_locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_inv_moves_location ON inv_moves (location_id);
