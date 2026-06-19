// ============================================================
// Банкны гүйлгээ (transactions) → journal_entries (double-entry) бичих цөм.
// ============================================================
// Эх сурвалж: scripts/journal-from-cash-2026.mjs логик.
//   Орлого:  Дт банк / Кт ангиллын данс
//   Зарлага: Дт ангиллын данс / Кт банк
// Idempotent: description нь "CASH{yy}:" угтвартай — дахин бичихэд эхлээд устгана.
// ============================================================

// Ангиллын код → мөнгөн гүйлгээний код (МГТ).
export const CAT_CF: Record<string, string> = {
  "1.1.1": "1.1.1", "1.1.2": "1.1.1", "1.1.3": "2.1.6", "1.1.4": "1.1.6",
  "5.1.2": "2.1.5", "5.1.3": "2.1.5",
  "1.2.1": "1.2.5", "1.2.2": "1.2.5", "2.1.1": "1.2.1", "2.1.3": "1.2.9",
  "2.1.5": "1.2.9", "2.1.10": "1.2.4", "2.1.14": "1.2.9", "2.2.1": "1.2.7",
  "2.2.2": "1.2.1", "2.2.3": "1.2.7", "2.2.4": "1.2.2", "3.2.1": "2.2.1",
  "3.2.2": "2.2.1", "5.2.2": "2.2.5", "5.2.3": "2.2.5",
};

// Журнал бичихэд хэрэгтэй гүйлгээний хэсэг.
export type PostingTxn = {
  txn_date: string;
  description: string | null;
  master_code: string | null;
  master_name: string | null;
  income: number | null;
  expense: number | null;
  income_code: string | null;
  expense_code: string | null;
  account_id: string;
  // Ханш — гадаад валютын дүнг төгрөгт хөрвүүлнэ (MNT-д 1). Журналд ҮРГЭЛЖ
  // төгрөгөөр бичнэ (нягтлан бодох бүртгэлийн функциональ валют = MNT).
  exchange_rate: number | null;
  // Залруулсан GL кодууд (autoLink/гар) — журналд эдгээрийг шууд хэрэглэнэ.
  debit_code: string | null;
  credit_code: string | null;
};

// journal_entries-д орох мөр.
export type JournalEntryRow = {
  txn_date: string;
  description: string;
  partner_code: string | null;
  partner_name: string | null;
  amount: number;
  debit_code: string;
  credit_code: string;
  cf_code: string | null;
  is_opening: false;
};

export type BuildResult = {
  rows: JournalEntryRow[];
  made: number;
  skipped: number;
  // Дт эсвэл Кт код дутуу (холболт хийгээгүй) тул журналд ороогүй гүйлгээний тоо.
  skippedUncoded: number;
};

// description-ийн idempotent угтвар (он бүрд).
export function postingPrefix(year: number): string {
  return `CASH${String(year).slice(2)}:`;
}

function isoDate(d: string): string {
  return String(d).slice(0, 10);
}

// transactions → journal_entries мөрүүд (цэвэр функц).
// Гүйлгээний ЗАЛРУУЛСАН debit_code/credit_code-ийг шууд журналд бичнэ
// (банкны тал авто + нөгөө тал autoLink/гараар засагдсан). Хоёр тал бүрэн
// биш бол алгасна. cf_code-ийг ангиллын кодоор тогтооно.
export function buildBankJournalRows(
  txns: PostingTxn[],
  year: number,
): BuildResult {
  const prefix = postingPrefix(year);
  const rows: JournalEntryRow[] = [];
  let skipped = 0;
  let skippedUncoded = 0;

  for (const t of txns) {
    const isIncome = Number(t.income) > 0;
    const code = isIncome ? t.income_code : t.expense_code;
    // Журнал ВСЕГДА төгрөгөөр: гадаад валютын дүнг ханшаар хөрвүүлнэ (MNT-д rate=1).
    const rate = Number(t.exchange_rate) || 1;
    const raw = Number(t.income) || Number(t.expense) || 0;
    const amount = Math.round(raw * rate * 100) / 100;
    const dt = (t.debit_code ?? "").trim();
    const kt = (t.credit_code ?? "").trim();

    if (amount <= 0) {
      skipped++;
      continue;
    }
    if (!dt || !kt) {
      skippedUncoded++;
      skipped++;
      continue;
    }

    rows.push({
      txn_date: isoDate(t.txn_date),
      description: `${prefix} ${(t.description || "").slice(0, 180)}`,
      partner_code: t.master_code,
      partner_name: t.master_name,
      amount,
      debit_code: dt,
      credit_code: kt,
      cf_code: (code && CAT_CF[code]) || null,
      is_opening: false,
    });
  }

  return { rows, made: rows.length, skipped, skippedUncoded };
}
