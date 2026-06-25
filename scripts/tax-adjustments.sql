-- ============================================================
-- ААНОАТ гар тохируулга — түр зөрүүний татварын тал + гар мөр
-- (ААНОАТ хууль 2019.03.22 · А/144 журам)
-- ============================================================
-- kind утгууд:
--   temp_diff — түр зөрүүтэй дансны ТАТВАРЫН ТАЛЫН дүн (жилд нэг, дансаар).
--               Санхүүгийн тал нь pnl_range-аас, зөрүү = санхүү − татвар.
--               account_code заавал, amount = татварын дүн.
--   add       — гар нэмэгдэл (татвар ногдох орлогод нэмэх). account_code NULL.
--   less      — гар хасагдал (татвар ногдох орлогоос хасах). account_code NULL.
-- Supabase Dashboard → SQL Editor-д ажиллуулна. Идемпотент.
-- ============================================================

CREATE TABLE IF NOT EXISTS tax_adjustments (
    id            BIGSERIAL PRIMARY KEY,
    year          SMALLINT NOT NULL,
    kind          TEXT NOT NULL CHECK (kind IN ('temp_diff', 'add', 'less')),
    account_code  TEXT,
    label         TEXT NOT NULL DEFAULT '',
    amount        NUMERIC(18, 2) NOT NULL DEFAULT 0,
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Түр зөрүү: жил × данс тутамд нэг мөр (upsert).
CREATE UNIQUE INDEX IF NOT EXISTS tax_adjustments_tempdiff_uniq
    ON tax_adjustments (year, account_code)
    WHERE kind = 'temp_diff';

CREATE INDEX IF NOT EXISTS tax_adjustments_year_idx ON tax_adjustments (year);

COMMENT ON TABLE tax_adjustments IS
  'ААНОАТ гар тохируулга: temp_diff (татварын тал), add/less (гар мөр)';
