-- ============================================================
-- inv_prices — Барааны үнэ (B. Үнийн удирдлага)
-- ============================================================
-- Барааны зарах/өртгийн үнэ. partner_id NULL бол ерөнхий үнэ, утгатай бол
-- тухайн харилцагчийн тусгай үнэ. valid_from-оор түүх хадгалагдаж, үнийн
-- өөрчлөлтийн тайлан гарна. Хамгийн сүүлийн (valid_from max) нь идэвхтэй үнэ.
CREATE TABLE IF NOT EXISTS inv_prices (
    id          BIGSERIAL PRIMARY KEY,
    item_id     BIGINT NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    partner_id  BIGINT REFERENCES partners(id) ON DELETE CASCADE,  -- NULL = ерөнхий үнэ
    sale_price  NUMERIC(18, 2) NOT NULL DEFAULT 0,   -- зарах үнэ (НӨТ-гүй)
    cost_price  NUMERIC(18, 2) NOT NULL DEFAULT 0,   -- төлөвлөсөн өртөг (заавал биш)
    currency    TEXT NOT NULL DEFAULT 'MNT',
    valid_from  DATE NOT NULL DEFAULT CURRENT_DATE,  -- мөрдөж эхлэх огноо
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_prices_item ON inv_prices (item_id, valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_inv_prices_partner ON inv_prices (partner_id);
