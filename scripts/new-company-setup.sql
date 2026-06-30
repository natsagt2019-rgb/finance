-- ============================================================
-- ШИНЭ КОМПАНИЙН БААЗ — БҮТЭЦ (өгөгдөлгүй)
-- ============================================================
-- Шинэ Supabase project үүсгээд, энэ файлыг бүхэлд нь SQL Editor-д
-- хуулж ажиллуулна. Бүх хүснэгт, view, RPC, индекс үүснэ. Гүйлгээ/өгөгдөл
-- ОРОХГҮЙ — компани цэвэрээс эхэлнэ.
--
-- Дансны төлөвлөгөө (chart of accounts) хэрэгтэй бол дараа нь тусад нь
-- accounts seed ажиллуулна (заавал биш).
-- Автоматаар угсарсан: scripts/_build-new-company-setup.mjs
-- ============================================================

-- Функцийн биеийг үүсгэх үед шалгахгүй (урагшаа лавлагаа: pnorm г.м. дараа
-- тодорхойлогддог — pg_dump-ийн стандарт арга). Ажиллах үед бүгд бэлэн болсон байна.
SET check_function_bodies = false;

-- Trigram extension (харилцагчийн нэр fuzzy тулгалтад шаардлагатай)
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ════════════════════════════════════════════════════════════
-- FILE: bank_importer/schema.sql
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/journals-schema.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- journals + journal_lines — Журналын бичилт (давхар бичилт)
-- ============================================================
-- Стандарт давхар бичилтийн загвар: мөр бүр = нэг данс + дебет/кредит.
-- Σ debit = Σ credit (баланс). Supabase SQL Editor-д ажиллуулна.
-- ============================================================

