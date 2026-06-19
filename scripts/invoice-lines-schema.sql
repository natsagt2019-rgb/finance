-- Нэхэмжлэлийн мөр (line items). Нэг нэхэмжлэлд олон мөр. Мөрийн дүн нь
-- НӨАТ-гүй (net): amount = qty × unit_price. Нэхэмжлэлийн нийт дүн (gross) =
-- Σ amount × 1.1 (НӨАТ 10%). Мөргүй нэхэмжлэл хуучнаар (нэг дүнгээр) ажиллана.
CREATE TABLE IF NOT EXISTS invoice_lines (
    id           BIGSERIAL PRIMARY KEY,
    invoice_id   BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    sort         INT NOT NULL DEFAULT 0,
    description  TEXT NOT NULL DEFAULT '',
    qty          NUMERIC(18, 3) NOT NULL DEFAULT 1,
    unit_price   NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- НӨАТ-гүй нэгж үнэ
    amount       NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- qty × unit_price (НӨАТ-гүй)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines (invoice_id);
