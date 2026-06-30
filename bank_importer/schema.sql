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

    -- Валют (MNT-ээс бусад нь тайлангуудаас тусгаарлагдана)
    currency        TEXT DEFAULT 'MNT',     -- 'MNT' | 'USD' | 'EUR' …

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
    SUM(COALESCE(income,  0) * COALESCE(exchange_rate, 1)) AS total_income,
    SUM(COALESCE(expense, 0) * COALESCE(exchange_rate, 1)) AS total_expense,
    SUM(COALESCE(income,  0) * COALESCE(exchange_rate, 1))
      - SUM(COALESCE(expense, 0) * COALESCE(exchange_rate, 1)) AS net_cashflow,
    COUNT(*)     AS txn_count
FROM transactions          -- бүх валют: дүн × ханш-аар MNT-д хөрвүүлж нэгтгэнэ
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
    SUM(COALESCE(income, expense, 0) * COALESCE(exchange_rate, 1)) AS total
FROM transactions          -- бүх валют: дүн × ханш-аар MNT-д хөрвүүлнэ
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
    SUM(COALESCE(t.income,  0) * COALESCE(t.exchange_rate, 1)) AS total_income,
    SUM(COALESCE(t.expense, 0) * COALESCE(t.exchange_rate, 1)) AS total_expense,
    b.opening_balance
        + SUM(COALESCE(t.income,  0) * COALESCE(t.exchange_rate, 1))
        - SUM(COALESCE(t.expense, 0) * COALESCE(t.exchange_rate, 1)) AS current_balance
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
    SUM(COALESCE(income,  0) * COALESCE(exchange_rate, 1)) AS total_income,
    SUM(COALESCE(expense, 0) * COALESCE(exchange_rate, 1)) AS total_expense,
    COUNT(*) AS txn_count
FROM transactions          -- бүх валют: дүн × ханш-аар MNT-д хөрвүүлнэ
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
    SUM(COALESCE(income,  0) * COALESCE(exchange_rate, 1)) AS total_income,
    SUM(COALESCE(expense, 0) * COALESCE(exchange_rate, 1)) AS total_expense,
    COUNT(*)                  AS txn_count
FROM transactions          -- бүх валют: дүн × ханш-аар MNT-д хөрвүүлнэ
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


