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
