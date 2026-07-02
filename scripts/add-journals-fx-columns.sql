-- Журналд валютын (FX) талбар нэмэх — гадаад валютын гүйлгээг ханшаар нь бүртгэх.
--   currency       журналын валют ('MNT' | 'CNY' | 'USD' ...)
--   exchange_rate  1 нэгж валют → ₮ (MNT бол 1)
--   fx_amount      валютаараа илэрхийлсэн нийт дүн (₮ total_amount = fx_amount × exchange_rate)
-- journal_lines/journal_entries нь өмнөх адил ₮-өөр хадгална; эдгээр нь толгойн мета.
ALTER TABLE journals
  ADD COLUMN IF NOT EXISTS currency      text    NOT NULL DEFAULT 'MNT',
  ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fx_amount     numeric;
