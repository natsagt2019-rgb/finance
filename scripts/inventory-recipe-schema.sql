-- ============================================================
-- D. Хөрвүүлэлт — Орц (BOM) + хөрвүүлэлтийн баримт
-- ============================================================
-- inv_recipes: бүтээгдэхүүн (product) 1 нэгж гаргахад орох түүхий эдүүд.
CREATE TABLE IF NOT EXISTS inv_recipes (
    id                BIGSERIAL PRIMARY KEY,
    product_item_id   BIGINT NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    component_item_id BIGINT NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    qty               NUMERIC(18, 4) NOT NULL DEFAULT 0,   -- 1 бүтээгдэхүүнд орох тоо
    note              TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT inv_recipes_uniq UNIQUE (product_item_id, component_item_id)
);
CREATE INDEX IF NOT EXISTS idx_inv_recipes_product ON inv_recipes (product_item_id);

-- inv_conversions: хөрвүүлэлтийн баримтын толгой (бүтээгдэхүүн X тоогоор гаргав).
CREATE TABLE IF NOT EXISTS inv_conversions (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    product_item_id BIGINT NOT NULL REFERENCES inv_items(id) ON DELETE CASCADE,
    output_qty      NUMERIC(18, 3) NOT NULL DEFAULT 0,
    total_cost      NUMERIC(18, 2) NOT NULL DEFAULT 0,   -- зарцуулсан түүхий эдийн нийт өртөг
    journal_id      BIGINT REFERENCES journals(id) ON DELETE SET NULL,
    doc_no          TEXT,
    company         TEXT,
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
