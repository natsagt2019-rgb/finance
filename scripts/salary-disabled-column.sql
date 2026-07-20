-- employees.disabled — хөгжлийн бэрхшээлтэй ажилтан.
-- ХХОАТ хуулийн 22.1.2: хөгжлийн бэрхшээлтэй хувь хүний орлого албан
-- татвараас чөлөөлөгдөнө → ХХОАТ = 0.
-- Additive + идемпотент. Supabase SQL Editor-д нэг удаа ажиллуулна.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE;
