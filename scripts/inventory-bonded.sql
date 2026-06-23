-- Гаалийн баталгаат агуулах туг.
ALTER TABLE inv_locations ADD COLUMN IF NOT EXISTS is_bonded BOOLEAN NOT NULL DEFAULT FALSE;
