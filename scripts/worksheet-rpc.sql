-- worksheet_range — Ажлын хүснэгтийн эх өгөгдөл (SQL дотор нэгтгэнэ).
-- Данс бүрийн: opening (огнооноос өмнөх debit-positive цэвэр үлдэгдэл),
-- pdebit/pcredit (мужийн нийт дебет/кредит эргэлт). Мөрийн хязгааргүй.
CREATE OR REPLACE FUNCTION worksheet_range(d_from DATE, d_to DATE)
RETURNS TABLE(code TEXT, opening NUMERIC, pdebit NUMERIC, pcredit NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH lines AS (
    SELECT debit_code AS code, txn_date, amount AS dr, 0::numeric AS cr
      FROM journal_entries WHERE debit_code IS NOT NULL AND txn_date <= d_to
    UNION ALL
    SELECT credit_code AS code, txn_date, 0::numeric AS dr, amount AS cr
      FROM journal_entries WHERE credit_code IS NOT NULL AND txn_date <= d_to
  )
  SELECT l.code,
    ROUND(COALESCE(SUM(l.dr - l.cr) FILTER (WHERE l.txn_date <  d_from), 0), 2) AS opening,
    ROUND(COALESCE(SUM(l.dr)        FILTER (WHERE l.txn_date >= d_from AND l.txn_date <= d_to), 0), 2) AS pdebit,
    ROUND(COALESCE(SUM(l.cr)        FILTER (WHERE l.txn_date >= d_from AND l.txn_date <= d_to), 0), 2) AS pcredit
  FROM lines l
  GROUP BY l.code
  HAVING ABS(COALESCE(SUM(l.dr - l.cr), 0)) > 0.005
      OR COALESCE(SUM(l.dr), 0) > 0.005 OR COALESCE(SUM(l.cr), 0) > 0.005;
$$;
