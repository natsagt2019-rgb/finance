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
export { CATEGORY_CODES, INCOME_CODES, EXPENSE_CODES, BANK_DISPLAY } from "./config";

// Файлын нэрэн дэх дансны дугаараар account_id тодорхойлно.
// Жнь: 'ST_411096635_9697.XLS' → 'TT'
export function detectAccountId(filename: string): AccountId | null {
  const name = filename.toUpperCase();
  for (const [pattern, accountId] of Object.entries(ACCOUNT_PATTERNS)) {
    if (name.includes(pattern.toUpperCase())) return accountId;
  }
  return null;
}

// account_id → company нэр (importer.py-тэй ижил бүлэглэл).
export function companyOf(accountId: AccountId): string {
  return accountId === "TT" || accountId === "GM" || accountId === "MB"
    ? COMPANY_TT
    : COMPANY_TR;
}

// Нэг файлыг parse + ангилал + company хийж нормчилсон мөрүүд буцаана (DB-гүй).
export function normalizeFile(
  buffer: ArrayBuffer | Buffer,
  accountId: AccountId,
  cutoff: Date,
): NormalizedTxn[] {
  const company = companyOf(accountId);

  let txns = parseFile(buffer, accountId, cutoff);

  // Ангилал нэмэх (auto-coding). coder нь account_id-аар TT/TR дүрэм сонгоно.
  txns = txns.map((t) => applyCodes(t, accountId));

  // Company нэр болон Master Data талбар (одоохондоо null).
  return txns.map((t) => ({
    ...t,
    company,
    master_code: null,
    master_name: null,
  }));
}
