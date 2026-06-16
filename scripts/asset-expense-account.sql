-- ============================================================
-- asset_categories.expense_account_code — элэгдлийн ЗАРДЛЫН данс (Дт)
-- ============================================================
-- Элэгдлийн журнал: Дт элэгдлийн зардал / Кт хуримтлагдсан элэгдэл.
--   • account_code        — хөрөнгийн данс (мэдээлэл)
--   • accum_account_code  — хуримтлагдсан элэгдэл (Кт)
--   • expense_account_code (ШИНЭ) — элэгдлийн зардлын данс (Дт)
-- saveDepreciation энэ гурвыг ашиглан journal_entries-д журнал бичнэ.
--
-- Supabase Dashboard → SQL Editor-д нэг удаа ажиллуулна (идемпотент).
-- ============================================================

ALTER TABLE asset_categories
    ADD COLUMN IF NOT EXISTS expense_account_code TEXT;
