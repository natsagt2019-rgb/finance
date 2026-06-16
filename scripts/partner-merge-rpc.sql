-- Журналд бичигдсэн харилцагчийн нэрсийн жагсаалт — нэгтгэх UI-д.
-- partners(нэр+alias)-тай pnorm-оор тулгаж matched эсэхийг заана.
CREATE OR REPLACE FUNCTION journal_partner_names()
RETURNS TABLE(partner_name TEXT, entries INT, total NUMERIC, matched BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH names AS (
    SELECT je.partner_name, COUNT(*)::int entries, SUM(je.amount) total
    FROM journal_entries je
    WHERE je.partner_name IS NOT NULL AND je.partner_name <> ''
    GROUP BY je.partner_name
  ),
  pmap AS (
    SELECT DISTINCT pnorm(p.name) k FROM partners p WHERE p.is_active AND pnorm(p.name) <> ''
    UNION
    SELECT DISTINCT pnorm(a.val) k FROM partners p
      CROSS JOIN LATERAL jsonb_array_elements_text(p.aliases) a(val)
      WHERE p.is_active AND p.aliases IS NOT NULL AND jsonb_typeof(p.aliases)='array' AND pnorm(a.val) <> ''
  )
  SELECT n.partner_name, n.entries, n.total, (pm.k IS NOT NULL) AS matched
  FROM names n LEFT JOIN pmap pm ON pm.k = pnorm(n.partner_name)
  ORDER BY (pm.k IS NOT NULL) ASC, n.total DESC NULLS LAST;
$$;
