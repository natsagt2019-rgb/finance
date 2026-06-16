-- cash2026 журналын хоосон partner_name-г эх банкны гүйлгээнээс нөхнө.
-- Тулгалт: ижил огноо + чиглэлийн дүн (мөнгө орсон=income, гарсан=expense).
-- Банкны данс = 110xxx. Харилцагч = master_name эс бөгөөс counterparty.
UPDATE journal_entries je
SET partner_name = (
  SELECT COALESCE(NULLIF(t.master_name,''), t.counterparty)
  FROM transactions t
  WHERE (t.txn_date AT TIME ZONE 'Asia/Ulaanbaatar')::date = je.txn_date
    AND ( (je.debit_code  LIKE '110%' AND t.income  = je.amount)
       OR (je.credit_code LIKE '110%' AND t.expense = je.amount) )
    AND COALESCE(NULLIF(t.master_name,''), t.counterparty) IS NOT NULL
  ORDER BY t.id LIMIT 1
)
WHERE je.source = 'cash2026'
  AND (je.partner_name IS NULL OR je.partner_name = '')
  AND EXISTS (
    SELECT 1 FROM transactions t
    WHERE (t.txn_date AT TIME ZONE 'Asia/Ulaanbaatar')::date = je.txn_date
      AND ( (je.debit_code  LIKE '110%' AND t.income  = je.amount)
         OR (je.credit_code LIKE '110%' AND t.expense = je.amount) )
      AND COALESCE(NULLIF(t.master_name,''), t.counterparty) IS NOT NULL
  );
