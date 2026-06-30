-- vat_return_summary RPC (sandbox-аас гаргав 2026-06-30)
CREATE OR REPLACE FUNCTION public.vat_return_summary(d_from date, d_to date)
 RETURNS TABLE(out_taxable_base numeric, out_exempt_base numeric, out_vat numeric, out_cnt integer, in_base numeric, in_vat numeric, in_cnt integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
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
$function$

