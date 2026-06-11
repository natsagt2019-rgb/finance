// Нормчилсон гүйлгээний нэгдсэн бүтэц (Python parsers.py-ийн dict-тэй ижил).
// Бүх банкны parser энэ хэлбэрийг буцаана.
export type NormalizedTxn = {
  account_id: AccountId;
  txn_date: Date;
  bank: string;
  description: string;
  counterparty: string;
  account_no: string;
  exchange_rate: number;
  currency?: string; // 'MNT' | 'USD' | 'EUR' … (анхдагч MNT)
  income: number | null;
  expense: number | null;
  // apply_codes-ийн дараа нэмэгдэнэ
  income_code?: string | null;
  expense_code?: string | null;
  // company нэр (TT/TR) — importer түвшинд нэмэгдэнэ
  company?: string;
  // Master Data тулгалт (одоохондоо ашиглахгүй — null)
  master_code?: string | null;
  master_name?: string | null;
};

// MNT дансууд: TT/TR/GM/MB. Гадаад валютын ТДБ дансууд: TTU(USD), TTE(EUR) — TT компани.
export type AccountId = "TT" | "TR" | "GM" | "MB" | "TTU" | "TTE";

// Ангилалын чиглэл: 'M' = орлого, 'N' = зарлага, '' = тодорхойгүй
export type Direction = "M" | "N" | "";
