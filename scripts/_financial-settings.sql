-- ============================================================
-- Б-3: НӨАТ болон үндсэн санхүүгийн дансны кодыг config-оос уншуулах
-- Аудитын дүгнэлтийн засвар — 2026-06-30
-- ============================================================
-- Хуучнаар purchases/sales actions.ts-д хатуу кодлогдсон байсан:
--   AP=310100, AR=130100, INPUT_VAT=130600, OUTPUT_VAT=330100
-- Одоо компани тус бүрд тохируулах боломжтой болно.

CREATE TABLE IF NOT EXISTS financial_settings (
  id               BIGSERIAL PRIMARY KEY,
  company          TEXT NOT NULL UNIQUE,
  ap_code          TEXT NOT NULL DEFAULT '310100',  -- Нийлүүлэгчийн өглөг
  ar_code          TEXT NOT NULL DEFAULT '130100',  -- Худалдан авагчийн авлага
  input_vat_code   TEXT NOT NULL DEFAULT '130600',  -- Оролтын НӨАТ (суутгал)
  output_vat_code  TEXT NOT NULL DEFAULT '330100',  -- Гаралтын НӨАТ (тооцоолсон)
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE financial_settings IS
  'Компани тус бүрийн үндсэн санхүүгийн дансны код (AP, AR, НӨАТ). '
  'purchases/sales журналд ашиглана.';

-- Одоогийн default утгуудаар анхны мөр оруулах (шинэ компани нэмэхдээ дуурайна).
INSERT INTO financial_settings (company, ap_code, ar_code, input_vat_code, output_vat_code)
VALUES ('ТҮМЭН ТЭЭХ', '310100', '130100', '130600', '330100')
ON CONFLICT (company) DO NOTHING;
