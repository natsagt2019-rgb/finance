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
  is_active: boolean;
};

export const INVOICE_SELECT =
  "id, invoice_no, inv_date, due_date, partner_id, partner_name, " +
  "responsible, description, amount, paid_amount, status, currency, is_active";

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
