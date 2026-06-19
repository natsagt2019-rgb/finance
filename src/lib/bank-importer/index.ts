// index.ts — bank-importer-ийн public API.
// Эх сурвалж: bank_importer/importer.py (DB-гүй хэсэг).
//
// DB ажиллагаа (cutoff унших, upsert) нь Next.js server action-д байна —
// энд зөвхөн цэвэр parse + ангилал логик.
import { applyCodes } from "./coder";
import { parseFile } from "./parsers";
import type { AccountConfig, NormalizedTxn } from "./types";

export { sheetHeaderText } from "./parsers";

export type { AccountId, AccountConfig, BankType, NormalizedTxn } from "./types";
export { CATEGORY_CODES, INCOME_CODES, EXPENSE_CODES, BANK_DISPLAY } from "./config";

// Файлын нэрэн дэх дансны дугаараар тохирох дансыг (bank_accounts) тодорхойлно.
// Жнь: 'ST_411099344_9944.XLS' + [{accountNo:'411099344',…}] → тэр данс.
export function detectAccount(
  filename: string,
  accounts: AccountConfig[],
): AccountConfig | null {
  const name = filename.toUpperCase();
  // Хамгийн урт тохирлыг эхэнд (дэд мөр давхцлаас сэргийлж).
  const sorted = [...accounts].sort(
    (a, b) => b.accountNo.length - a.accountNo.length,
  );
  for (const acc of sorted) {
    if (acc.accountNo && name.includes(acc.accountNo.toUpperCase())) return acc;
  }
  return null;
}

// Файлын агуулгын текстээс данс таних (файлын нэр дугааргүй банкинд — ж: Хас).
export function detectAccountInText(
  text: string,
  accounts: AccountConfig[],
): AccountConfig | null {
  const hay = text.toUpperCase();
  const sorted = [...accounts].sort(
    (a, b) => b.accountNo.length - a.accountNo.length,
  );
  for (const acc of sorted) {
    if (acc.accountNo && hay.includes(acc.accountNo.toUpperCase())) return acc;
  }
  return null;
}

// Нэг файлыг parse + ангилал хийж нормчилсон мөрүүд буцаана (DB-гүй).
export function normalizeFile(
  buffer: ArrayBuffer | Buffer,
  account: AccountConfig,
  cutoff: Date,
): NormalizedTxn[] {
  let txns = parseFile(buffer, account, cutoff);
  // Ангиллын дүрэм (кодлол) — одоохондоо нэг ерөнхий дүрмээр.
  txns = txns.map((t) => applyCodes(t, "TT"));

  return txns.map((t) => ({
    ...t,
    company: "",
    currency: t.currency ?? account.currency ?? "MNT",
    master_code: null,
    master_name: null,
  }));
}
