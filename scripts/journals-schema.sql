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
