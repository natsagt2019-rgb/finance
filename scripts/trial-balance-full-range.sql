-- ============================================================
-- trial_balance_full_range(d_from, d_to)
-- ============================================================
-- Гүйлгээ балансад зориулсан дэлгэрэнгүй хувилбар: код тус бүрээр
--   opening      — мужийн өмнөх цэвэр үлдэгдэл (debit-positive)
--   debit_turn   — мужийн ДЕБЕТ гүйлгээ (бохир дүн)
--   credit_turn  — мужийн КРЕДИТ гүйлгээ (бохир дүн)
--   closing      — opening + debit_turn - credit_turn
-- journal_entries (debit_code/credit_code/amount) дээр суурилна — бусад
-- динамик тайлантай (trial_balance_range) ижил эх сурвалж, тул тэнцэнэ.
-- ============================================================

CREATE OR REPLACE FUNCTION public.trial_balance_full_range(d_from date, d_to date)
RETURNS TABLE(
  code text,
  name text,
  opening numeric,
  debit_turn numeric,
  credit_turn numeric,
  closing numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $function$
  WITH lines AS (
    SELECT txn_date, debit_code AS code, amount AS dt, 0::numeric AS ct, amount AS net
      FROM journal_entries WHERE debit_code IS NOT NULL
    UNION ALL
    SELECT txn_date, credit_code AS code, 0::numeric AS dt, amount AS ct, -amount AS net
      FROM journal_entries WHERE credit_code IS NOT NULL
  ),
  agg AS (
    SELECT code,
      COALESCE(SUM(net) FILTER (WHERE txn_date < d_from), 0) AS opening,
      COALESCE(SUM(dt)  FILTER (WHERE txn_date >= d_from AND txn_date <= d_to), 0) AS debit_turn,
      COALESCE(SUM(ct)  FILTER (WHERE txn_date >= d_from AND txn_date <= d_to), 0) AS credit_turn
    FROM lines GROUP BY code
  )
  SELECT a.code, ac.name,
    ROUND(a.opening, 2) AS opening,
    ROUND(a.debit_turn, 2) AS debit_turn,
    ROUND(a.credit_turn, 2) AS credit_turn,
    ROUND(a.opening + a.debit_turn - a.credit_turn, 2) AS closing
  FROM agg a
  LEFT JOIN accounts ac ON ac.code = a.code
  WHERE a.opening <> 0 OR a.debit_turn <> 0 OR a.credit_turn <> 0
  ORDER BY a.code;
$function$;
