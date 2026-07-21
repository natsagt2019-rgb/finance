-- ============================================================
-- Үндсэн хөрөнгө — ХОЙШЛОГДСОН НӨАТ (амортизаци) талбарууд (идемпотент)
-- ============================================================
-- Худалдан авалтад НӨАТ-ыг 180500-д хойшлуулбал: дүн, хугацаа (тоног 60 /
-- барилга 120 сар), эхлэх огноог хадгална. Дараа нь сар бүр тэнцүү хэсгээр
-- Дт 130600 / Кт 180500 гэж хасна (амортизаци).
--   node scripts/apply-sql.mjs scripts/assets-vat-defer-schema.sql
-- ============================================================

ALTER TABLE assets ADD COLUMN IF NOT EXISTS deferred_vat NUMERIC(18, 2) NOT NULL DEFAULT 0; -- 180500-д хойшлогдсон НӨАТ
ALTER TABLE assets ADD COLUMN IF NOT EXISTS deferred_vat_months INT;                        -- 60 (тоног) / 120 (барилга)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS deferred_vat_start DATE;                        -- амортизаци эхлэх огноо
