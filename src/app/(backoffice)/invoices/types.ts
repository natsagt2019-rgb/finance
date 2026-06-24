// Нэхэмжлэхийн төлөв: open (нээлттэй) | partial (хэсэгчлэн) | paid (төлөгдсөн).
// "Хэтэрсэн" (overdue) нь хадгалагддаг төлөв биш — due_date-ээс хамаарч
// дэлгэцэнд тооцоологдоно.
export type InvoiceStatus = "open" | "partial" | "paid";

export type InvoiceRow = {
  id: number;
  invoice_no: string | null;
  inv_date: string; // YYYY-MM-DD
  due_date: string | null;
  partner_id: number | null;
  partner_name: string | null;
  responsible: string | null;
  description: string | null;
  amount: number;
  paid_amount: number;
  status: InvoiceStatus;
  currency: string | null;
  has_vat: boolean; // НӨАТ-тай нэхэмжлэл эсэх (амжилт = net × 1.1)
  is_active: boolean;
};

export const INVOICE_SELECT =
  "id, invoice_no, inv_date, due_date, partner_id, partner_name, " +
  "responsible, description, amount, paid_amount, status, currency, has_vat, is_active";

// Нэхэмжлэлийн мөр (line item). amount = qty × unit_price (НӨАТ-гүй).
export type InvoiceLine = {
  id?: number;
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
};

export const INVOICE_LINE_SELECT =
  "id, description, qty, unit_price, amount";

export const INVOICE_STATUSES: InvoiceStatus[] = ["open", "partial", "paid"];

// Нэхэмжлэлийн дүн/төлсөн дүнгээс төлвийг тооцоолно.
export function deriveStatus(amount: number, paid: number): InvoiceStatus {
  if (paid >= amount && amount > 0) return "paid";
  if (paid > 0) return "partial";
  return "open";
}

// Хэтэрсэн эсэх (дэлгэцийн тооцоо): хугацаа хэтэрсэн ба бүрэн төлөгдөөгүй.
export function isOverdue(
  dueDate: string | null,
  status: InvoiceStatus,
  today: string,
): boolean {
  return !!dueDate && status !== "paid" && dueDate < today;
}
