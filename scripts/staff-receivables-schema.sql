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
