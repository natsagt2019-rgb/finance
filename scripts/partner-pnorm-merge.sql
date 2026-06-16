-- Түрэмгий харилцагч нормчлол: UPPER, хуулийн хэлбэр (ХХК/LLC/LTD..) хасах,
-- зай/цэг/тэмдэг бүгдийг хасах. Зайтай/суффикстэй хувилбаруудыг alias-тай тулгана.
CREATE OR REPLACE FUNCTION pnorm(s TEXT) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
           regexp_replace(upper(coalesce(s,'')),
             '(ХХК|ТӨХК|КХК|ХК|ХОРШОО|LLC|LLP|LTD|INC|CORP|COLTD|CO)', '', 'g'),
           '[^0-9A-ZА-ЯЁӨҮ]', '', 'g')
$$;

WITH raw AS (
  SELECT pnorm(name) k, name canon FROM partners WHERE is_active AND name IS NOT NULL AND pnorm(name) <> ''
  UNION
  SELECT pnorm(a.val) k, p.name canon
  FROM partners p CROSS JOIN LATERAL jsonb_array_elements_text(p.aliases) a(val)
  WHERE p.is_active AND p.aliases IS NOT NULL AND jsonb_typeof(p.aliases)='array' AND pnorm(a.val) <> ''
),
pmap AS (SELECT k, min(canon) canon FROM raw GROUP BY k HAVING count(DISTINCT canon) = 1)
UPDATE journal_entries je SET partner_name = pm.canon
FROM pmap pm
WHERE je.partner_name IS NOT NULL AND je.partner_name <> ''
  AND pnorm(je.partner_name) = pm.k AND je.partner_name <> pm.canon;
