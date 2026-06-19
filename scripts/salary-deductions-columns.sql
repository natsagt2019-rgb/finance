-- ============================================================
-- Цалингийн суутгал задаргаа — хоцролт / хуримтлал / сахилгын шийтгэл
-- ============================================================
-- Одоо байгаа other_deduction (бусад) хэвээр. Дараах суутгалууд нэмэгдэнэ;
-- бүгд цэвэр цалингаас хасагдаж, журналд «урьдчилгаа/бусад суутгал»
-- (Кт 120601) мөрөнд нэгдэнэ.
-- Supabase Dashboard → SQL Editor-д ажиллуулна. Идемпотент.
-- ============================================================

ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS late_deduction       NUMERIC(18, 2) NOT NULL DEFAULT 0;  -- хоцролт
ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS savings_deduction    NUMERIC(18, 2) NOT NULL DEFAULT 0;  -- хуримтлал
ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS discipline_deduction NUMERIC(18, 2) NOT NULL DEFAULT 0;  -- сахилгын шийтгэл
