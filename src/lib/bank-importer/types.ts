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

// account_id нь дансны дугаар (эсвэл бүртгэлийн код) — динамик тул string.
export type AccountId = string;

// Банкны төрөл — parser-ийг сонгоход ашиглана.
export type BankType = "tdb" | "golomt" | "mbank";

// Нэг банкны дансны тохиргоо (bank_accounts хүснэгтээс ачаалагдана).
export type AccountConfig = {
  accountNo: string; // дансны дугаар (файлын нэрэнд агуулагдана)
  bankType: BankType; // tdb | golomt | mbank
  currency: string; // MNT | USD | EUR …
  glCode: string | null; // харилцах дансны GL код (110xxx)
  label: string; // харагдах нэр
};

// Ангилалын чиглэл: 'M' = орлого, 'N' = зарлага, '' = тодорхойгүй
export type Direction = "M" | "N" | "";
