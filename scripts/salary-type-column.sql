-- ============================================================
-- Цалингийн төрөл — тогтмол биш цалин дэмжих
-- ============================================================
--   fixed  — Тогтмол (үндсэн ÷ сарын цаг × ажилласан цаг)
--   hourly — Цагийн хөлс (1 цагийн хөлс × ажилласан цаг)
--   manual — Гараар (тогтмол биш/бусад: бодогдсон цалинг шууд оруулна)
-- Supabase Dashboard → SQL Editor-д ажиллуулна. Идемпотент.
-- ============================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS salary_type TEXT NOT NULL DEFAULT 'fixed';
ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_salary_type_chk;
ALTER TABLE employees
  ADD CONSTRAINT employees_salary_type_chk
    CHECK (salary_type IN ('fixed', 'hourly', 'manual'));

-- Цалингийн мөрөнд төрлийн снапшот (тооцоо тогтвортой байх).
ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS salary_type TEXT NOT NULL DEFAULT 'fixed';
