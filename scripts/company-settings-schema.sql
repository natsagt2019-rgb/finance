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
