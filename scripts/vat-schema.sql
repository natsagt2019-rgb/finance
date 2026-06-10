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

-- ── Сар × төрлийн нэгтгэл view ───────────────────────────────────────────────
-- PostgREST-ийн max-rows (1000) хязгаараас зайлсхийхийн тулд нэгтгэлийг
-- server талд GROUP BY хийнэ (≤24 мөр буцаана). /vat хуудас үүнийг ашиглана.
CREATE OR REPLACE VIEW vat_monthly_summary AS
SELECT
    month,
    type,
    COUNT(*)::int      AS cnt,
    SUM(vat_amount)    AS vat_sum,
    SUM(total_amount)  AS total_sum
FROM vat_records
GROUP BY month, type;
