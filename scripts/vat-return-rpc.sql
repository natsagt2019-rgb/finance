-- ============================================================
-- vat_return_summary — TT-03а маягтын НӨАТ нэгтгэл (сервер тал)
-- ============================================================
-- vat_active (хүчин төгөлдөр баримт) дээр [d_from, d_to] мужид нэгтгэнэ.
-- Борлуулалт (out): НӨАТ ногдох суурь, чөлөөлөгдөх суурь, цуглуулсан НӨАТ.
-- Худалдан авалт (in): суурь, төлсөн НӨАТ.
-- Supabase Dashboard → SQL Editor-д ажиллуулна.
-- ============================================================

CREATE OR REPLACE FUNCTION public.vat_return_summary(d_from date, d_to date)
RETURNS TABLE(
  out_taxable_base numeric,
  out_exempt_base  numeric,
  out_vat          numeric,
  out_cnt          int,
  in_base          numeric,
  in_vat           numeric,
  in_cnt           int
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(SUM(amount)     FILTER (WHERE type = 'out' AND COALESCE(tax_type,'') <> 'Чөлөөлөгдөх'), 0),
    COALESCE(SUM(amount)     FILTER (WHERE type = 'out' AND tax_type = 'Чөлөөлөгдөх'), 0),
    COALESCE(SUM(vat_amount) FILTER (WHERE type = 'out'), 0),
    COALESCE(COUNT(*)        FILTER (WHERE type = 'out'), 0)::int,
    COALESCE(SUM(amount)     FILTER (WHERE type = 'in'), 0),
    COALESCE(SUM(vat_amount) FILTER (WHERE type = 'in'), 0),
    COALESCE(COUNT(*)        FILTER (WHERE type = 'in'), 0)::int
  FROM vat_active
  WHERE date >= d_from AND date <= d_to;
$$;
