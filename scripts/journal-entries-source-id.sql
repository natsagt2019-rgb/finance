-- ============================================================
-- journal_entries.source_id — эх баримтын холбоос
-- ============================================================
-- Модулиас (sale/purchase г.м.) journal_entries-д ШУУД бичсэн бичилтийг
-- эх баримтын id-аар нь ялган устгах боломжтой болгоно. Өмнө нь устгалыг
-- (source + огноо + partner_name)-аар хийдэг байсан тул нэг өдөр нэг
-- харилцагчид олон гүйлгээтэй бол бусдын журнал хамт устах эрсдэлтэй байв.
--
-- Supabase Dashboard → SQL Editor-д нэг удаа ажиллуулна (идемпотент).
-- ============================================================

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS source_id BIGINT;

CREATE INDEX IF NOT EXISTS journal_entries_source_idx
    ON journal_entries (source, source_id);
