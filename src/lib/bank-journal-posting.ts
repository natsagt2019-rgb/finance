// ============================================================
// Банкны гүйлгээ (transactions) → journal_entries (double-entry) бичих цөм.
// ============================================================
// Эх сурвалж: scripts/journal-from-cash-2026.mjs логик.
//   Орлого:  Дт банк / Кт ангиллын данс
//   Зарлага: Дт ангиллын данс / Кт банк
// Idempotent: description нь "CASH{yy}:" угтвартай — дахин бичихэд эхлээд устгана.
// ============================================================

// Банк (account_id) → чартын мөнгөн данс.
export const BANK_CODE: Record<string, string> = {
  GM: "110101",
  TT: "110102",
  MB: "110103",
};

// Ангиллын код → чартын данс.
export const CAT_ACCOUNT: Record<string, string> = {
  // Орлого
  "1.1.1": "120101", "1.1.2": "120101", "1.1.3": "840201", "1.1.4": "120101",
  "5.1.1": "120105", "5.1.2": "120105", "5.1.3": "120601",
  // Зарлага
  // Цалин ОЛГОЛТ (2.1.1, 2.2.2 Мост Мони) → цалингийн ӨГЛӨГ 310201 (зардал биш!).
  // Зардал 700101 нь цалин тооцох үед хүлээгдэнэ; банкны олголт зөвхөн өглөгийг хаана.
  "1.2.1": "610201", "1.2.2": "610201", "2.1.1": "310201", "2.1.3": "700401",
  "2.1.5": "700801", "2.1.10": "701401", "2.1.14": "702701", "2.2.1": "310401",
  "2.2.2": "310201", "2.2.3": "310601", "2.2.4": "310501", "3.2.1": "200601",
  "3.2.2": "200501", "5.2.1": "120105", "5.2.2": "120105", "5.2.3": "120601",
};

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
  // Журналд орохгүй (CAT-д байхгүй) ангиллын кодууд → тоо.
  missingCodes: Record<string, number>;
  // Банкны кодгүй (TTU/TTE/TR г.м.) гүйлгээний тоо.
  skippedNoBank: number;
};

// description-ийн idempotent угтвар (он бүрд).
export function postingPrefix(year: number): string {
  return `CASH${String(year).slice(2)}:`;
}

function isoDate(d: string): string {
  return String(d).slice(0, 10);
}

// transactions → journal_entries мөрүүд (цэвэр функц).
export function buildBankJournalRows(
  txns: PostingTxn[],
  year: number,
): BuildResult {
  const prefix = postingPrefix(year);
  const rows: JournalEntryRow[] = [];
  const missingCodes: Record<string, number> = {};
  let skipped = 0;
  let skippedNoBank = 0;

  for (const t of txns) {
    const bank = BANK_CODE[t.account_id];
    const isIncome = Number(t.income) > 0;
    const code = isIncome ? t.income_code : t.expense_code;
    const cat = code ? CAT_ACCOUNT[code] : undefined;
    const amount = Number(t.income) || Number(t.expense) || 0;

    if (!bank) {
      skippedNoBank++;
      skipped++;
      continue;
    }
    if (!cat || amount <= 0) {
      if (code && !cat) missingCodes[code] = (missingCodes[code] ?? 0) + 1;
      skipped++;
      continue;
    }

    rows.push({
      txn_date: isoDate(t.txn_date),
      description: `${prefix} ${(t.description || "").slice(0, 180)}`,
      partner_code: t.master_code,
      partner_name: t.master_name,
      amount,
      debit_code: isIncome ? bank : cat,
      credit_code: isIncome ? cat : bank,
      cf_code: (code && CAT_CF[code]) || null,
      is_opening: false,
    });
  }

  return { rows, made: rows.length, skipped, missingCodes, skippedNoBank };
}
