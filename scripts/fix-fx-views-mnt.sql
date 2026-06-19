-- ============================================================
-- Мөнгөн урсгал/нэгтгэл view-үүд: гадаад валютыг MNT-д хөрвүүлнэ
-- ============================================================
-- Өмнө нь эдгээр view нь гадаад валютыг бүрмөсөн ХАСДАГ (WHERE currency='MNT')
-- эсвэл ханшгүй түүхий дүнгээр нэгтгэдэг байсан тул USD/EUR дансны хөдөлгөөн
-- MNT тайлангаас алга болж/буруу гарч байв. Нягтлан бодох бүртгэл функциональ
-- валют = MNT тул дүн × ханш-аар хөрвүүлж нэгтгэнэ (MNT-д ханш=1).
--   node scripts/apply-sql.mjs scripts/fix-fx-views-mnt.sql
-- ============================================================

-- 4. Мөнгөн урсгалын нэгтгэл — ханшаар хөрвүүлж бүх валютыг хамруулна.
CREATE OR REPLACE VIEW monthly_cashflow AS
SELECT
    year,
    month,
    account_id,
    SUM(COALESCE(income,  0) * COALESCE(exchange_rate, 1)) AS total_income,
    SUM(COALESCE(expense, 0) * COALESCE(exchange_rate, 1)) AS total_expense,
    SUM(COALESCE(income,  0) * COALESCE(exchange_rate, 1))
      - SUM(COALESCE(expense, 0) * COALESCE(exchange_rate, 1)) AS net_cashflow,
    COUNT(*) AS txn_count
FROM transactions
GROUP BY year, month, account_id
ORDER BY year, month, account_id;

-- 5. Ангилалаар нэгтгэсэн — ханшаар хөрвүүлнэ.
CREATE OR REPLACE VIEW monthly_by_category AS
SELECT
    year,
    month,
    account_id,
    COALESCE(income_code, expense_code) AS category_code,
    CASE WHEN income_code IS NOT NULL THEN 'income' ELSE 'expense' END AS direction,
    SUM(COALESCE(income, expense, 0) * COALESCE(exchange_rate, 1)) AS total
FROM transactions
WHERE COALESCE(income_code, expense_code) IS NOT NULL
GROUP BY year, month, account_id, category_code, direction
ORDER BY year, month, account_id, category_code;

-- 6. Үлдэгдэл тулгалт — ханшаар хөрвүүлнэ.
CREATE OR REPLACE VIEW account_running_balance AS
SELECT
    t.account_id,
    t.year,
    b.opening_balance,
    SUM(COALESCE(t.income,  0) * COALESCE(t.exchange_rate, 1)) AS total_income,
    SUM(COALESCE(t.expense, 0) * COALESCE(t.exchange_rate, 1)) AS total_expense,
    b.opening_balance
        + SUM(COALESCE(t.income,  0) * COALESCE(t.exchange_rate, 1))
        - SUM(COALESCE(t.expense, 0) * COALESCE(t.exchange_rate, 1)) AS current_balance
FROM transactions t
JOIN account_balances b
    ON b.account_id = t.account_id AND b.year = t.year
GROUP BY t.account_id, t.year, b.opening_balance;

-- 7. Харилцагчаар нэгтгэсэн — ханшаар хөрвүүлнэ.
CREATE OR REPLACE VIEW counterparty_summary AS
SELECT
    account_id,
    year,
    COALESCE(master_name, counterparty) AS display_name,
    master_code,
    SUM(COALESCE(income,  0) * COALESCE(exchange_rate, 1)) AS total_income,
    SUM(COALESCE(expense, 0) * COALESCE(exchange_rate, 1)) AS total_expense,
    COUNT(*) AS txn_count
FROM transactions
GROUP BY account_id, year, display_name, master_code
ORDER BY total_expense DESC;

-- 9. Харилцагчийн мөнгөн гүйлгээний нэгтгэл — ханшаар хөрвүүлнэ.
CREATE OR REPLACE VIEW partner_cashflow AS
SELECT
    master_code,
    SUM(COALESCE(income,  0) * COALESCE(exchange_rate, 1)) AS total_income,
    SUM(COALESCE(expense, 0) * COALESCE(exchange_rate, 1)) AS total_expense,
    COUNT(*) AS txn_count
FROM transactions
WHERE master_code IS NOT NULL AND master_code <> ''
GROUP BY master_code;
