-- Бараа материалын өртөг бодох арга: 'fifo' (анхдагч) | 'average' (дундаж өртөг).
ALTER TABLE inv_settings ADD COLUMN IF NOT EXISTS cost_method TEXT NOT NULL DEFAULT 'fifo';
