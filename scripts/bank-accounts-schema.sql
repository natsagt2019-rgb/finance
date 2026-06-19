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
