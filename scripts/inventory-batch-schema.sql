-- Цувирал (lot/цуврал) + дуусах хугацаа — орлогын хөдөлгөөнд бүртгэнэ.
ALTER TABLE inv_moves ADD COLUMN IF NOT EXISTS lot_no TEXT;
ALTER TABLE inv_moves ADD COLUMN IF NOT EXISTS expiry_date DATE;
CREATE INDEX IF NOT EXISTS idx_inv_moves_expiry ON inv_moves (expiry_date) WHERE expiry_date IS NOT NULL;