-- ── 18b. Орлого/зардлын мужийн эргэлт — ХААЛТЫГ ХАСНА ───────────────────
-- Орлогын тайланд: жилийн хаалтын бичилт (source='close') P&L-г тэглэдэг тул
-- бохир эргэлтийг харуулахын тулд хаалтыг хасна. Баланс нь trial_balance_range
-- (хаалт орсон) ашиглана — 430101 хуримтлагдсан ашиг зөв гарна.
CREATE OR REPLACE FUNCTION pnl_range(d_from DATE, d_to DATE)
RETURNS TABLE(code TEXT, turnover NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH lines AS (
    SELECT debit_code AS code, amount AS net FROM journal_entries
      WHERE debit_code IS NOT NULL AND txn_date >= d_from AND txn_date <= d_to AND COALESCE(source,'') <> 'close'
    UNION ALL
    SELECT credit_code AS code, -amount FROM journal_entries
      WHERE credit_code IS NOT NULL AND txn_date >= d_from AND txn_date <= d_to AND COALESCE(source,'') <> 'close'
  )
  SELECT l.code, ROUND(SUM(l.net), 2) FROM lines l GROUP BY l.code HAVING ABS(SUM(l.net)) > 0.005;
$$;


-- ── 18c. Ерөнхий данс /харьцсан дансаар/ ───────────────────────────────
-- Сонгосон дансны [d_from, d_to] мужийн хөдөлгөөнийг ХАРЬЦСАН (эсрэг) дансаар
-- бүлэглэж буцаана. journal_entries нэг мөрөнд Дт(debit_code)+Кт(credit_code)
-- хоёуланг агуулдаг тул харьцсан данс = нөгөө код.
--   debit  = сонгосон данс Дт талд гарсан дүн (харьцсан данс Кт байсан)
--   credit = сонгосон данс Кт талд гарсан дүн (харьцсан данс Дт байсан)
-- is_opening=TRUE мөр нь d_from-ээс ӨМНӨХ нийлбэр (эхний үлдэгдэл тооцоход).
CREATE OR REPLACE FUNCTION general_ledger_by_contra(p_code TEXT, d_from DATE, d_to DATE)
RETURNS TABLE(
  contra_code TEXT,
  contra_name TEXT,
  debit       NUMERIC,
  credit      NUMERIC,
  is_opening  BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  -- Эхний үлдэгдэл (d_from-ээс өмнө) — нэг мөр
  SELECT NULL::text, NULL::text,
         COALESCE(SUM(amount) FILTER (WHERE debit_code  = p_code), 0),
         COALESCE(SUM(amount) FILTER (WHERE credit_code = p_code), 0),
         TRUE
  FROM journal_entries
  WHERE txn_date < d_from AND (debit_code = p_code OR credit_code = p_code)
  UNION ALL
  -- Мужийн гүйлгээ, харьцсан дансаар бүлэглэсэн
  SELECT m.contra, ac.name, ROUND(SUM(m.deb), 2), ROUND(SUM(m.cred), 2), FALSE
  FROM (
    SELECT credit_code AS contra, amount AS deb, 0::numeric AS cred
      FROM journal_entries
      WHERE txn_date >= d_from AND txn_date <= d_to
        AND debit_code = p_code AND credit_code IS DISTINCT FROM p_code
    UNION ALL
    SELECT debit_code AS contra, 0::numeric AS deb, amount AS cred
      FROM journal_entries
      WHERE txn_date >= d_from AND txn_date <= d_to
        AND credit_code = p_code AND debit_code IS DISTINCT FROM p_code
  ) m
  LEFT JOIN accounts ac ON ac.code = m.contra
  GROUP BY m.contra, ac.name;
$$;


-- ── 19. Харицсан менежер (cost center) ──────────────────────────────────
-- Гүйлгээний утгын эхэн K1–K10 = хариуцсан хүн. Нэхэмжлэх.responsible-тэй
-- нэрээр, банкны зарлага K-кодоор холбогдоно.
CREATE TABLE IF NOT EXISTS managers (
    code       TEXT PRIMARY KEY,       -- 'K1' … 'K10'
    name       TEXT NOT NULL,
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO managers (code, name) VALUES
    ('K1','Отгонбаатар'),('K2','Нямдорж'),('K3','Баяраа'),('K4','Чингүүн'),('K5','Алтансүх'),
    ('K6','Эрдэнэтуяа'),('K7','Уранзаяа'),('K8','Одонтунгалаг'),('K9','Амар'),('K10','Тэргэл')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- ── 20. Менежерийн тайлан (борлуулалт/цуглуулалт/авлага/өртөг/ашиг) ──────
-- Орлого/авлага нэхэмжлэхээс (responsible), өртөг банкнаас (K-код). supabase.rpc.
CREATE OR REPLACE FUNCTION manager_report(d_from DATE, d_to DATE)
RETURNS TABLE(code TEXT, name TEXT, sales NUMERIC, collected NUMERIC,
             receivable NUMERIC, cost NUMERIC, profit NUMERIC, inv_count INT, txn_count INT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH rev AS (
    SELECT m.code,
      SUM(i.amount) AS sales,
      SUM(COALESCE(i.paid_amount,0)) AS collected,
      SUM(i.amount - COALESCE(i.paid_amount,0)) AS receivable,
      COUNT(*)::int AS n
    FROM invoices i JOIN managers m ON m.name = i.responsible
    WHERE i.is_active AND i.inv_date >= d_from AND i.inv_date <= d_to
    GROUP BY m.code
  ),
  cost AS (
    SELECT 'K' || (regexp_match(upper(t.description), '^K([0-9]+)'))[1] AS code,
           SUM(COALESCE(t.expense,0)) AS amt, COUNT(*)::int AS n
    FROM transactions t
    WHERE (t.txn_date AT TIME ZONE INTERVAL '+08:00')::date BETWEEN d_from AND d_to
      AND (regexp_match(upper(t.description), '^K([0-9]+)')) IS NOT NULL
    GROUP BY 1
  )
  SELECT m.code, m.name,
    COALESCE(rev.sales,0)::numeric, COALESCE(rev.collected,0)::numeric,
    COALESCE(rev.receivable,0)::numeric, COALESCE(cost.amt,0)::numeric,
    (COALESCE(rev.sales,0) - COALESCE(cost.amt,0))::numeric,
    COALESCE(rev.n,0), COALESCE(cost.n,0)
  FROM managers m
  LEFT JOIN rev  ON rev.code  = m.code
  LEFT JOIN cost ON cost.code = m.code
  WHERE m.is_active
  ORDER BY (COALESCE(rev.sales,0) - COALESCE(cost.amt,0)) DESC;
$$;


-- ── 21. Өглөг (дэд гүйцэтгэгчийн тээврийн өртөг) ────────────────────────
-- Excel "Өглөг" хуудаснаас. Тээврийн ББӨ-ийн эх сурвалж (Дт 711701/Кт 310101).
-- Шилжүүлэгч = өөрийн компани (Түмэн Тээх / Түмэн Ресурс).
CREATE TABLE IF NOT EXISTS payables (
    id             BIGSERIAL PRIMARY KEY,
    pay_date       DATE,
    company        TEXT,        -- Шилжүүлэгч (өөрийн компани)
    manager        TEXT,        -- Кам
    transport_type TEXT,        -- Тээврийн төрөл
    subcontractor  TEXT,        -- Нэхэмжлэгч (дэд гүйцэтгэгч)
    description    TEXT,
    has_vat        BOOLEAN,
    amount         NUMERIC(18, 2),
    status         TEXT,
    is_active      BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payables_date ON payables (pay_date);


-- ── 22. Орлого/зардал сар бүрээр (удирдлагын дотоод тайлан) ─────────────
-- Данс бүрийн сарын эргэлт (debit-positive: зардал +, орлого −). Хаалт/эхний
-- үлдэгдлийг хасна. /reports/income-monthly хэрэглэнэ.
CREATE OR REPLACE FUNCTION pnl_monthly(y INT)
RETURNS TABLE(code TEXT, mon INT, turnover NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH lines AS (
    SELECT EXTRACT(MONTH FROM txn_date)::int m, debit_code code, amount net
      FROM journal_entries
      WHERE debit_code IS NOT NULL AND EXTRACT(YEAR FROM txn_date)=y
        AND is_opening=false AND COALESCE(source,'')<>'close'
    UNION ALL
    SELECT EXTRACT(MONTH FROM txn_date)::int, credit_code, -amount
      FROM journal_entries
      WHERE credit_code IS NOT NULL AND EXTRACT(YEAR FROM txn_date)=y
        AND is_opening=false AND COALESCE(source,'')<>'close'
  )
  SELECT l.code, l.m, SUM(l.net)::numeric
  FROM lines l JOIN accounts a ON a.code=l.code
  WHERE a.type IN ('income','expense') AND left(l.code,2)<>'92'
  GROUP BY l.code, l.m
  HAVING SUM(l.net)<>0;
$$;


-- ── 23. Харилцагчийн тооцооны товчоо (авлага/өглөг) ─────────────────────
-- Харилцагч тус бүрийн авлага/өглөгийн үлдэгдэл, as-of. Авлага = type='asset' +
-- нэр/fs_line-д "авлага" (хасагдуулгагүй); өглөг = type='liability' + "өглөг".
-- (isReceivableAccount/isPayableAccount-тай ижил логик — бүх дэд дансыг хамруулна.)
-- /reports/partner-balances хэрэглэнэ.
CREATE OR REPLACE FUNCTION partner_balances(d_to DATE)
RETURNS TABLE(partner TEXT, receivable NUMERIC, payable NUMERIC, txn_count INT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH ar AS (
    SELECT code FROM accounts
    WHERE type='asset'
      AND lower(coalesce(name,'')||' '||coalesce(fs_line,'')) LIKE '%авлага%'
      AND lower(coalesce(name,'')||' '||coalesce(fs_line,'')) NOT LIKE '%хасагдуулга%'
  ),
  ap AS (
    SELECT code FROM accounts
    WHERE type='liability'
      AND lower(coalesce(name,'')||' '||coalesce(fs_line,'')) LIKE '%өглөг%'
  )
  SELECT partner_name,
    COALESCE(SUM(CASE WHEN debit_code IN (SELECT code FROM ar) THEN amount
                      WHEN credit_code IN (SELECT code FROM ar) THEN -amount ELSE 0 END),0)::numeric,
    COALESCE(SUM(CASE WHEN credit_code IN (SELECT code FROM ap) THEN amount
                      WHEN debit_code IN (SELECT code FROM ap) THEN -amount ELSE 0 END),0)::numeric,
    COUNT(*)::int
  FROM journal_entries
  WHERE partner_name IS NOT NULL AND partner_name<>'' AND txn_date<=d_to
    AND (debit_code IN (SELECT code FROM ar) OR credit_code IN (SELECT code FROM ar)
      OR debit_code IN (SELECT code FROM ap) OR credit_code IN (SELECT code FROM ap))
  GROUP BY partner_name
  HAVING ABS(COALESCE(SUM(CASE WHEN debit_code IN (SELECT code FROM ar) THEN amount
                              WHEN credit_code IN (SELECT code FROM ar) THEN -amount ELSE 0 END),0))>1
      OR ABS(COALESCE(SUM(CASE WHEN credit_code IN (SELECT code FROM ap) THEN amount
                              WHEN debit_code IN (SELECT code FROM ap) THEN -amount ELSE 0 END),0))>1;
$$;


-- ── 24. НӨАТ-ын тооцоо харилцагчаар (output 330100 / input 130600) ──────
-- Гарах НӨАТ = 330100 (НӨАТ-ын өглөг, createSale), орох НӨАТ = 130600 (НӨАТ-ын
-- авлага, createPurchase). Хуучин 310601/120201 кодууд энэ COA-д БАЙХГҮЙ тул
-- /reports/vat-settlement хоосон гарч байсныг зассан.
CREATE OR REPLACE FUNCTION vat_by_partner(d_from DATE, d_to DATE)
RETURNS TABLE(partner TEXT, output_vat NUMERIC, input_vat NUMERIC, txn_count INT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT partner_name,
    COALESCE(SUM(CASE WHEN credit_code='330100' THEN amount WHEN debit_code='330100' THEN -amount ELSE 0 END),0)::numeric,
    COALESCE(SUM(CASE WHEN debit_code='130600' THEN amount WHEN credit_code='130600' THEN -amount ELSE 0 END),0)::numeric,
    COUNT(*)::int
  FROM journal_entries
  WHERE partner_name IS NOT NULL AND partner_name<>'' AND txn_date>=d_from AND txn_date<=d_to
    AND (debit_code IN ('330100','130600') OR credit_code IN ('330100','130600'))
  GROUP BY partner_name
  HAVING ABS(COALESCE(SUM(CASE WHEN credit_code='330100' THEN amount WHEN debit_code='330100' THEN -amount ELSE 0 END),0))>1
      OR ABS(COALESCE(SUM(CASE WHEN debit_code='130600' THEN amount WHEN credit_code='130600' THEN -amount ELSE 0 END),0))>1;
$$;


-- ── 25. Худалдан авалт (purchase → НӨАТ суутгал → өглөг) ────────────────
-- createPurchase: Дт expense_code (цэвэр) + Дт 130600 НӨАТ / Кт 310100 өглөг.
CREATE TABLE IF NOT EXISTS purchases (
    id           BIGSERIAL PRIMARY KEY,
    pur_date     DATE NOT NULL,
    doc_no       TEXT,
    partner_id   BIGINT,
    partner_name TEXT,
    description  TEXT,
    expense_code TEXT,                       -- Дт данс (зардал/бараа/ҮХ)
    net_amount   NUMERIC(18, 2) DEFAULT 0,   -- НӨАТ-гүй
    vat_amount   NUMERIC(18, 2) DEFAULT 0,   -- input НӨАТ (130600)
    total_amount NUMERIC(18, 2) DEFAULT 0,
    status       TEXT DEFAULT 'posted',
    company      TEXT,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases (pur_date);


-- ── 26. Борлуулалт (sale → output НӨАТ → авлага) ───────────────────────
-- createSale: Дт 130100 авлага (нийт) / Кт revenue_code (цэвэр) + Кт 330100 НӨАТ.
CREATE TABLE IF NOT EXISTS sales (
    id           BIGSERIAL PRIMARY KEY,
    sale_date    DATE NOT NULL,
    doc_no       TEXT,
    partner_id   BIGINT,
    partner_name TEXT,
    description  TEXT,
    revenue_code TEXT,                       -- Кт орлогын данс
    net_amount   NUMERIC(18, 2) DEFAULT 0,
    vat_amount   NUMERIC(18, 2) DEFAULT 0,
    total_amount NUMERIC(18, 2) DEFAULT 0,
    status       TEXT DEFAULT 'posted',
    company      TEXT,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales (sale_date);
