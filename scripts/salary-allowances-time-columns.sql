-- ============================================================
-- Цалин: нэмэгдэл өргөтгөл + цагийн үзүүлэлт (Үе 1)
-- ============================================================
-- Нэмэгдлүүд нийт цалинд (gross) нэмэгдэнэ. Цагийн талбарууд одоохондоо
-- мэдээллийн зорилготой (Үе 2-т автомат тооцоонд орно).
-- Supabase Dashboard → SQL Editor-д ажиллуулна. Идемпотент.
-- ============================================================

-- ── Цагийн үзүүлэлт ──────────────────────────────────────────────────────────
ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS overtime_hours         NUMERIC(8, 2)  NOT NULL DEFAULT 0;  -- илүү цаг
ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS holiday_overtime_hours NUMERIC(8, 2)  NOT NULL DEFAULT 0;  -- баярын өдрийн илүү цаг
ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS late_minutes           NUMERIC(8, 2)  NOT NULL DEFAULT 0;  -- хоцорсон минут

-- ── Нэмэгдэл (нийт цалинд орно) ──────────────────────────────────────────────
ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS transport_allowance    NUMERIC(18, 2) NOT NULL DEFAULT 0;  -- унааны мөнгө
ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS meal_allowance         NUMERIC(18, 2) NOT NULL DEFAULT 0;  -- хоолны мөнгө
ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS fuel_allowance         NUMERIC(18, 2) NOT NULL DEFAULT 0;  -- түлээ, нүүрсний нэмэгдэл
ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS tenure_allowance       NUMERIC(18, 2) NOT NULL DEFAULT 0;  -- удаан жилийн нэмэгдэл
ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS overtime_pay           NUMERIC(18, 2) NOT NULL DEFAULT 0;  -- илүү цагийн мөнгө
ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS holiday_overtime_pay   NUMERIC(18, 2) NOT NULL DEFAULT 0;  -- баярын өдрийн илүү цагийн мөнгө
