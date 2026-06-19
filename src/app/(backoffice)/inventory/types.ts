// Бараа материалын модулийн төрлүүд + Supabase select мөрүүд.

// Нийтлэг build — компанийн тогтмол утга байхгүй (шаардвал энд нэмнэ).
export const COMPANIES: readonly string[] = [];

export const TABS = ["items", "moves", "stock", "count", "settings"] as const;
export type Tab = (typeof TABS)[number];

export const MOVE_TYPES = [
  "receipt",
  "issue",
  "return_supplier",
  "return_in",
  "disposal",
  "count_adj",
] as const;
export type MoveType = (typeof MOVE_TYPES)[number];

export const MOVE_TYPE_LABELS: Record<MoveType, string> = {
  receipt: "Орлого",
  issue: "Зарлага",
  return_supplier: "Нийлүүлэгчид буцаах",
  return_in: "Дотоод буцаалт",
  disposal: "Устгал",
  count_adj: "Тооллогын зөрүү",
};

// БМ маягтын дугаар (баримтжуулалт).
export const MOVE_DOC: Record<MoveType, string> = {
  receipt: "БМ-01",
  issue: "БМ-02",
  return_supplier: "БМ-03",
  return_in: "БМ-03",
  disposal: "БМ-04",
  count_adj: "БМ-05",
};

// ── Бараа ────────────────────────────────────────────────────────────────────
export type ItemRow = {
  id: number;
  sku: string | null;
  name: string;
  category_code: string;
  unit: string;
  reorder_point: number;
  company: string | null;
  note: string | null;
  is_active: boolean;
};

export const ITEM_SELECT =
  "id, sku, name, category_code, unit, reorder_point, company, note, is_active";

// ── Хөдөлгөөн ─────────────────────────────────────────────────────────────────
export type MoveRow = {
  id: number;
  date: string; // YYYY-MM-DD
  type: MoveType;
  item_id: number;
  qty: number;
  unit_cost: number;
  total_cost: number;
  vat_amount: number;
  partner_id: number | null;
  counter_account_id: number | null;
  doc_no: string | null;
  company: string | null;
  note: string | null;
  journal_id: number | null;
  month: number | null;
  year: number | null;
};

export const MOVE_SELECT =
  "id, date, type, item_id, qty, unit_cost, total_cost, vat_amount, " +
  "partner_id, counter_account_id, doc_no, company, note, journal_id, month, year";

// ── Тооллого ─────────────────────────────────────────────────────────────────
export type CountRow = {
  id: number;
  date: string;
  item_id: number;
  book_qty: number;
  counted_qty: number;
  diff: number;
  resolution: "natural" | "staff";
  company: string | null;
  move_id: number | null;
};

export const COUNT_SELECT =
  "id, date, item_id, book_qty, counted_qty, diff, resolution, company, move_id";

// ── Тохиргоо ─────────────────────────────────────────────────────────────────
export type InvSettings = {
  id: number;
  category_accounts: Record<string, number | null>;
  ap_account_id: number | null;
  vat_account_id: number | null;
  cash_account_id: number | null;
  bank_account_id: number | null;
  shortage_expense_account_id: number | null;
  staff_receivable_account_id: number | null;
  salary_payable_account_id: number | null;
  auto_journal: boolean;
};

export const SETTINGS_SELECT =
  "id, category_accounts, ap_account_id, vat_account_id, cash_account_id, " +
  "bank_account_id, shortage_expense_account_id, staff_receivable_account_id, " +
  "salary_payable_account_id, auto_journal";

// ── Туслах (dropdown-д) ──────────────────────────────────────────────────────
export type AccountOption = { id: number; code: string; name: string };
export type PartnerOption = { id: number; name: string };
