-- ============================================================
-- Дансны татварын ангилал — ААНОАТ зөрүүгийн тулгалтад зориулсан
-- (Сангийн сайдын А/144 журам + ААНОАТ хууль 2019.03.22)
-- ============================================================
-- tax_class утгууд (зөвхөн орлого/зардлын дансанд хэрэглэнэ):
--   NULL             — Энгийн: татварын зорилгоор бүрэн хүлээн зөвшөөрөгдөнө
--                      (зөрүүгүй). Анхны утга.
--   non_deductible   — Хасагдахгүй зардал → БАЙНГЫН НЭМЭГДЭЛ
--                      (торгууль, алданги, хязгаараас давсан хүү/хандив;
--                       ААНОАТ хууль 16 дугаар зүйл)
--   exempt_income    — Татвараас чөлөөлөгдөх орлого → БАЙНГЫН ХАСАГДАЛ
--                      (засгийн газрын бондын хүү, чөлөөлөгдөх орлого;
--                       ААНОАТ хууль 21 дүгээр зүйл)
--   temp_diff        — Түр зөрүү → ТҮР ЗӨРҮҮ
--                      (элэгдлийн зөрүү, нөөцийн зардал; 13 дугаар зүйл)
-- Supabase Dashboard → SQL Editor-д ажиллуулна. Идемпотент.
-- ============================================================

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS tax_class TEXT;

ALTER TABLE accounts
  DROP CONSTRAINT IF EXISTS accounts_tax_class_chk;
ALTER TABLE accounts
  ADD CONSTRAINT accounts_tax_class_chk
    CHECK (tax_class IS NULL OR tax_class IN (
      'non_deductible', 'exempt_income', 'temp_diff'
    ));

-- ── Анхны автомат ангилал (нэрээр таних — зөвхөн ангилаагүй дансыг) ──────────
-- Торгууль, алданги → хасагдахгүй зардал (16.1-р зүйл)
UPDATE accounts
   SET tax_class = 'non_deductible'
 WHERE tax_class IS NULL
   AND type = 'expense'
   AND (name ILIKE '%торгууль%' OR name ILIKE '%алданги%' OR name ILIKE '%торгуул%');

COMMENT ON COLUMN accounts.tax_class IS
  'ААНОАТ зөрүүгийн ангилал: non_deductible|exempt_income|temp_diff|NULL(энгийн)';
