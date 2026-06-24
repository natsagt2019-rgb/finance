-- ============================================================
-- Цалин: Хэлтэс тасаг (department)
-- ============================================================
-- Ажилтны хэлтэс/тасгийн бүтэц. salary_records-д снапшот (company-той адил).
-- Supabase Dashboard → SQL Editor-д ажиллуулна. Идемпотент.
-- ============================================================

ALTER TABLE employees      ADD COLUMN IF NOT EXISTS department TEXT;  -- хэлтэс тасаг
ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS department TEXT;

CREATE INDEX IF NOT EXISTS employees_department_idx ON employees (department);
