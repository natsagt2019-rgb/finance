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
