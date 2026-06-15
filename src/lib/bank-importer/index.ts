// index.ts — bank-importer-ийн public API.
// Эх сурвалж: bank_importer/importer.py (DB-гүй хэсэг).
//
// DB ажиллагаа (cutoff унших, upsert) нь Next.js server action-д байна —
// энд зөвхөн цэвэр parse + ангилал логик.
import { ACCOUNT_PATTERNS, COMPANY_TT, COMPANY_TR } from "./config";
import { applyCodes } from "./coder";
import { parseFile } from "./parsers";
import type { AccountId, NormalizedTxn } from "./types";

export type { AccountId, NormalizedTxn } from "./types";
export { CATEGORY_CODES, INCOME_CODES, EXPENSE_CODES, BANK_DISPLAY, BANK_GL } from "./config";

// Файлын нэрэн дэх дансны дугаараар account_id тодорхойлно.
// Жнь: 'ST_411096635_9697.XLS' → 'TT'
export function detectAccountId(filename: string): AccountId | null {
  const name = filename.toUpperCase();
  for (const [pattern, accountId] of Object.entries(ACCOUNT_PATTERNS)) {
    if (name.includes(pattern.toUpperCase())) return accountId;
  }
  return null;
}

// TT компанийн данс уу? (MNT TT + GM + MB + гадаад валют TTU/TTE)
const TT_FAMILY: AccountId[] = ["TT", "GM", "MB", "TTU", "TTE"];

// account_id → company нэр.
export function companyOf(accountId: AccountId): string {
  return TT_FAMILY.includes(accountId) ? COMPANY_TT : COMPANY_TR;
}

// Нэг файлыг parse + ангилал + company хийж нормчилсон мөрүүд буцаана (DB-гүй).
export function normalizeFile(
  buffer: ArrayBuffer | Buffer,
  accountId: AccountId,
  cutoff: Date,
): NormalizedTxn[] {
  const company = companyOf(accountId);
  // Ангиллын дүрэм компаниар сонгоно (TT-гэр бүл → codeTt, бусад → codeTr).
  const companyKey = TT_FAMILY.includes(accountId) ? "TT" : "TR";

  let txns = parseFile(buffer, accountId, cutoff);
  txns = txns.map((t) => applyCodes(t, companyKey));

  // Company нэр, валют (анхдагч MNT), Master Data талбар.
  return txns.map((t) => ({
    ...t,
    company,
    currency: t.currency ?? "MNT",
    master_code: null,
    master_name: null,
  }));
}
