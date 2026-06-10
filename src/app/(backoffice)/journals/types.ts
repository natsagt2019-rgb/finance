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
  total_amount: number;
  month: number | null;
};

export const JOURNAL_SELECT =
  "id, date, number, description, reference, status, source, " +
  "partner_id, total_amount, month";

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
