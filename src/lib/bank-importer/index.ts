// index.ts — bank-importer-ийн public API.
// Эх сурвалж: bank_importer/importer.py (DB-гүй хэсэг).
//
// DB ажиллагаа (cutoff унших, upsert) нь Next.js server action-д байна —
// энд зөвхөн цэвэр parse + ангилал логик.
import { applyCodes } from "./coder";
import { companyCode } from "./config";
import { parseFile } from "./parsers";
import type { AccountConfig, NormalizedTxn } from "./types";

export { sheetHeaderText } from "./parsers";

export type { AccountId, AccountConfig, BankType, NormalizedTxn } from "./types";
export { CATEGORY_CODES, INCOME_CODES, EXPENSE_CODES } from "./config";

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
// Текстэд ХАМГИЙН ЭХЭНД гарч буй бүртгэлтэй дансыг сонгоно: хуулгын өөрийн данс
// үргэлж толгой хэсэгт (Дансны дугаар) байдаг бол харьцсан данс нь доор
// гүйлгээний мөрүүдэд гардаг. Ингэснээр харьцсан данс (мөн бүртгэлтэй байвал)
// өөрийн дансыг далдлахаас сэргийлнэ. Байрлал тэнцвэл урт дугаарыг сонгоно.
export function detectAccountInText(
  text: string,
  accounts: AccountConfig[],
): AccountConfig | null {
  const hay = text.toUpperCase();
  let best: AccountConfig | null = null;
  let bestPos = Infinity;
  for (const acc of accounts) {
    if (!acc.accountNo) continue;
    const pos = hay.indexOf(acc.accountNo.toUpperCase());
    if (pos < 0) continue;
    if (
      pos < bestPos ||
      (pos === bestPos &&
        acc.accountNo.length > (best?.accountNo.length ?? 0))
    ) {
      bestPos = pos;
      best = acc;
    }
  }
  return best;
}

// Нэг файлыг parse + ангилал хийж нормчилсон мөрүүд буцаана (DB-гүй).
// Дүн нь анхны валютаар хадгалагдана (income/expense + exchange_rate); журнал/
// тайланд төгрөгт хөрвүүлэхдээ дүн × ханш ашиглана.
export function normalizeFile(
  buffer: ArrayBuffer | Buffer,
  account: AccountConfig,
  cutoff: Date,
): NormalizedTxn[] {
  let txns = parseFile(buffer, account, cutoff);
  // Ангиллын дүрэм (кодлол) — дансны компани бүлгээр (TT/TR) сонгоно.
  const co = companyCode(account.company);
  txns = txns.map((t) => applyCodes(t, co));

  return txns.map((t) => ({
    ...t,
    company: account.company ?? "",
    currency: t.currency ?? account.currency ?? "MNT",
    master_code: null,
    master_name: null,
  }));
}
