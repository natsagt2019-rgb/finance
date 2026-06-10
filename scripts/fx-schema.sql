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
