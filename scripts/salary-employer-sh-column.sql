-- Ажил олгогчийн ЭМНДШ + мэргэжлийн ангилал (ND-8).
-- Ажил олгогч = нийт цалин × хувь (2026: 14.5%, дээд хязгааргүй).
-- Additive + идемпотент. Supabase SQL Editor-д нэг удаа ажиллуулна.
ALTER TABLE salary_settings ADD COLUMN IF NOT EXISTS employer_sh_rate NUMERIC NOT NULL DEFAULT 0.145;
ALTER TABLE salary_records  ADD COLUMN IF NOT EXISTS employer_sh NUMERIC(18, 2) NOT NULL DEFAULT 0;
ALTER TABLE employees       ADD COLUMN IF NOT EXISTS occupation_code TEXT;
