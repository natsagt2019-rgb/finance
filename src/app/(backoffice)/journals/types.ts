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

// Мөрд холбосон дэд бүртгэлийн гүйлгээ (касс/банк) эсвэл eBarimt баримт.
export type TxnLink = { source: "bank" | "cash" | "vat"; id: number };

// Форм → server руу дамжих нэг мөр.
export type LineInput = {
  account_id: number | null;
  debit: number;
  credit: number;
  description: string;
  link?: TxnLink | null; // касс/банкны мөрд сонгосон гүйлгээ (журналд холбоно)
};

// Account dropdown-д хэрэгтэй хөнгөн хэлбэр.
export type AccountOption = {
  id: number;
  code: string;
  name: string;
};

// Журналд ороогүй (холбогдоогүй) касс/банк гүйлгээ ба eBarimt баримт — picker-т.
export type UnlinkedTxn = {
  source: "bank" | "cash" | "vat";
  id: number;
  date: string; // YYYY-MM-DD
  description: string;
  direction: "in" | "out"; // in = мөнгө орсон (Дт), out = гарсан (Кт)
  amount: number; // ₮
};

// Журналд ороогүй и-баримт (бүрэн дүнгээр) — журналын форм руу «дуудахад».
// Нэг баримтаас бүтэн бичилт (цэвэр + НӨАТ + нийт) угсрахад ашиглана.
export type UnlinkedEbarimt = {
  id: number;
  date: string; // YYYY-MM-DD
  type: "in" | "out"; // in = худалдан авалт, out = борлуулалт
  ddtd: string | null;
  partner_id: number | null;
  partner_name: string | null;
  net: number; // НӨАТгүй дүн
  vat: number; // НӨАТ дүн
  total: number; // нийт дүн
};
