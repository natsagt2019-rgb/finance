// Ханшийн тэгшитгэлийн модулийн төрлүүд.

// Тэгшитгэх валютын данс (page → view руу дамжина).
export type FxAccount = {
  id: number;
  code: string;
  name: string;
  currency: string; // USD | EUR | CNY ...
  nature: string | null; // 'Актив' | 'Пассив'
  type: string | null; // asset | liability | ...
  bookBalance: number; // одоогийн дэвтрийн үлдэгдэл (дебет-эерэг, MNT)
  fxBalance: number; // валютын үлдэгдэл (журналын ханшаар сэргээсэн, дебет-эерэг)
};

// Өмнө хийсэн тэгшитгэлийн товч мөр (түүх).
export type FxRevaluationRow = {
  id: number;
  reval_date: string;
  description: string | null;
  journal_id: number | null;
  total_gain: number;
  total_loss: number;
  created_at: string;
};

// View → server action руу дамжих нэг мөр.
export type FxLineInput = {
  account_id: number;
  account_code: string;
  account_name: string;
  currency: string;
  nature: string | null;
  type: string | null;
  book_balance: number;
  fx_balance: number;
  rate: number;
};
