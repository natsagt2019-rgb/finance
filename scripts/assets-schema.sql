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

    status              TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'disposed')),
    disposed_date       DATE,                              -- актласан / хассан огноо
    disposal_note       TEXT,                              -- акт/тэмдэглэл

    is_active           BOOLEAN NOT NULL DEFAULT TRUE,     -- зөөлөн устгал
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