CREATE TABLE IF NOT EXISTS journals (
    id           BIGSERIAL PRIMARY KEY,
    date         DATE NOT NULL,
    number       TEXT UNIQUE,                 -- GL-000001 (авто)
    description  TEXT,
    reference    TEXT,
    status       TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted')),
    source       TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'vat' | 'bank' | ...
    partner_id   BIGINT REFERENCES partners(id) ON DELETE SET NULL,
    -- Нийт дүн (баланслагдсан үед debit=credit) — жагсаалтад хурдан харуулна.
    total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    month        SMALLINT GENERATED ALWAYS AS (EXTRACT(MONTH FROM date)::SMALLINT) STORED,
    year         SMALLINT GENERATED ALWAYS AS (EXTRACT(YEAR  FROM date)::SMALLINT) STORED,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS journal_lines (
    id          BIGSERIAL PRIMARY KEY,
    journal_id  BIGINT NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
    account_id  BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
    debit       NUMERIC(18, 2) NOT NULL DEFAULT 0,
    credit      NUMERIC(18, 2) NOT NULL DEFAULT 0,
    description TEXT,
    line_no     INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS journals_date_idx        ON journals (date DESC);
CREATE INDEX IF NOT EXISTS journals_month_idx       ON journals (month);
CREATE INDEX IF NOT EXISTS journals_partner_id_idx  ON journals (partner_id);
CREATE INDEX IF NOT EXISTS journals_source_idx      ON journals (source);
CREATE INDEX IF NOT EXISTS journal_lines_journal_idx ON journal_lines (journal_id);
CREATE INDEX IF NOT EXISTS journal_lines_account_idx ON journal_lines (account_id);

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/cash-schema.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- Кассын модуль — Supabase (PostgreSQL) Schema
-- ============================================================
-- Бэлэн мөнгөний касс: олон касс (салбар/валют), орлого/зарлагын
-- баримт (КО/КЗ), кассын дэвтэр (үлдэгдэл), авто журнал (source='cash').
-- Энэхүү файлыг Supabase Dashboard → SQL Editor-д ажиллуулна.
-- accounts / partners / journals / journal_lines хүснэгт өмнө үүссэн байх ёстой.
-- ============================================================

-- ── cash_registers — кассын жагсаалт (олон касс) ────────────────────────────
-- Касс бүр өөрийн бэлэн мөнгөний GL данстай (account_id). Валют нь шошго.
CREATE TABLE IF NOT EXISTS cash_registers (
    id           BIGSERIAL PRIMARY KEY,

    name         TEXT NOT NULL,                          -- "Төв касс", "Салбар касс"...
    currency     TEXT NOT NULL DEFAULT 'MNT',            -- MNT | USD | CNY...
    account_id   BIGINT REFERENCES accounts(id) ON DELETE SET NULL,  -- кассын бэлэн мөнгөний данс
    company      TEXT,                                   -- ТҮМЭН РЕСУРС | ТҮМЭН ТЭЭХ
    note         TEXT,

    is_active    BOOLEAN NOT NULL DEFAULT TRUE,          -- зөөлөн устгал
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cash_registers_active_idx  ON cash_registers (is_active);
CREATE INDEX IF NOT EXISTS cash_registers_company_idx ON cash_registers (company);

-- ── cash_entries — кассын орлого/зарлагын баримт (кассын дэвтрийн эх) ────────
-- type: in = орлого (КО) | out = зарлага (КЗ).
-- amount нь кассын валютаар; rate-ээр MNT руу хөрвүүлж amount_mnt-д снапшот.
-- Журнал MNT-ээр бичигдэнэ.
CREATE TABLE IF NOT EXISTS cash_entries (
    id                  BIGSERIAL PRIMARY KEY,

    date                DATE NOT NULL,
    type                TEXT NOT NULL DEFAULT 'in'
                          CHECK (type IN ('in', 'out')),
    register_id         BIGINT NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,

    amount              NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- кассын валютаар (үргэлж эерэг)
    rate                NUMERIC(18, 6) NOT NULL DEFAULT 1,  -- → MNT ханш (MNT касст 1)
    amount_mnt          NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- снапшот (amount × rate)

    partner_id          BIGINT REFERENCES partners(id) ON DELETE SET NULL,    -- харилцагч
    counter_account_id  BIGINT REFERENCES accounts(id) ON DELETE SET NULL,    -- нөгөө тал (орлого/зардал/авлага/өглөг)
    doc_no              TEXT,                               -- КО-001 / КЗ-001
    description         TEXT,                               -- гүйлгээний утга
    company             TEXT,

    journal_id          BIGINT REFERENCES journals(id) ON DELETE SET NULL,    -- үүссэн журнал

    month   SMALLINT GENERATED ALWAYS AS (EXTRACT(MONTH FROM date)::SMALLINT) STORED,
    year    SMALLINT GENERATED ALWAYS AS (EXTRACT(YEAR  FROM date)::SMALLINT) STORED,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cash_entries_register_idx ON cash_entries (register_id);
CREATE INDEX IF NOT EXISTS cash_entries_date_idx     ON cash_entries (date);
CREATE INDEX IF NOT EXISTS cash_entries_type_idx     ON cash_entries (type);
CREATE INDEX IF NOT EXISTS cash_entries_ym_idx       ON cash_entries (year, month);
CREATE INDEX IF NOT EXISTS cash_entries_journal_idx  ON cash_entries (journal_id);

-- ── cash_settings — нэг мөрийн тохиргоо (id = 1) ────────────────────────────
-- Баримт бүрт нөгөө тал данс заагаагүй бол энэ анхдагчийг хэрэглэнэ.
CREATE TABLE IF NOT EXISTS cash_settings (
    id                          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),

    default_income_account_id   BIGINT REFERENCES accounts(id) ON DELETE SET NULL,  -- орлогын анхдагч Кт
    default_expense_account_id  BIGINT REFERENCES accounts(id) ON DELETE SET NULL,  -- зарлагын анхдагч Дт

    auto_journal                BOOLEAN NOT NULL DEFAULT TRUE,  -- баримт бүрт журнал авто үүсгэх
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO cash_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/cash-entries-partner-cols.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- cash_entries — харилцагчийн татварын мэдээллийн снапшот
-- ============================================================
-- Баримт дээр харилцагч сонгоход авто бөглөгдөх ТТ нэр / Регистр №(ТТД).
-- partner_id-аар холбоотой ч баримт бичигдэх үеийн утгыг снапшотоор хадгална.
-- node scripts/apply-sql.mjs scripts/cash-entries-partner-cols.sql
-- ============================================================

ALTER TABLE cash_entries
  ADD COLUMN IF NOT EXISTS partner_name     TEXT,   -- ТТ нэр (снапшот)
  ADD COLUMN IF NOT EXISTS partner_register TEXT;   -- Регистр № / ТТД (снапшот)

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/cash-entries-extra-cols.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- cash_entries — нэмэлт талбарууд (Кассын орлого/зарлагын ордер загвар)
-- ============================================================
-- Хуучин системийн КО/КЗ ордерын талбаруудтай тааруулна. Бүгд nullable.
-- node scripts/apply-sql.mjs scripts/cash-entries-extra-cols.sql
-- ============================================================

ALTER TABLE cash_entries
  ADD COLUMN IF NOT EXISTS payer          TEXT,   -- Мөнгө тушаагч (орлого) / хүлээн авагч (зарлага)
  ADD COLUMN IF NOT EXISTS contract       TEXT,   -- Гэрээ
  ADD COLUMN IF NOT EXISTS project        TEXT,   -- Төслийн үйл ажиллагаа
  ADD COLUMN IF NOT EXISTS description_en TEXT;   -- Гүйлгээний утга /ENG/

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/vat-schema.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- vat_records — НӨАТ бүртгэл (eBarimt) Supabase (PostgreSQL) Schema
-- ============================================================
-- Эх сурвалж: хуучин TumenAccounting3 систем (VatRecord модель).
-- Энэхүү файлыг Supabase Dashboard → SQL Editor-д ажиллуулна.
-- ============================================================

CREATE TABLE IF NOT EXISTS vat_records (
    id                BIGSERIAL PRIMARY KEY,

    -- Огноо / сар
    date              DATE NOT NULL,
    -- date нь DATE тул EXTRACT immutable — generated багана зөвшөөрнө.
    month             SMALLINT GENERATED ALWAYS AS (EXTRACT(MONTH FROM date)::SMALLINT) STORED,
    year              SMALLINT GENERATED ALWAYS AS (EXTRACT(YEAR  FROM date)::SMALLINT) STORED,

    -- Төрөл: 'out' = борлуулалт (цуглуулсан НӨАТ), 'in' = худалдан авалт (суутгах)
    type              TEXT NOT NULL DEFAULT 'out' CHECK (type IN ('out', 'in')),

    -- eBarimt таних мэдээлэл
    ddtd              TEXT,                     -- ДДТД (eBarimt дугаар)
    parent_ddtd       TEXT,                     -- Толгой нэхэмжлэхийн ДДТД (хаалтын баримт)
    invoice_no        TEXT,

    -- Харилцагч
    partner_name      TEXT,
    partner_register  TEXT,                     -- ТТД / регистр
    partner_id        BIGINT REFERENCES partners(id) ON DELETE SET NULL,

    -- Мөнгөн дүн
    amount            NUMERIC(18, 2) DEFAULT 0, -- НӨАТ-гүй дүн
    vat_amount        NUMERIC(18, 2) DEFAULT 0, -- НӨАТ дүн
    total_amount      NUMERIC(18, 2) DEFAULT 0, -- Нийт дүн
    paid_amount       NUMERIC(18, 2) DEFAULT 0,
    remaining         NUMERIC(18, 2) DEFAULT 0,

    -- Ангилал / эх сурвалж / төлөв
    tax_type          TEXT,                     -- 'Энгийн' | 'Чөлөөлөгдөх'
    source            TEXT,                     -- 'ИБАРИМТ' | 'ПОС' | 'Гар'
    ebarimt_status    TEXT,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ДДТД-аар давхардлаас сэргийлнэ. UNIQUE constraint (partial index биш) —
-- ON CONFLICT (ddtd) дэмжинэ. NULL ddtd-ууд Postgres-д distinct тул асуудалгүй.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vat_records_ddtd_key') THEN
    ALTER TABLE vat_records ADD CONSTRAINT vat_records_ddtd_key UNIQUE (ddtd);
  END IF;
END $$;

-- Түгээмэл шүүлтийн индексүүд.
CREATE INDEX IF NOT EXISTS vat_records_type_idx        ON vat_records (type);
CREATE INDEX IF NOT EXISTS vat_records_month_idx       ON vat_records (month);
CREATE INDEX IF NOT EXISTS vat_records_date_idx        ON vat_records (date DESC);
CREATE INDEX IF NOT EXISTS vat_records_partner_id_idx  ON vat_records (partner_id);
CREATE INDEX IF NOT EXISTS vat_records_register_idx    ON vat_records (partner_register);

-- ── Хүчин төгөлдөр баримтын view (давхар тооллогоос сэргийлнэ) ───────────────
-- eBarimt-д нэг гүйлгээ 2 мөр болж ирдэг: толгой нэхэмжлэх (parent_ddtd хоосон)
-- + хаалтын баримт (parent_ddtd = толгойн ддтд). Хоёуланг тоолбол НӨАТ давхар.
-- Хаалтын баримттай болсон ТОЛГОЙ нэхэмжлэлийг хасч, хүчин төгөлдөр баримтыг
-- (болон хаалтгүй ганц баримтыг) үлдээнэ.
CREATE OR REPLACE VIEW vat_active AS
SELECT v.*
FROM vat_records v
WHERE NOT EXISTS (
    SELECT 1 FROM vat_records c
    WHERE c.parent_ddtd IS NOT NULL
      AND c.parent_ddtd <> ''
      AND c.parent_ddtd = v.ddtd
);

-- ── Сар × төрлийн нэгтгэл view (vat_active дээр) ─────────────────────────────
-- PostgREST-ийн max-rows (1000) хязгаараас зайлсхийхийн тулд server талд
-- GROUP BY хийнэ (≤24 мөр). /vat хуудас үүнийг ашиглана.
CREATE OR REPLACE VIEW vat_monthly_summary AS
SELECT
    month,
    type,
    COUNT(*)::int      AS cnt,
    SUM(vat_amount)    AS vat_sum,
    SUM(total_amount)  AS total_sum
FROM vat_active
GROUP BY month, type;

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/fx-schema.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- Ханшийн тэгшитгэл (FX revaluation) — Supabase (PostgreSQL) Schema
-- ============================================================
-- Тайлант үеийн эцэст валютын дансны үлдэгдлийг тухайн үеийн ханшаар дахин
-- үнэлж, олз/гарзыг ерөнхий журналд (journals) автоматаар бичнэ.
-- Энэхүү файлыг Supabase Dashboard → SQL Editor-д ажиллуулна.
-- ============================================================

-- ── fx_revaluations — тэгшитгэлийн толгой (нэг огноо = нэг гүйлгээ) ──────────
CREATE TABLE IF NOT EXISTS fx_revaluations (
    id           BIGSERIAL PRIMARY KEY,
    reval_date   DATE NOT NULL,                 -- тэгшитгэл хийх огноо (үеийн эцэс)
    description  TEXT,
    -- Үүсгэсэн журнал (батлахад холбогдоно). Журнал уствал NULL болно.
    journal_id   BIGINT REFERENCES journals(id) ON DELETE SET NULL,
    total_gain   NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- нийт олз
    total_loss   NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- нийт гарз
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fx_revaluations_date_idx ON fx_revaluations (reval_date DESC);

-- ── fx_revaluation_lines — данс тус бүрийн тэгшитгэлийн мөр ───────────────────
CREATE TABLE IF NOT EXISTS fx_revaluation_lines (
    id            BIGSERIAL PRIMARY KEY,
    reval_id      BIGINT NOT NULL REFERENCES fx_revaluations(id) ON DELETE CASCADE,
    account_id    BIGINT REFERENCES accounts(id) ON DELETE SET NULL,

    -- Снапшот (данс өөрчлөгдсөн ч мөр тогтвортой)
    account_code  TEXT,
    account_name  TEXT,
    currency      TEXT,                          -- USD | EUR | CNY ...

    book_balance  NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- тэгшитгэлийн өмнөх (дебет-эерэг)
    fx_balance    NUMERIC(18, 4) NOT NULL DEFAULT 0,  -- гадаад валютын үлдэгдэл
    rate          NUMERIC(18, 6) NOT NULL DEFAULT 0,  -- тухайн үеийн ханш
    revalued      NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- шинэ үнэлгээ (дебет-эерэг)
    diff          NUMERIC(18, 2) NOT NULL DEFAULT 0   -- зөрүү (+олз / −гарз)
);

CREATE INDEX IF NOT EXISTS fx_revaluation_lines_reval_idx ON fx_revaluation_lines (reval_id);
CREATE INDEX IF NOT EXISTS fx_revaluation_lines_acc_idx   ON fx_revaluation_lines (account_id);

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/inventory-schema.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- Бараа материалын модуль — Supabase (PostgreSQL) Schema
-- ============================================================
-- Эх сурвалж: Desktop\2026\Бараа_Материалын_Журам.docx (БМЖ-2026-001),
--             Desktop\2026\БМ_Журнаалын_Бичилт.docx (Дт/Кт дүрэм).
-- Энэхүү файлыг Supabase Dashboard → SQL Editor-д ажиллуулна.
-- accounts / partners / journals / journal_lines хүснэгт өмнө үүссэн байх ёстой.
-- ============================================================

-- ── inv_items — барааны карт ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inv_items (
    id              BIGSERIAL PRIMARY KEY,

    sku             TEXT,                            -- код / артикул (заавал биш)
    name            TEXT NOT NULL,                   -- барааны нэр
    category_code   TEXT NOT NULL DEFAULT '120299',  -- 120201..120299 (inventory-calc.ts CATEGORIES)
    unit            TEXT NOT NULL DEFAULT 'ш',        -- хэмжих нэгж (л, кг, ш...)
    reorder_point   NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- хамгийн бага нөөц
    company         TEXT,                            -- ТҮМЭН РЕСУРС | ТҮМЭН ТЭЭХ
    note            TEXT,

    is_active       BOOLEAN NOT NULL DEFAULT TRUE,   -- зөөлөн устгал
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inv_items_category_idx ON inv_items (category_code);
CREATE INDEX IF NOT EXISTS inv_items_company_idx  ON inv_items (company);
CREATE INDEX IF NOT EXISTS inv_items_active_idx   ON inv_items (is_active);

-- ── inv_moves — хөдөлгөөний нэгдсэн дэвтэр (FIFO эх сурвалж) ──────────────────
-- type-ийн чиглэл: in = receipt | return_in;  out = issue | return_supplier |
--                 disposal | count_adj (зөрүү дутагдал).
CREATE TABLE IF NOT EXISTS inv_moves (
    id                  BIGSERIAL PRIMARY KEY,

    date                DATE NOT NULL,
    type                TEXT NOT NULL DEFAULT 'receipt'
                          CHECK (type IN ('receipt', 'issue', 'return_supplier',
                                          'return_in', 'disposal', 'count_adj')),
    item_id             BIGINT NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,

    qty                 NUMERIC(18, 3) NOT NULL DEFAULT 0,   -- үргэлж эерэг
    unit_cost           NUMERIC(18, 4) NOT NULL DEFAULT 0,   -- орлогод оруулсан / FIFO гарлага
    total_cost          NUMERIC(18, 2) NOT NULL DEFAULT 0,   -- снапшот (qty × unit_cost)
    vat_amount          NUMERIC(18, 2) NOT NULL DEFAULT 0,   -- НӨАТ (орлогын суутгал)

    partner_id          BIGINT REFERENCES partners(id) ON DELETE SET NULL,   -- нийлүүлэгч
    counter_account_id  BIGINT REFERENCES accounts(id) ON DELETE SET NULL,   -- зардал/өглөг тал
    doc_no              TEXT,                                -- БМ-01..05 баримтын дугаар
    company             TEXT,
    note                TEXT,

    journal_id          BIGINT REFERENCES journals(id) ON DELETE SET NULL,   -- үүссэн журнал

    month   SMALLINT GENERATED ALWAYS AS (EXTRACT(MONTH FROM date)::SMALLINT) STORED,
    year    SMALLINT GENERATED ALWAYS AS (EXTRACT(YEAR  FROM date)::SMALLINT) STORED,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inv_moves_item_idx    ON inv_moves (item_id);
CREATE INDEX IF NOT EXISTS inv_moves_date_idx    ON inv_moves (date);
CREATE INDEX IF NOT EXISTS inv_moves_type_idx    ON inv_moves (type);
CREATE INDEX IF NOT EXISTS inv_moves_ym_idx      ON inv_moves (year, month);
CREATE INDEX IF NOT EXISTS inv_moves_journal_idx ON inv_moves (journal_id);

-- ── inv_counts — тооллогын мөр (БМ-05) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS inv_counts (
    id           BIGSERIAL PRIMARY KEY,
    date         DATE NOT NULL,
    item_id      BIGINT NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    book_qty     NUMERIC(18, 3) NOT NULL DEFAULT 0,   -- бүртгэлийн (FIFO) үлдэгдэл
    counted_qty  NUMERIC(18, 3) NOT NULL DEFAULT 0,   -- бодит тоо
    diff         NUMERIC(18, 3) GENERATED ALWAYS AS (counted_qty - book_qty) STORED,
    resolution   TEXT NOT NULL DEFAULT 'natural'
                   CHECK (resolution IN ('natural', 'staff')),  -- байгалийн хорогдол | ажилтан
    company      TEXT,
    move_id      BIGINT REFERENCES inv_moves(id) ON DELETE SET NULL,  -- үүссэн тохируулга
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inv_counts_item_idx ON inv_counts (item_id);
CREATE INDEX IF NOT EXISTS inv_counts_date_idx ON inv_counts (date);

-- ── inv_settings — нэг мөрийн тохиргоо (id = 1) ─────────────────────────────
-- Дансыг кодоор биш, бодит accounts.id-аар холбоно (дүрмийн 120201..299 кодууд
-- идэвхтэй төлөвлөгөөнд таарахгүй тул).
CREATE TABLE IF NOT EXISTS inv_settings (
    id                            SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),

    -- Ангилал → бараа материалын данс: { "120201": <account_id>, ... }
    category_accounts             JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Стандарт данснууд (журналд хэрэглэнэ)
    ap_account_id                 BIGINT REFERENCES accounts(id) ON DELETE SET NULL,  -- нийлүүлэгчийн өглөг (Кт)
    vat_account_id                BIGINT REFERENCES accounts(id) ON DELETE SET NULL,  -- НӨАТ-ын авлага (Дт)
    cash_account_id               BIGINT REFERENCES accounts(id) ON DELETE SET NULL,  -- кассын бэлэн мөнгө
    bank_account_id               BIGINT REFERENCES accounts(id) ON DELETE SET NULL,  -- харилцах данс
    shortage_expense_account_id   BIGINT REFERENCES accounts(id) ON DELETE SET NULL,  -- дутагдал/устгал зардал
    staff_receivable_account_id   BIGINT REFERENCES accounts(id) ON DELETE SET NULL,  -- ажилчдын авлага
    salary_payable_account_id     BIGINT REFERENCES accounts(id) ON DELETE SET NULL,  -- цалин хөлсний өглөг

    auto_journal                  BOOLEAN NOT NULL DEFAULT TRUE,  -- журнал автоматаар үүсгэх
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/salary-schema.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- Цалингийн модуль — Supabase (PostgreSQL) Schema
-- ============================================================
-- Эх сурвалж: Desktop\2026\tsalin\TSALIN_TURUL.md (тооцооллын дүрэм).
-- Энэхүү файлыг Supabase Dashboard → SQL Editor-д ажиллуулна.
-- ============================================================

-- ── employees — ажилтны бүртгэл ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
    id                BIGSERIAL PRIMARY KEY,

    name              TEXT NOT NULL,                  -- Овог Нэр
    company           TEXT,                           -- ТҮМЭН РЕСУРС | ТҮМЭН ТЭЭХ
    position          TEXT,                           -- Албан тушаал

    base_salary       NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- Үндсэн цалин
    phone_allowance   NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- Утасны нэмэгдэл

    register          TEXT,                           -- ДД / Регистр (fino "ДТК")
    bank_account      TEXT,                           -- Дансны дугаар
    hired_date        DATE,                           -- Ажилд орсон огноо
    experience_years  NUMERIC(5, 1) NOT NULL DEFAULT 0,  -- Туршлага (жил) — ЭА хоногт

    status            TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive')),
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,  -- зөөлөн устгал
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Аль хэдийн үүссэн хүснэгтэд багана нэмэх (идемпотент).
ALTER TABLE employees ADD COLUMN IF NOT EXISTS experience_years NUMERIC(5, 1) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS employees_company_idx ON employees (company);
CREATE INDEX IF NOT EXISTS employees_active_idx  ON employees (is_active);

-- ── salary_records — сар бүрийн цалингийн тооцоо ─────────────────────────────
-- Нэг ажилтан × жил × сар тутамд нэг мөр (upsert).
CREATE TABLE IF NOT EXISTS salary_records (
    id                BIGSERIAL PRIMARY KEY,

    employee_id       BIGINT REFERENCES employees(id) ON DELETE CASCADE,
    year              SMALLINT NOT NULL,
    month             SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),

    -- Снапшот (ажилтан өөрчлөгдсөн ч мөр тогтвортой)
    employee_name     TEXT,
    company           TEXT,
    base_salary       NUMERIC(18, 2) NOT NULL DEFAULT 0,

    -- Оролтын утга
    worked_hours      NUMERIC(8, 2)  NOT NULL DEFAULT 0,   -- ажилласан цаг
    month_hours       NUMERIC(8, 2)  NOT NULL DEFAULT 0,   -- сарын нийт цаг
    phone_allowance   NUMERIC(18, 2) NOT NULL DEFAULT 0,
    bonus             NUMERIC(18, 2) NOT NULL DEFAULT 0,    -- урамшуулал
    vacation_amount   NUMERIC(18, 2) NOT NULL DEFAULT 0,    -- ЭА (ээлжийн амралт)
    other_deduction   NUMERIC(18, 2) NOT NULL DEFAULT 0,    -- бусад суутгал

    -- Бодогдсон утга (salary-calc.ts-ээр тооцоолж хадгална)
    computed_salary   NUMERIC(18, 2) NOT NULL DEFAULT 0,    -- бодогдсон цалин
    gross             NUMERIC(18, 2) NOT NULL DEFAULT 0,    -- нийт цалин
    sh_insurance      NUMERIC(18, 2) NOT NULL DEFAULT 0,    -- ЭМНДШ (11.5%)
    pit               NUMERIC(18, 2) NOT NULL DEFAULT 0,    -- ХХОАТ (10%)
    advance           NUMERIC(18, 2) NOT NULL DEFAULT 0,    -- урьдчилгаа
    net               NUMERIC(18, 2) NOT NULL DEFAULT 0,    -- гарт олгох

    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (employee_id, year, month)
);

CREATE INDEX IF NOT EXISTS salary_records_ym_idx      ON salary_records (year, month);
CREATE INDEX IF NOT EXISTS salary_records_emp_idx     ON salary_records (employee_id);
CREATE INDEX IF NOT EXISTS salary_records_company_idx ON salary_records (company);

-- ── salary_settings — жил тус бүрийн тохиргоо ────────────────────────────────
CREATE TABLE IF NOT EXISTS salary_settings (
    id                BIGSERIAL PRIMARY KEY,
    year              SMALLINT NOT NULL UNIQUE,

    -- Сарын нийт ажиллах цаг (12 элемент: 1-р сараас 12-р сар)
    month_hours       JSONB NOT NULL,

    sh_rate           NUMERIC NOT NULL DEFAULT 0.115,        -- ЭМНДШ хувь
    sh_ceiling        NUMERIC NOT NULL DEFAULT 7920000,      -- ЭМНДШ дээд хязгаар
    pit_rate          NUMERIC NOT NULL DEFAULT 0.10,         -- ХХОАТ хувь
    advance_rate      NUMERIC NOT NULL DEFAULT 0.40,         -- урьдчилгаа хувь

    -- Арт.23.1 хасагдуулгын шатлал: [{ "max": 500000, "deduction": 20000 }, ...]
    pit_tiers         JSONB,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/staff-receivables-schema.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- staff_receivables — Ажилчдын авлага (БМ ↔ Цалин холбоос)
-- ============================================================
-- Бараа материалын тооллогын дутагдлыг ажилтанд хариуцуулахад нэг мөр үүснэ
-- (Дт Ажилчдын авлага / Кт Бараа материал — count_adj, resolution='staff').
-- Дараа нь цалингаас суутгахад барагдуулж, Дт Цалин хөлсний өглөг / Кт
-- Ажилчдын авлага журнал автоматаар хаагдана (/salary calc → saveSalary).
-- Эх дүрэм: БМ_Журнаалын_Бичилт.docx §4.2–4.4, §5.2.
-- inventory-schema.sql, salary-schema.sql-ийн ДАРАА ажиллуулна.
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_receivables (
    id                 BIGSERIAL PRIMARY KEY,

    employee_id        BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    employee_name      TEXT,                              -- снапшот
    date               DATE NOT NULL,
    description        TEXT,

    amount             NUMERIC(18, 2) NOT NULL DEFAULT 0, -- хариуцуулсан дүн
    recovered          NUMERIC(18, 2) NOT NULL DEFAULT 0, -- барагдсан дүн
    -- open_balance = amount − recovered
    status             TEXT NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open', 'recovered')),

    source             TEXT NOT NULL DEFAULT 'inventory', -- эх үүсвэр
    source_move_id     BIGINT REFERENCES inv_moves(id) ON DELETE SET NULL,
    charge_journal_id  BIGINT REFERENCES journals(id) ON DELETE SET NULL, -- хариуцуулсан журнал
    settle_journal_id  BIGINT REFERENCES journals(id) ON DELETE SET NULL, -- сүүлийн барагдуулсан журнал
    salary_record_id   BIGINT REFERENCES salary_records(id) ON DELETE SET NULL,

    company            TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_receivables_emp_idx    ON staff_receivables (employee_id);
CREATE INDEX IF NOT EXISTS staff_receivables_status_idx ON staff_receivables (status);
CREATE INDEX IF NOT EXISTS staff_receivables_move_idx   ON staff_receivables (source_move_id);

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/assets-schema.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- Үндсэн хөрөнгийн модуль — Supabase (PostgreSQL) Schema
-- ============================================================
-- Шулуун шугамын элэгдэл (asset-calc.ts). Энэхүү файлыг Supabase
-- Dashboard → SQL Editor-д ажиллуулна. assets-seed.sql дараа нь.
-- ============================================================

-- ── asset_categories — хөрөнгийн ангилал (бүлэг) ─────────────────────────────
CREATE TABLE IF NOT EXISTS asset_categories (
    id                  BIGSERIAL PRIMARY KEY,

    code                TEXT,                              -- ангиллын код (ҮХ-1...)
    name                TEXT NOT NULL,                     -- бүлгийн нэр
    useful_life_years   NUMERIC(5, 1) NOT NULL DEFAULT 10, -- анхдагч ашиглалтын хугацаа (жил)

    account_code        TEXT,                              -- хөрөнгийн данс (2110...)
    accum_account_code  TEXT,                              -- хуримтлагдсан элэгдлийн данс (контра)

    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asset_categories_active_idx ON asset_categories (is_active);

-- ── assets — үндсэн хөрөнгийн карт ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
    id                  BIGSERIAL PRIMARY KEY,

    name                TEXT NOT NULL,                     -- хөрөнгийн нэр
    code                TEXT,                              -- карт / нэгжийн дугаар
    category_id         BIGINT REFERENCES asset_categories(id) ON DELETE SET NULL,
    company             TEXT,                              -- ТҮМЭН РЕСУРС | ТҮМЭН ТЭЭХ

    acquired_date       DATE,                              -- орсон огноо (элэгдэл эхлэх)
    cost                NUMERIC(18, 2) NOT NULL DEFAULT 0, -- анхны өртөг
    salvage_value       NUMERIC(18, 2) NOT NULL DEFAULT 0, -- үлдэгдэл (хаягдлын) өртөг
    useful_life_years   NUMERIC(5, 1),                     -- ашиглалтын хугацаа (хоосон бол ангиллаас)

    location            TEXT,                              -- байршил
    responsible         TEXT,                              -- хариуцагч

    -- Эхний үлдэгдэл (систем рүү шилжүүлэх): тухайн огноо дахь хуримтлагдсан
    -- элэгдэл. Өгвөл элэгдлийг энэ огнооноос үргэлжлүүлж бодно (asset-calc.ts).
    opening_date        DATE,                              -- эхний үлдэгдлийн огноо
    opening_accum_depreciation NUMERIC(18, 2) NOT NULL DEFAULT 0,

    status              TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'disposed')),
    disposed_date       DATE,                              -- актласан / хассан огноо
    disposal_note       TEXT,                              -- акт/тэмдэглэл

    is_active           BOOLEAN NOT NULL DEFAULT TRUE,     -- зөөлөн устгал
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Аль хэдийн үүссэн хүснэгтэд багана нэмэх (идемпотент).
ALTER TABLE assets ADD COLUMN IF NOT EXISTS opening_date DATE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS opening_accum_depreciation NUMERIC(18, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS assets_category_idx ON assets (category_id);
CREATE INDEX IF NOT EXISTS assets_company_idx  ON assets (company);
CREATE INDEX IF NOT EXISTS assets_active_idx   ON assets (is_active);
CREATE INDEX IF NOT EXISTS assets_status_idx   ON assets (status);

-- ── asset_depreciation — сар бүрийн элэгдлийн снапшот ────────────────────────
-- Нэг хөрөнгө × жил × сар тутамд нэг мөр (upsert). asset-calc.ts-ээр бодно.
CREATE TABLE IF NOT EXISTS asset_depreciation (
    id                      BIGSERIAL PRIMARY KEY,

    asset_id                BIGINT REFERENCES assets(id) ON DELETE CASCADE,
    year                    SMALLINT NOT NULL,
    month                   SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),

    -- Снапшот (хөрөнгө өөрчлөгдсөн ч мөр тогтвортой)
    asset_name              TEXT,
    category_name           TEXT,
    company                 TEXT,
    cost                    NUMERIC(18, 2) NOT NULL DEFAULT 0,

    -- Бодогдсон утга
    monthly_depreciation    NUMERIC(18, 2) NOT NULL DEFAULT 0, -- тухайн сарын элэгдэл
    accumulated_depreciation NUMERIC(18, 2) NOT NULL DEFAULT 0, -- хуримтлагдсан элэгдэл
    net_book_value          NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- үлдэгдэл өртөг

    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (asset_id, year, month)
);

CREATE INDEX IF NOT EXISTS asset_depreciation_ym_idx    ON asset_depreciation (year, month);
CREATE INDEX IF NOT EXISTS asset_depreciation_asset_idx ON asset_depreciation (asset_id);

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/asset-expense-account.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- asset_categories.expense_account_code — элэгдлийн ЗАРДЛЫН данс (Дт)
-- ============================================================
-- Элэгдлийн журнал: Дт элэгдлийн зардал / Кт хуримтлагдсан элэгдэл.
--   • account_code        — хөрөнгийн данс (мэдээлэл)
--   • accum_account_code  — хуримтлагдсан элэгдэл (Кт)
--   • expense_account_code (ШИНЭ) — элэгдлийн зардлын данс (Дт)
-- saveDepreciation энэ гурвыг ашиглан journal_entries-д журнал бичнэ.
--
-- Supabase Dashboard → SQL Editor-д нэг удаа ажиллуулна (идемпотент).
-- ============================================================

ALTER TABLE asset_categories
    ADD COLUMN IF NOT EXISTS expense_account_code TEXT;

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/journal-entries-source-id.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- journal_entries.source_id — эх баримтын холбоос
-- ============================================================
-- Модулиас (sale/purchase г.м.) journal_entries-д ШУУД бичсэн бичилтийг
-- эх баримтын id-аар нь ялган устгах боломжтой болгоно. Өмнө нь устгалыг
-- (source + огноо + partner_name)-аар хийдэг байсан тул нэг өдөр нэг
-- харилцагчид олон гүйлгээтэй бол бусдын журнал хамт устах эрсдэлтэй байв.
--
-- Supabase Dashboard → SQL Editor-д нэг удаа ажиллуулна (идемпотент).
-- ============================================================

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS source_id BIGINT;

CREATE INDEX IF NOT EXISTS journal_entries_source_idx
    ON journal_entries (source, source_id);

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/trial-balance-full-range.sql
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/worksheet-rpc.sql
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/partner-merge-rpc.sql
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/bank-accounts-schema.sql
-- ════════════════════════════════════════════════════════════
-- Банкны данс (хуулга цэгцлэгчид ашиглана). Файлын нэрэн дэх дансны дугаараар
-- тухайн дансыг таниж, банкны төрлөөр parser сонгоно. GL код = харилцах дансны
-- өөрийн код (орлого→Дт, зарлага→Кт). Тохиргоо → Банкны данс хуудаснаас удирдана.
CREATE TABLE IF NOT EXISTS bank_accounts (
    id          BIGSERIAL PRIMARY KEY,
    account_no  TEXT NOT NULL,                    -- дансны дугаар (файлын нэрэнд агуулагдана)
    bank_type   TEXT NOT NULL DEFAULT 'tdb',      -- 'tdb' | 'golomt' | 'mbank'
    label       TEXT NOT NULL DEFAULT '',         -- харагдах нэр
    gl_code     TEXT,                             -- харилцах дансны GL код (110xxx)
    currency    TEXT NOT NULL DEFAULT 'MNT',
    sort        INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_no ON bank_accounts (account_no);

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/company-settings-schema.sql
-- ════════════════════════════════════════════════════════════
-- Үндсэн байгууллагын мэдээлэл (нэг мөр, id=1). Нэхэмжлэх г.м. баримтад
-- хэвлэгдэнэ. Тохиргоо → Байгууллага хуудаснаас засна. Idempotent.
CREATE TABLE IF NOT EXISTS company_settings (
    id            SMALLINT PRIMARY KEY DEFAULT 1,
    name          TEXT NOT NULL DEFAULT '',   -- "Компани" ХХК
    name_upper    TEXT NOT NULL DEFAULT '',   -- ИХ ҮСГЭЭР (тамга/толгойд)
    address       TEXT NOT NULL DEFAULT '',
    phone         TEXT NOT NULL DEFAULT '',
    email         TEXT NOT NULL DEFAULT '',
    web           TEXT NOT NULL DEFAULT '',
    register      TEXT NOT NULL DEFAULT '',   -- ТТД (улсын бүртгэл)
    tax_id        TEXT NOT NULL DEFAULT '',   -- НӨАТ дугаар
    bank_name     TEXT NOT NULL DEFAULT '',
    bank_account  TEXT NOT NULL DEFAULT '',
    bank_iban     TEXT NOT NULL DEFAULT '',
    director      TEXT NOT NULL DEFAULT '',   -- захирал (гарын үсэг)
    accountant    TEXT NOT NULL DEFAULT '',   -- нягтлан (гарын үсэг)
    is_vat_payer  BOOLEAN NOT NULL DEFAULT TRUE,  -- НӨАТ төлөгч эсэх (нэхэмжлэлд 10% тооцох)
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT company_settings_singleton CHECK (id = 1)
);

-- Хуучин хүснэгтэд багана нэмэх (idempotent).
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS is_vat_payer BOOLEAN NOT NULL DEFAULT TRUE;

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/category-gl-map-schema.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- category_gl_map — Ангилал (cashflow код) → GL данс зураглал, КОМПАНИ бүрээр.
-- ============================================================
-- "Автомат холболт" (statements) энэ хүснэгтийг суурь дүрэм болгон ашиглана:
--   Орлого:  Кт = энэ дансаар (Дт = банк авто).
--   Зарлага: Дт = энэ дансаар (Кт = банк авто).
-- Сурсан дүрэм (гараар кодолсон жишээ) байвал тэр давамгайлна; байхгүй үед
-- энэ зураглалаас авна → шинэ импорт эхний өдрөөс кодлогдоно.
--
-- company: данс бүлгийн код ('TT' = Түмэн Тээх бүлэг: TT/GM/MB/TTU/TTE,
--          'TR' = Түмэн Ресурс). Шинэ компани/төрөл нэмэхэд энд мөр нэмнэ
--          (Тохиргоо → Ангилал → данс зураглал хуудаснаас).
--
-- Анхны seed нь bank-journal-posting.ts дахь CAT_ACCOUNT-оос (амьд кодтой
-- нийцсэн, батлагдсан зураглал) авсан. Supabase SQL Editor-д ажиллуулна.
-- ============================================================

CREATE TABLE IF NOT EXISTS category_gl_map (
    id            BIGSERIAL PRIMARY KEY,
    company       TEXT NOT NULL,             -- 'TT' | 'TR' | …
    category_code TEXT NOT NULL,             -- '1.1.1', '1.2.14' …
    side          TEXT NOT NULL,             -- 'credit' (орлого) | 'debit' (зарлага)
    gl_code       TEXT NOT NULL,             -- '120101', '702701' …
    note          TEXT,                      -- ангиллын тайлбар
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT category_gl_map_uniq UNIQUE (company, category_code)
);
CREATE INDEX IF NOT EXISTS idx_category_gl_map_company ON category_gl_map (company);

-- ── TT (Түмэн Тээх бүлэг) seed — CAT_ACCOUNT-оос ─────────────────────────
INSERT INTO category_gl_map (company, category_code, side, gl_code, note) VALUES
  -- Орлого (Кт)
  ('TT', '1.1.1', 'credit', '120101', 'Үндсэн үйлчилгээний орлого (тээвэр)'),
  ('TT', '1.1.2', 'credit', '120101', 'Авлага / тооцоо орлого'),
  ('TT', '1.1.3', 'credit', '840201', 'Хүүгийн орлого'),
  ('TT', '1.1.4', 'credit', '120101', 'Буцаалтын орлого'),
  ('TT', '5.1.1', 'credit', '120105', 'Охин компани — тооцоо орлого'),
  ('TT', '5.1.2', 'credit', '120105', 'Охин компани — зээл орлого'),
  ('TT', '5.1.3', 'credit', '120601', 'Ажилтан зээл буцаалт'),
  -- Зарлага (Дт)
  ('TT', '1.2.1', 'debit', '610201', 'Поткийн зардал (одоогийн сар)'),
  ('TT', '1.2.2', 'debit', '610201', 'Поткийн зардал (өмнөх сар)'),
  ('TT', '2.1.1', 'debit', '310201', 'Цалин (олголт → цалингийн өглөг)'),
  ('TT', '2.1.3', 'debit', '700401', 'Томилолт'),
  ('TT', '2.1.5', 'debit', '700801', 'Сургалт'),
  ('TT', '2.1.10', 'debit', '701401', 'Түрээс (Гацуурт)'),
  ('TT', '2.1.14', 'debit', '702701', 'Банкны шимтгэл'),
  ('TT', '2.2.1', 'debit', '310401', 'ХХОАТ'),
  ('TT', '2.2.2', 'debit', '310201', 'Мост Мони (цалингийн өглөг)'),
  ('TT', '2.2.3', 'debit', '310601', 'НӨАТ / ААН татвар'),
  ('TT', '2.2.4', 'debit', '310501', 'НДШ / ЭМНДШ'),
  ('TT', '3.2.1', 'debit', '200601', 'Компьютер / техник хэрэгсэл'),
  ('TT', '3.2.2', 'debit', '200501', 'Тавилга / эд хогшил'),
  ('TT', '5.2.1', 'debit', '120105', 'Охин компани — тооцоо зарлага'),
  ('TT', '5.2.2', 'debit', '120105', 'Охин компани — зээл зарлага'),
  ('TT', '5.2.3', 'debit', '120601', 'Ажилтан зээл олголт')
ON CONFLICT (company, category_code) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/tax-adjustments.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- ААНОАТ гар тохируулга — түр зөрүүний татварын тал + гар мөр
-- (ААНОАТ хууль 2019.03.22 · А/144 журам)
-- ============================================================
-- kind утгууд:
--   temp_diff — түр зөрүүтэй дансны ТАТВАРЫН ТАЛЫН дүн (жилд нэг, дансаар).
--               Санхүүгийн тал нь pnl_range-аас, зөрүү = санхүү − татвар.
--               account_code заавал, amount = татварын дүн.
--   add       — гар нэмэгдэл (татвар ногдох орлогод нэмэх). account_code NULL.
--   less      — гар хасагдал (татвар ногдох орлогоос хасах). account_code NULL.
-- Supabase Dashboard → SQL Editor-д ажиллуулна. Идемпотент.
-- ============================================================

CREATE TABLE IF NOT EXISTS tax_adjustments (
    id            BIGSERIAL PRIMARY KEY,
    year          SMALLINT NOT NULL,
    kind          TEXT NOT NULL CHECK (kind IN ('temp_diff', 'add', 'less')),
    account_code  TEXT,
    label         TEXT NOT NULL DEFAULT '',
    amount        NUMERIC(18, 2) NOT NULL DEFAULT 0,
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Түр зөрүү: жил × данс тутамд нэг мөр (upsert).
CREATE UNIQUE INDEX IF NOT EXISTS tax_adjustments_tempdiff_uniq
    ON tax_adjustments (year, account_code)
    WHERE kind = 'temp_diff';

CREATE INDEX IF NOT EXISTS tax_adjustments_year_idx ON tax_adjustments (year);

COMMENT ON TABLE tax_adjustments IS
  'ААНОАТ гар тохируулга: temp_diff (татварын тал), add/less (гар мөр)';

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/invoice-lines-schema.sql
-- ════════════════════════════════════════════════════════════
-- Нэхэмжлэлийн мөр (line items). Нэг нэхэмжлэлд олон мөр. Мөрийн дүн нь
-- НӨАТ-гүй (net): amount = qty × unit_price. Нэхэмжлэлийн нийт дүн (gross) =
-- Σ amount × 1.1 (НӨАТ 10%). Мөргүй нэхэмжлэл хуучнаар (нэг дүнгээр) ажиллана.
CREATE TABLE IF NOT EXISTS invoice_lines (
    id           BIGSERIAL PRIMARY KEY,
    invoice_id   BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    sort         INT NOT NULL DEFAULT 0,
    description  TEXT NOT NULL DEFAULT '',
    qty          NUMERIC(18, 3) NOT NULL DEFAULT 1,
    unit_price   NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- НӨАТ-гүй нэгж үнэ
    amount       NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- qty × unit_price (НӨАТ-гүй)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines (invoice_id);

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/inventory-location-schema.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- C. Байршил (агуулах) мастер дата + баар код + хөдөлгөөний байршил
-- ============================================================
CREATE TABLE IF NOT EXISTS inv_locations (
    id          BIGSERIAL PRIMARY KEY,
    code        TEXT,                            -- байршлын код (заавал биш)
    name        TEXT NOT NULL,                   -- агуулах/байршлын нэр
    keeper      TEXT,                            -- няраж (хариуцагч)
    note        TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Барааны баар код.
ALTER TABLE inv_items ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Хөдөлгөөний байршил (аль агуулахад орлого/зарлага хийгдсэн).
ALTER TABLE inv_moves ADD COLUMN IF NOT EXISTS location_id BIGINT
    REFERENCES inv_locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_inv_moves_location ON inv_moves (location_id);

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/inventory-prices-schema.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- inv_prices — Барааны үнэ (B. Үнийн удирдлага)
-- ============================================================
-- Барааны зарах/өртгийн үнэ. partner_id NULL бол ерөнхий үнэ, утгатай бол
-- тухайн харилцагчийн тусгай үнэ. valid_from-оор түүх хадгалагдаж, үнийн
-- өөрчлөлтийн тайлан гарна. Хамгийн сүүлийн (valid_from max) нь идэвхтэй үнэ.
CREATE TABLE IF NOT EXISTS inv_prices (
    id          BIGSERIAL PRIMARY KEY,
    item_id     BIGINT NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    partner_id  BIGINT REFERENCES partners(id) ON DELETE CASCADE,  -- NULL = ерөнхий үнэ
    sale_price  NUMERIC(18, 2) NOT NULL DEFAULT 0,   -- зарах үнэ (НӨТ-гүй)
    cost_price  NUMERIC(18, 2) NOT NULL DEFAULT 0,   -- төлөвлөсөн өртөг (заавал биш)
    currency    TEXT NOT NULL DEFAULT 'MNT',
    valid_from  DATE NOT NULL DEFAULT CURRENT_DATE,  -- мөрдөж эхлэх огноо
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_prices_item ON inv_prices (item_id, valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_inv_prices_partner ON inv_prices (partner_id);

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/inventory-recipe-schema.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- D. Хөрвүүлэлт — Орц (BOM) + хөрвүүлэлтийн баримт
-- ============================================================
-- inv_recipes: бүтээгдэхүүн (product) 1 нэгж гаргахад орох түүхий эдүүд.
CREATE TABLE IF NOT EXISTS inv_recipes (
    id                BIGSERIAL PRIMARY KEY,
    product_item_id   BIGINT NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    component_item_id BIGINT NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    qty               NUMERIC(18, 4) NOT NULL DEFAULT 0,   -- 1 бүтээгдэхүүнд орох тоо
    note              TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT inv_recipes_uniq UNIQUE (product_item_id, component_item_id)
);
CREATE INDEX IF NOT EXISTS idx_inv_recipes_product ON inv_recipes (product_item_id);

-- inv_conversions: хөрвүүлэлтийн баримтын толгой (бүтээгдэхүүн X тоогоор гаргав).
CREATE TABLE IF NOT EXISTS inv_conversions (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    product_item_id BIGINT NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    output_qty      NUMERIC(18, 3) NOT NULL DEFAULT 0,
    total_cost      NUMERIC(18, 2) NOT NULL DEFAULT 0,   -- зарцуулсан түүхий эдийн нийт өртөг
    journal_id      BIGINT REFERENCES journals(id) ON DELETE SET NULL,
    doc_no          TEXT,
    company         TEXT,
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/assets-location-schema.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- Үндсэн хөрөнгө — БАЙРШИЛ (мастер) + БААР КОД (идемпотент migration)
-- ============================================================
--   node scripts/apply-sql.mjs scripts/assets-location-schema.sql
-- ============================================================

-- ── asset_locations — байршлын лавлах (001 Ашиглалт, 002 Агуулах ...) ──
CREATE TABLE IF NOT EXISTS asset_locations (
    id          BIGSERIAL PRIMARY KEY,
    code        TEXT,                          -- байршлын код (001, 002 ...)
    name        TEXT NOT NULL,                 -- байршлын нэр
    is_active   BOOLEAN NOT NULL DEFAULT TRUE, -- зөөлөн устгал
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asset_locations_active_idx ON asset_locations (is_active);

-- ── assets — байршлын холбоос + баар код ──
ALTER TABLE assets ADD COLUMN IF NOT EXISTS location_id BIGINT
  REFERENCES asset_locations(id) ON DELETE SET NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS barcode TEXT;
CREATE INDEX IF NOT EXISTS assets_location_idx ON assets (location_id);
CREATE INDEX IF NOT EXISTS assets_barcode_idx  ON assets (barcode);

-- ── Анхдагч байршил (идемпотент — кодоор шалгана) ──
INSERT INTO asset_locations (code, name)
SELECT v.code, v.name
FROM (VALUES ('001', 'Ашиглалт'), ('002', 'Агуулах')) AS v(code, name)
WHERE NOT EXISTS (SELECT 1 FROM asset_locations l WHERE l.code = v.code);

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/assets-movement-schema.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- Үндсэн хөрөнгө — ХӨДӨЛГӨӨН (эзэмшил шилжүүлэх / дотоод) — идемпотент migration
-- ============================================================
--   node scripts/apply-sql.mjs scripts/assets-movement-schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS asset_movements (
    id               BIGSERIAL PRIMARY KEY,
    asset_id         BIGINT REFERENCES assets(id) ON DELETE CASCADE,
    moved_date       DATE NOT NULL,                 -- хөдөлгөөний огноо
    move_type        TEXT NOT NULL                  -- custody=эзэмшил | internal=дотоод
                       CHECK (move_type IN ('custody', 'internal')),
    from_responsible TEXT,                          -- хуучин эд хариуцагч
    to_responsible   TEXT,                          -- шинэ эд хариуцагч
    from_location_id BIGINT REFERENCES asset_locations(id) ON DELETE SET NULL, -- хуучин байршил
    to_location_id   BIGINT REFERENCES asset_locations(id) ON DELETE SET NULL, -- шинэ байршил
    note             TEXT,                          -- акт/тэмдэглэл
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asset_movements_asset_idx ON asset_movements (asset_id);
CREATE INDEX IF NOT EXISTS asset_movements_date_idx  ON asset_movements (moved_date);

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/schema-sync-columns.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- Схем-нэмэлт: сүүлд нэмэгдсэн багануудыг гүйцээх (idempotent)
-- sandbox-ийн жинхэнэ схемээс гаргав 2026-06-30.
-- ============================================================
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS tax_class text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS disposal_type text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS disposal_proceeds numeric(18,2) DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS disposal_vat numeric(18,2) DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS disposal_journal_id bigint;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS location_id bigint;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS acquisition_vat numeric(18,2) DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS acquisition_journal_id bigint;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revision_kind text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revision_date date;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revision_cost numeric(18,2);
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revision_accum numeric(18,2);
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revision_life_months integer;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revision_note text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revision_journal_id bigint;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary_type text DEFAULT 'fixed'::text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.inv_items ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.inv_moves ADD COLUMN IF NOT EXISTS location_id bigint;
ALTER TABLE public.inv_moves ADD COLUMN IF NOT EXISTS lot_no text;
ALTER TABLE public.inv_moves ADD COLUMN IF NOT EXISTS expiry_date date;
ALTER TABLE public.inv_settings ADD COLUMN IF NOT EXISTS cost_method text DEFAULT 'fifo'::text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS has_vat boolean DEFAULT true;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS salary_type text DEFAULT 'fixed'::text;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS overtime_hours numeric(8,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS holiday_overtime_hours numeric(8,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS late_minutes numeric(8,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS transport_allowance numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS meal_allowance numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS fuel_allowance numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS tenure_allowance numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS overtime_pay numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS holiday_overtime_pay numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS late_deduction numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS savings_deduction numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS discipline_deduction numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS debit_code text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS credit_code text;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.inv_locations ADD COLUMN IF NOT EXISTS is_bonded boolean DEFAULT false;

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/vat-return-summary-rpc.sql
-- ════════════════════════════════════════════════════════════
-- vat_return_summary RPC (sandbox-аас гаргав 2026-06-30)
CREATE OR REPLACE FUNCTION public.vat_return_summary(d_from date, d_to date)
 RETURNS TABLE(out_taxable_base numeric, out_exempt_base numeric, out_vat numeric, out_cnt integer, in_base numeric, in_vat numeric, in_cnt integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT
    COALESCE(SUM(amount)     FILTER (WHERE type = 'out' AND COALESCE(tax_type,'') <> 'Чөлөөлөгдөх'), 0),
    COALESCE(SUM(amount)     FILTER (WHERE type = 'out' AND tax_type = 'Чөлөөлөгдөх'), 0),
    COALESCE(SUM(vat_amount) FILTER (WHERE type = 'out'), 0),
    COALESCE(COUNT(*)        FILTER (WHERE type = 'out'), 0)::int,
    COALESCE(SUM(amount)     FILTER (WHERE type = 'in'), 0),
    COALESCE(SUM(vat_amount) FILTER (WHERE type = 'in'), 0),
    COALESCE(COUNT(*)        FILTER (WHERE type = 'in'), 0)::int
  FROM vat_active
  WHERE date >= d_from AND date <= d_to;
$function$

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/enable-rls.sql
-- ════════════════════════════════════════════════════════════
-- ============================================================
-- АЮУЛГҮЙ БАЙДАЛ — Row Level Security (RLS)
-- ============================================================
-- public схемийн БҮХ хүснэгтэд RLS асааж, "зөвхөн нэвтэрсэн хэрэглэгч"
-- (authenticated) бүрэн хандах policy нэмнэ. Үүнгүйгээр anon түлхүүр
-- (хөтчид ил) нэвтрэлтгүйгээр бүх датаг унших/бичих боломжтой болдог.
--
--   • anon (нэвтрээгүй) → policy байхгүй тул БҮРЭН ХААГДАНА.
--   • authenticated (нэвтэрсэн) → бүрэн хандана (апп ингэж ажиллана).
--   • service_role (харнесс/админ) → RLS-ийг алгасна (өөрчлөлтгүй).
--
-- Энэ апп нь нэг компанийн нягтлан — урьсан бүх хэрэглэгч ижил дэвтрийг
-- хамтран хөтөлдөг тул "нэвтэрсэн бол бүрэн хандах" зөв загвар.
-- Идемпотент: дахин ажиллуулж болно (DROP POLICY IF EXISTS).
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_all ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY auth_all ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════
-- FILE: scripts/partner-pnorm-merge.sql (зөвхөн pnorm функц)
-- ════════════════════════════════════════════════════════════
-- Түрэмгий харилцагч нормчлол: UPPER, хуулийн хэлбэр (ХХК/LLC/LTD..) хасах,
-- зай/цэг/тэмдэг бүгдийг хасах. Зайтай/суффикстэй хувилбаруудыг alias-тай тулгана.
CREATE OR REPLACE FUNCTION pnorm(s TEXT) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
           regexp_replace(upper(coalesce(s,'')),
             '(ХХК|ТӨХК|КХК|ХК|ХОРШОО|LLC|LLP|LTD|INC|CORP|COLTD|CO)', '', 'g'),
           '[^0-9A-ZА-ЯЁӨҮ]', '', 'g')
$$;
