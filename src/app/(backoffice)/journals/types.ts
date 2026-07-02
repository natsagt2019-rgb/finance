export type JournalStatus = "draft" | "posted";

// Журналын толгой (жагсаалтад).
export type JournalRow = {
  id: number;
  date: string; // YYYY-MM-DD
  number: string | null;
  description: string | null;
  reference: string | null;
  status: JournalStatus;
  source: string;
  partner_id: number | null;
  total_amount: number; // ₮ (валют × ханш)
  month: number | null;
  currency: string; // 'MNT' | 'CNY' | 'USD' ...
  exchange_rate: number; // 1 нэгж валют → ₮ (MNT бол 1)
  fx_amount: number | null; // валютаараа илэрхийлсэн нийт дүн
};

export const JOURNAL_SELECT =
  "id, date, number, description, reference, status, source, " +
  "partner_id, total_amount, month, currency, exchange_rate, fx_amount";

// Журналын мөр (гүйлгээний нэг мөр).
export type JournalLineRow = {
  id: number;
  journal_id: number;
  account_id: number | null;
  debit: number;
  credit: number;
  description: string | null;
  line_no: number;
};

// Форм → server руу дамжих нэг мөр.
export type LineInput = {
  account_id: number | null;
  debit: number;
  credit: number;
  description: string;
};

// Account dropdown-д хэрэгтэй хөнгөн хэлбэр.
export type AccountOption = {
  id: number;
  code: string;
  name: string;
};
