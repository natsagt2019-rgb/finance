-- ============================================================
-- Схем-нэмэлт: сүүлд нэмэгдсэн багануудыг гүйцээх (idempotent)
-- sandbox-ийн жинхэнэ схемээс гаргав 2026-06-30.
-- ============================================================
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS tax_class text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS disposal_type text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS disposal_proceeds numeric(18,2) DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS disposal_vat numeric(18,2) DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS disposal_journal_id bigint;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS location_id bigint;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS acquisition_vat numeric(18,2) DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS acquisition_journal_id bigint;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revision_kind text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revision_date date;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revision_cost numeric(18,2);
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revision_accum numeric(18,2);
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revision_life_months integer;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revision_note text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revision_journal_id bigint;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary_type text DEFAULT 'fixed'::text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.inv_items ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.inv_moves ADD COLUMN IF NOT EXISTS location_id bigint;
ALTER TABLE public.inv_moves ADD COLUMN IF NOT EXISTS lot_no text;
ALTER TABLE public.inv_moves ADD COLUMN IF NOT EXISTS expiry_date date;
ALTER TABLE public.inv_settings ADD COLUMN IF NOT EXISTS cost_method text DEFAULT 'fifo'::text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS has_vat boolean DEFAULT true;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS salary_type text DEFAULT 'fixed'::text;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS overtime_hours numeric(8,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS holiday_overtime_hours numeric(8,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS late_minutes numeric(8,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS transport_allowance numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS meal_allowance numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS fuel_allowance numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS tenure_allowance numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS overtime_pay numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS holiday_overtime_pay numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS late_deduction numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS savings_deduction numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS discipline_deduction numeric(18,2) DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS debit_code text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS credit_code text;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.inv_locations ADD COLUMN IF NOT EXISTS is_bonded boolean DEFAULT false;
