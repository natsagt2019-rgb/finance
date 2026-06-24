-- trial_balance_range: бохир Дт/Кт гүйлгээ (turn_dt/turn_kt) нэмэв.
-- Өмнө нь зөвхөн цэвэр (closing-opening) гарч, орлого/зарлага тусдаа харагдахгүй байв.
DROP FUNCTION IF EXISTS public.trial_balance_range(date, date);
CREATE OR REPLACE FUNCTION public.trial_balance_range(d_from date, d_to date)
RETURNS TABLE(code text, name text, opening numeric, turn_dt numeric, turn_kt numeric, closing numeric)
LANGUAGE sql STABLE SECURITY DEFINER
AS $function$
  WITH lines AS (
    SELECT txn_date, debit_code  AS code,  amount AS net
      FROM journal_entries WHERE debit_code  IS NOT NULL
    UNION ALL
    SELECT txn_date, credit_code AS code, -amount AS net
      FROM journal_entries WHERE credit_code IS NOT NULL
  ),
  agg AS (
    SELECT l.code,
      COALESCE(SUM(net) FILTER (WHERE txn_date <  d_from), 0) AS opening,
      COALESCE(SUM(net) FILTER (WHERE txn_date >= d_from AND txn_date <= d_to), 0) AS period
    FROM lines l GROUP BY l.code
  ),
  gross AS (
    SELECT debit_code AS code, SUM(amount) AS dt, 0::numeric AS kt
      FROM journal_entries
      WHERE debit_code IS NOT NULL AND txn_date >= d_from AND txn_date <= d_to
      GROUP BY debit_code
    UNION ALL
    SELECT credit_code AS code, 0::numeric AS dt, SUM(amount) AS kt
      FROM journal_entries
      WHERE credit_code IS NOT NULL AND txn_date >= d_from AND txn_date <= d_to
      GROUP BY credit_code
  ),
  gagg AS (SELECT g.code, SUM(g.dt) AS dt, SUM(g.kt) AS kt FROM gross g GROUP BY g.code)
  SELECT a.code, ac.name,
         ROUND(a.opening, 2)                       AS opening,
         ROUND(COALESCE(ga.dt, 0), 2)              AS turn_dt,
         ROUND(COALESCE(ga.kt, 0), 2)              AS turn_kt,
         ROUND(a.opening + a.period, 2)            AS closing
  FROM agg a
  LEFT JOIN accounts ac ON ac.code = a.code
  LEFT JOIN gagg ga ON ga.code = a.code
  WHERE a.opening <> 0 OR a.period <> 0
  ORDER BY a.code;
$function$;
