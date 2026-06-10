export type VatType = "out" | "in";

export type VatRow = {
  id: number;
  date: string; // YYYY-MM-DD
  month: number | null;
  year: number | null;
  type: VatType;
  ddtd: string | null;
  parent_ddtd: string | null;
  invoice_no: string | null;
  partner_name: string | null;
  partner_register: string | null;
  partner_id: number | null;
  amount: number;
  vat_amount: number;
  total_amount: number;
  tax_type: string | null;
  source: string | null;
  ebarimt_status: string | null;
};

export const VAT_SELECT =
  "id, date, month, year, type, ddtd, parent_ddtd, invoice_no, " +
  "partner_name, partner_register, partner_id, amount, vat_amount, " +
  "total_amount, tax_type, source, ebarimt_status";
