-- ============================================================
-- employees: Овог (last_name) ба Нэр (first_name) -г тусад нь
-- ============================================================
-- `name` багана хэвээр үлдэнэ — "Овог Нэр" гэж нийлмэлээр хадгална
-- (цалингийн мөр, журнал, тайлан бүгд `name`-ийг л ашигладаг).
-- Supabase Dashboard → SQL Editor-д ажиллуулна. Идемпотент.
-- ============================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name  TEXT;  -- Овог
ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name TEXT;  -- Нэр

-- Хуучин мөрүүдийг `name`-ээс задалж бөглөх (зөвхөн салгаагүй мөрүүдэд).
--   "Овог Нэр"  → last_name="Овог",  first_name="Нэр"
--   "Нэр"       → last_name=NULL,    first_name="Нэр"
UPDATE employees
SET
  last_name = CASE
    WHEN position(' ' IN btrim(name)) > 0
      THEN split_part(btrim(name), ' ', 1)
    ELSE NULL
  END,
  first_name = CASE
    WHEN position(' ' IN btrim(name)) > 0
      THEN btrim(substr(btrim(name), position(' ' IN btrim(name)) + 1))
    ELSE btrim(name)
  END
WHERE first_name IS NULL
  AND name IS NOT NULL
  AND btrim(name) <> '';
