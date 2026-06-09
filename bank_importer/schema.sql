-- ============================================================
-- bank_importer — Supabase (PostgreSQL) Schema
-- ============================================================
-- Энэхүү файлыг Supabase Dashboard → SQL Editor-д ажиллуулна.
-- ============================================================


-- ── 1. Гүйлгээний хүснэгт ────────────────────────────────────────────────
-- Бүх банкны бүх гүйлгээ нэг хүснэгтэд хадгална.
-- account_id-оор ялгана: TT | TR | GM | MB
CREATE TABLE IF NOT EXISTS transactions (
    id              BIGSERIAL PRIMARY KEY,

    -- Данс / компани
    account_id      TEXT NOT NULL,          -- 'TT' | 'TR' | 'GM' | 'MB'
    company         TEXT,                    -- 'ТҮМЭН ТЭЭХ ХХК' | 'ТҮМЭН РЕСУРС ХХК'
    bank            TEXT,                    -- 'ХХБ / ТДБ — 411096635' гэх мэт

    -- Огноо
    txn_date        TIMESTAMPTZ NOT NULL,
    month           SMALLINT GENERATED ALWAYS AS (EXTRACT(MONTH FROM txn_date)::SMALLINT) STORED,
    year            SMALLINT GENERATED ALWAYS AS (EXTRACT(YEAR  FROM txn_date)::SMALLINT) STORED,

    -- Гүйлгээний мэдээлэл
    description     TEXT,
    counterparty    TEXT,
    account_no      TEXT,
    exchange_rate   NUMERIC(10, 4) DEFAULT 1.0,

    -- Мөнгөн дүн
    income          NUMERIC(18, 2),         -- NULL бол зарлага
    expense         NUMERIC(18, 2),         -- NULL бол орлого

    -- Ангилал
    income_code     TEXT,                   -- '1.1.1' гэх мэт
    expense_code    TEXT,                   -- '1.2.1' гэх мэт

    -- Харилцагч Master Data
    master_code     TEXT,                   -- 'C10164-01' гэх мэт
    master_name     TEXT,                   -- 'Юрика' гэх мэт

    -- Metadata
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    -- Давхардал таслах: нэг данс дотор ижил огноо+утга+дүн давтагдахгүй
    CONSTRAINT transactions_unique
        UNIQUE (account_id, txn_date, description, income, expense)
);

-- Index-үүд
CREATE INDEX IF NOT EXISTS idx_transactions_account_date
    ON transactions (account_id, txn_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_year_month
    ON transactions (year, month);
CREATE INDEX IF NOT EXISTS idx_transactions_income_code
    ON transactions (income_code);
CREATE INDEX IF NOT EXISTS idx_transactions_expense_code
    ON transactions (expense_code);


-- ── 2. Cutoff хүснэгт ────────────────────────────────────────────────────
-- Хамгийн сүүлд import хийсэн гүйлгээний огноо тус дансаар
CREATE TABLE IF NOT EXISTS cutoffs (
    account_id      TEXT PRIMARY KEY,       -- 'TT' | 'TR' | 'GM' | 'MB'
    last_txn_at     TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Анхны утгууд (2026 оны эхлэл)
INSERT INTO cutoffs (account_id, last_txn_at) VALUES
    ('TT', '2025-12-31T23:59:59+08:00'),
    ('TR', '2025-12-31T23:59:59+08:00'),
    ('GM', '2025-12-31T23:59:59+08:00'),
    ('MB', '2025-12-31T23:59:59+08:00')
ON CONFLICT (account_id) DO NOTHING;


-- ── 3. Дансны эхлэлийн үлдэгдэл ─────────────────────────────────────────
-- Жил бүрийн 1-р сарын 1-ний үлдэгдэл
CREATE TABLE IF NOT EXISTS account_balances (
    account_id      TEXT NOT NULL,
    year            SMALLINT NOT NULL,
    opening_balance NUMERIC(18, 2) NOT NULL,
    PRIMARY KEY (account_id, year)
);

-- 2026 оны эхлэлийн үлдэгдэл
INSERT INTO account_balances (account_id, year, opening_balance) VALUES
    ('TT', 2026, 140117453.62),
    ('TR', 2026,  45819264.22),
    ('GM', 2026,  32496186.27),
    ('MB', 2026,           0)
ON CONFLICT DO NOTHING;


-- ── 4. Мөнгөн урсгалын нэгтгэл view ─────────────────────────────────────
-- Жил, сар, данс тус бүрийн нэгтгэл
CREATE OR REPLACE VIEW monthly_cashflow AS
SELECT
    year,
    month,
    account_id,
    SUM(income)  AS total_income,
    SUM(expense) AS total_expense,
    SUM(COALESCE(income, 0)) - SUM(COALESCE(expense, 0)) AS net_cashflow,
    COUNT(*)     AS txn_count
FROM transactions
GROUP BY year, month, account_id
ORDER BY year, month, account_id;


-- ── 5. Ангилалаар нэгтгэсэн view ─────────────────────────────────────────
CREATE OR REPLACE VIEW monthly_by_category AS
SELECT
    year,
    month,
    account_id,
    COALESCE(income_code, expense_code) AS category_code,
    CASE WHEN income_code IS NOT NULL THEN 'income' ELSE 'expense' END AS direction,
    SUM(COALESCE(income, expense, 0)) AS total
FROM transactions
WHERE COALESCE(income_code, expense_code) IS NOT NULL
GROUP BY year, month, account_id, category_code, direction
ORDER BY year, month, account_id, category_code;


-- ── 6. Үлдэгдэл тулгалтын view ───────────────────────────────────────────
-- Эхлэлийн үлдэгдэл + нийт орлого - нийт зарлага = одоогийн үлдэгдэл
CREATE OR REPLACE VIEW account_running_balance AS
SELECT
    t.account_id,
    t.year,
    b.opening_balance,
    SUM(COALESCE(t.income,  0)) AS total_income,
    SUM(COALESCE(t.expense, 0)) AS total_expense,
    b.opening_balance
        + SUM(COALESCE(t.income,  0))
        - SUM(COALESCE(t.expense, 0)) AS current_balance
FROM transactions t
JOIN account_balances b
    ON b.account_id = t.account_id AND b.year = t.year
GROUP BY t.account_id, t.year, b.opening_balance;


-- ── 7. Харилцагчаар нэгтгэсэн view ───────────────────────────────────────
CREATE OR REPLACE VIEW counterparty_summary AS
SELECT
    account_id,
    year,
    COALESCE(master_name, counterparty) AS display_name,
    master_code,
    SUM(COALESCE(income,  0)) AS total_income,
    SUM(COALESCE(expense, 0)) AS total_expense,
    COUNT(*) AS txn_count
FROM transactions
GROUP BY account_id, year, display_name, master_code
ORDER BY total_expense DESC;
