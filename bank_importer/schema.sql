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
    -- month/year нь generated багана. TIMESTAMPTZ-ээс шууд EXTRACT хийвэл
    -- session timezone-оос хамаарч immutable бус болдог тул тогтмол +08:00
    -- (Монголын цагийн бүс) offset ашиглаж immutable болгов.
    month           SMALLINT GENERATED ALWAYS AS (EXTRACT(MONTH FROM (txn_date AT TIME ZONE INTERVAL '+08:00'))::SMALLINT) STORED,
    year            SMALLINT GENERATED ALWAYS AS (EXTRACT(YEAR  FROM (txn_date AT TIME ZONE INTERVAL '+08:00'))::SMALLINT) STORED,

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


-- ── 8. Харилцагчийн бүртгэл (Partners) ───────────────────────────────────
-- Master Data-аас цэгцэлсэн харилцагчдын лавлах.
-- transactions.master_code = partners.code-оор гүйлгээтэй холбогдоно.
CREATE TABLE IF NOT EXISTS partners (
    id          BIGSERIAL PRIMARY KEY,
    code        TEXT,                       -- 'C10001-01' гэх мэт (хоосон байж болно)
    name        TEXT NOT NULL,
    register    TEXT,                       -- улсын бүртгэлийн дугаар
    type        TEXT DEFAULT 'both',        -- 'customer' | 'supplier' | 'both'
    phone       TEXT,
    email       TEXT,
    address     TEXT,
    aliases     JSONB,                      -- Master Data-аас өөр нэрсийн жагсаалт
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- code давхцахгүй (зөвхөн хоосон биш кодод). Хоосон код олон байж болно.
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_code_uniq
    ON partners (code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partners_name ON partners (name);


-- ── 9. Харилцагчийн мөнгөн гүйлгээний нэгтгэл view ───────────────────────
-- master_code-оор бүлэглэсэн нийт орлого/зарлага. Жагсаалтад харилцагч бүрийн
-- дүнг харуулахад ашиглана (transactions-д master_code бөглөгдсөн үед утга гарна).
CREATE OR REPLACE VIEW partner_cashflow AS
SELECT
    master_code,
    SUM(COALESCE(income,  0)) AS total_income,
    SUM(COALESCE(expense, 0)) AS total_expense,
    COUNT(*)                  AS txn_count
FROM transactions
WHERE master_code IS NOT NULL AND master_code <> ''
GROUP BY master_code;


-- ── 10. Дансны мод (Chart of Accounts) ──────────────────────────────────
-- Аж ахуйн нэгжийн дансны жагсаалт. parent_id-аар модлог бүтэц үүснэ.
-- type: 'asset' | 'liability' | 'equity' | 'income' | 'expense'
CREATE TABLE IF NOT EXISTS accounts (
    id              BIGSERIAL PRIMARY KEY,
    code            TEXT NOT NULL,              -- '311005' гэх мэт дансны код (AABBCC)
    name            TEXT NOT NULL,              -- дансны нэр (монгол)
    name_en         TEXT,                       -- дансны нэр (англи)
    type            TEXT NOT NULL,              -- asset|liability|equity|income|expense
    parent_id       BIGINT REFERENCES accounts(id) ON DELETE SET NULL,  -- эх данс
    is_active       BOOLEAN DEFAULT TRUE,
    note            TEXT,                       -- тайлбар / тэмдэглэл (татвар, МУСГАА г.м)
    fs_line         TEXT,                       -- санхүүгийн тайлангийн мөр (СС №361 маягт)
    -- Fino.mn-тэй нийцүүлсэн нэмэлт талбарууд
    account_number  TEXT,                       -- дансны дугаар
    currency        TEXT DEFAULT 'MNT',         -- мөнгөн тэмдэгт
    nature          TEXT,                       -- шинж: 'Актив' | 'Пассив'
    journal_type    TEXT,                       -- журнал
    department_code TEXT,                       -- хэлтэс код
    department_name TEXT,                       -- хэлтэс нэр
    bank_name       TEXT,                       -- банк
    bank_account    TEXT,                       -- банкны данс
    is_temp         BOOLEAN DEFAULT FALSE,      -- түр данс эсэх
    temp_percent    DOUBLE PRECISION DEFAULT 0, -- түр данс хувь
    is_cogs         BOOLEAN DEFAULT FALSE,      -- борлуулсан бүтээгдэхүүний өртөг (ББӨ) данс эсэх
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Одоо байгаа хүснэгтэд багана нэмэх (idempotent)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_cogs BOOLEAN DEFAULT FALSE;

-- code давхцахгүй (зөвхөн идэвхтэй дансдын дунд)
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_code_uniq
    ON accounts (code) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts (parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type   ON accounts (type);


-- ── 11. Нэхэмжлэх (Invoices / Авлага) ────────────────────────────────────
-- Худалдан авагчид гаргасан нэхэмжлэх ба түүний төлбөрийн төлөв.
-- partner_id-аар partners-тэй холбогдоно. partner_name нь снапшот
-- (харилцагч устгагдсан ч нэр үлдэнэ).
-- status: 'open' (нээлттэй) | 'partial' (хэсэгчлэн) | 'paid' (төлөгдсөн).
-- "Хэтэрсэн" төлөв нь зөвхөн дэлгэцийн тооцоо (due_date < өнөөдөр ба paid биш),
-- мэдээллийн баазад хадгалагдахгүй.
CREATE TABLE IF NOT EXISTS invoices (
    id            BIGSERIAL PRIMARY KEY,
    invoice_no    TEXT,                        -- Нэхэмж № (давхцахгүй)
    inv_date      DATE NOT NULL,               -- нэхэмжилсэн огноо
    due_date      DATE,                        -- төлөх эцсийн хугацаа
    partner_id    BIGINT REFERENCES partners(id) ON DELETE SET NULL,
    partner_name  TEXT,                        -- харилцагчийн нэр (снапшот)
    responsible   TEXT,                        -- хариуцагч (KAM)
    description   TEXT,                        -- тайлбар
    amount        NUMERIC(18, 2) NOT NULL DEFAULT 0,   -- нийт дүн
    paid_amount   NUMERIC(18, 2) NOT NULL DEFAULT 0,   -- төлсөн дүн
    status        TEXT NOT NULL DEFAULT 'open',        -- open|partial|paid
    currency      TEXT DEFAULT 'MNT',
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- invoice_no давхцахгүй (зөвхөн идэвхтэй, кодтой нэхэмжлэлийн дунд)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_no_uniq
    ON invoices (invoice_no) WHERE is_active AND invoice_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_partner ON invoices (partner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date    ON invoices (inv_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices (status);


-- ── 12. Нэхэмжлэлийн сараар нэгтгэл view ─────────────────────────────────
-- Жил, сараар нэгтгэсэн дүн (тайлангийн график/нэгтгэлд ашиглана).
CREATE OR REPLACE VIEW invoice_monthly AS
SELECT
    EXTRACT(YEAR  FROM inv_date)::SMALLINT AS year,
    EXTRACT(MONTH FROM inv_date)::SMALLINT AS month,
    COUNT(*)                  AS invoice_count,
    SUM(amount)               AS total_amount,
    SUM(paid_amount)          AS total_paid,
    SUM(amount - paid_amount) AS total_remaining
FROM invoices
WHERE is_active
GROUP BY year, month
ORDER BY year, month;


-- ── 13. Гүйлгээ баланс (Trial Balance) ──────────────────────────────────
-- Данс бүрийн эхний/эцсийн үлдэгдэл тайлант үеэр. Excel-ээс импортолно.
-- Энэ нь санхүүгийн тайлан (E-balance) гаргах эх өгөгдөл.
-- account_code = accounts.code-той тааруулна. balance нь дансны ЖИНХЭНЭ
-- чиглэлийн (debit-positive) тэмдэгтэй: актив/зардал +, пассив/орлого -.
CREATE TABLE IF NOT EXISTS trial_balances (
    id              BIGSERIAL PRIMARY KEY,
    year            SMALLINT NOT NULL,
    period          TEXT NOT NULL DEFAULT 'annual',  -- 'annual'|'Q1'..'Q4'|'01'..'12'
    account_code    TEXT NOT NULL,                   -- accounts.code
    account_name    TEXT,                            -- импортын үеийн нэр (лавлах)
    opening_balance NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- эхний (өмнөх он харьцуулалт)
    closing_balance NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- эцсийн (тайлант он)
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (year, period, account_code)
);

CREATE INDEX IF NOT EXISTS idx_trial_balances_year ON trial_balances (year, period);
CREATE INDEX IF NOT EXISTS idx_trial_balances_code ON trial_balances (account_code);


-- ── 14. Тайлангийн мөрөөр нэгтгэсэн view ─────────────────────────────────
-- trial_balances-ийг accounts.fs_line-аар нэгтгэнэ. Санхүүгийн тайлангийн
-- мөр бүрийн дүн (эхний/эцсийн) шууд гарна.
CREATE OR REPLACE VIEW fs_line_balances AS
SELECT
    tb.year,
    tb.period,
    a.fs_line,
    SUM(tb.opening_balance) AS opening_total,
    SUM(tb.closing_balance) AS closing_total
FROM trial_balances tb
JOIN accounts a ON a.code = tb.account_code AND a.is_active
WHERE a.fs_line IS NOT NULL
GROUP BY tb.year, tb.period, a.fs_line;


-- ── 15. Мөнгөн гүйлгээний мөрүүд (Cash Flow) ────────────────────────────
-- Мөнгөн гүйлгээний тайлан (шууд арга). cf_code = E-balance МГТ-ийн мөрийн
-- код ('1.1.1', '1.2.5' г.м). Ерөнхий журналаас мөнгөн гүйлгээний кодоор
-- нэгтгэж импортолно. amount = эерэг (орлого ч, зарлага ч).
CREATE TABLE IF NOT EXISTS cash_flow_lines (
    id          BIGSERIAL PRIMARY KEY,
    year        SMALLINT NOT NULL,
    period      TEXT NOT NULL DEFAULT 'annual',
    cf_code     TEXT NOT NULL,                  -- МГТ мөрийн код
    amount      NUMERIC(18, 2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (year, period, cf_code)
);

CREATE INDEX IF NOT EXISTS idx_cash_flow_year ON cash_flow_lines (year, period);


-- ── 16. Ерөнхий журнал (General Journal) ────────────────────────────────
-- Гүйлгээ бүр нэг мөр: debit_code/credit_code дансыг amount-аар хөдөлгөнө.
-- Энэ нь дансны үлдэгдэл, гүйлгээ баланс, тайлангуудын ҮНДСЭН эх сурвалж.
-- Эхний үлдэгдлийг өмнөх оны 12-31-нээр (opening) бичилтээр оруулна.
-- cf_code = мөнгөн гүйлгээний код (мөнгөн гүйлгээний тайланд ашиглана).
CREATE TABLE IF NOT EXISTS journal_entries (
    id           BIGSERIAL PRIMARY KEY,
    entry_no     INTEGER,                       -- журналын дугаар
    txn_date     DATE NOT NULL,                 -- гүйлгээний огноо
    description  TEXT,                          -- гүйлгээний утга
    partner_code TEXT,
    partner_name TEXT,
    amount       NUMERIC(18, 2) NOT NULL DEFAULT 0,
    debit_code   TEXT,                          -- accounts.code (Дт)
    credit_code  TEXT,                          -- accounts.code (Кт)
    cf_code      TEXT,                          -- мөнгөн гүйлгээний код
    is_opening   BOOLEAN DEFAULT FALSE,         -- эхний үлдэгдлийн бичилт эсэх
    source       TEXT,                          -- модулийн эх сурвалж (manual/cash/inventory/salary/asset/vat/fx)
    journal_id   BIGINT,                        -- journals(id) тусгал — устгахад холбоно
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_date   ON journal_entries (txn_date);
CREATE INDEX IF NOT EXISTS idx_journal_debit  ON journal_entries (debit_code);
CREATE INDEX IF NOT EXISTS idx_journal_credit ON journal_entries (credit_code);
CREATE INDEX IF NOT EXISTS idx_journal_cf     ON journal_entries (cf_code);
CREATE INDEX IF NOT EXISTS idx_journal_src    ON journal_entries (journal_id);
-- Хуучин хүснэгтэд багана нэмэх (idempotent):
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS source     TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS journal_id BIGINT;


-- ── 17. Журналаас дансны үлдэгдэл (динамик) view ────────────────────────
-- Данс бүрийн нийт Дт, Кт, цэвэр үлдэгдэл (debit-positive). Огноогоор
-- шүүхийн тулд эндээс цааш query-д WHERE нэмж болно.
CREATE OR REPLACE VIEW journal_account_balances AS
SELECT
    EXTRACT(YEAR FROM txn_date)::SMALLINT AS year,
    code,
    SUM(debit)  AS total_debit,
    SUM(credit) AS total_credit,
    SUM(debit) - SUM(credit) AS net_balance
FROM (
    SELECT txn_date, debit_code  AS code, amount AS debit, 0::numeric AS credit
      FROM journal_entries WHERE debit_code IS NOT NULL
    UNION ALL
    SELECT txn_date, credit_code AS code, 0::numeric AS debit, amount AS credit
      FROM journal_entries WHERE credit_code IS NOT NULL
) t
GROUP BY EXTRACT(YEAR FROM txn_date), code;


-- ── 18. Огнооны мужаар гүйлгээ баланс (journal-derived) ─────────────────
-- Дурын [d_from, d_to] мужид данс бүрийн эхний/эцсийн үлдэгдэл (debit-positive).
-- opening = огнооноос өмнөх Σ, closing = opening + мужийн гүйлгээ. Сар/улирлын
-- гүйлгээ баланс, татварын тайлант үед ашиглана. supabase.rpc(...)-аар дуудна.
CREATE OR REPLACE FUNCTION trial_balance_range(d_from DATE, d_to DATE)
RETURNS TABLE(code TEXT, name TEXT, opening NUMERIC, closing NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
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
  )
  SELECT a.code, ac.name, ROUND(a.opening, 2) AS opening,
         ROUND(a.opening + a.period, 2) AS closing
  FROM agg a LEFT JOIN accounts ac ON ac.code = a.code
  WHERE a.opening <> 0 OR a.period <> 0
  ORDER BY a.code;
$$;
