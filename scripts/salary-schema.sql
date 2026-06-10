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
