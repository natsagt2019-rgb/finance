// parsers.ts — Банкны хуулга файл унших.
// Эх сурвалж: bank_importer/parsers.py-г үнэн зөв хөрвүүлсэн.
//
// Python дахь xlrd (TDB/MBank) + pandas/openpyxl (Golomt)-ийг бүгдийг
// SheetJS (xlsx) орлоно — .xls (BIFF) ба .xlsx хоёуланг уншина.
//
// Бүх parser нь нийтлэг NormalizedTxn бүтэц буцаана.
import * as XLSX from "xlsx";

import {
  TDB_COL, GOLOMT_COL, MBANK_COL, TDB_COMPACT_COL,
  SKIP_KEYWORDS, GENERIC_COUNTERPARTIES,
} from "./config";
import type { AccountConfig, NormalizedTxn } from "./types";

type Row = unknown[];

// ── Тусламжийн функцүүд ───────────────────────────────────────────────────

function shouldSkip(description: string): boolean {
  const d = String(description).toLowerCase();
  return SKIP_KEYWORDS.some((kw) => d.includes(kw));
}

// Гүйлгээний утгыг стандарт хэлбэрт оруулах (EB- угтвар, данс мэдээлэл хасах).
function cleanDescription(desc: unknown, accountNo = ""): string {
  let s = String(desc ?? "").trim();
  s = s.replace(/^[EЕ][BВ]\s*[-–]\s*/i, "").trim();
  if (accountNo) {
    s = s
      .replace(new RegExp(`\\s*:\\s*\\d+-\\(${accountNo}[^)]*\\)->[\\s\\S]*$`), "")
      .trim();
  }
  s = s.replace(/\s*:\s*\d+-\([^)]*\)->\s*\d+-[^:]*$/, "").trim();
  return s;
}

// Харилцагч ерөнхий нэр байвал тайлбараас бодит нэр олох оролдлого.
function extractCounterparty(rawDesc: string, ctpy: string): string {
  if (!GENERIC_COUNTERPARTIES.has(String(ctpy).trim().toUpperCase())) {
    return ctpy;
  }

  // (дансны_дугаар-Компанийн нэр) хэлбэр
  for (const m of String(rawDesc).matchAll(/\((\d+)-([^)]+)\)/g)) {
    const nm = m[2].trim();
    if (!nm.toUpperCase().includes("ТҮМЭН ТЭЭХ") && nm.length > 3) return nm;
  }

  // Монгол үсгийн компанийн нэр хайх
  const mm = String(rawDesc).match(
    /([А-ЯЁҮӨA-Z][А-ЯЁҮӨA-Z\s-]+?(?:ХХК|ХК|ТББ|ХНН|ТҮЦ|ОНД))(?:[^А-ЯЁҮӨA-Z]|$)/,
  );
  if (mm) {
    const nm = mm[1].replace(/^[\s-]+|[\s-]+$/g, "");
    if (!nm.toUpperCase().includes("ТҮМЭН ТЭЭХ") && nm.length > 3) return nm;
  }

  return ctpy;
}

// Excel serial (float ≥ 40000) эсвэл Date-ийг JS Date болгох (xldate орлоно).
function toExcelDate(val: unknown): Date | null {
  if (val instanceof Date) return Number.isNaN(val.getTime()) ? null : val;
  if (typeof val === "number" && val >= 40000) {
    const o = XLSX.SSF.parse_date_code(val);
    if (!o) return null;
    return new Date(
      Date.UTC(o.y, o.m - 1, o.d, o.H || 0, o.M || 0, Math.floor(o.S || 0)),
    );
  }
  return null;
}

// ISO string эсвэл Date-ийг JS Date болгох (Golomt/MBank огноо).
function toIsoDate(val: unknown): Date | null {
  if (val instanceof Date) return Number.isNaN(val.getTime()) ? null : val;
  if (val === null || val === undefined || val === "") return null;
  const d = new Date(String(val).trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

// Мөнгөн дүнг тоо болгох (хоосон/текст → 0).
function toNum(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const n =
    typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function cell(row: Row, idx: number): unknown {
  return idx < row.length ? row[idx] : null;
}

// ── Parser функцүүд ───────────────────────────────────────────────────────

// ТДБ дансны дугаар (description цэвэрлэхэд).
// ТДБ "wide" XLS формат унших. Гадаад валютад ханш col16-аас.
// cutoff-аас хойших гүйлгээг л авна.
export function parseTdb(
  rows: Row[],
  account: AccountConfig,
  cutoff: Date,
): NormalizedTxn[] {
  const accountNo = account.accountNo;
  const currency = account.currency || "MNT";
  const col = TDB_COL;
  const result: NormalizedTxn[] = [];

  for (let i = col.data_start_row; i < rows.length; i++) {
    const row = rows[i] ?? [];
    // Огноо: serial, Date эсвэл ISO string бүгдийг дэмжинэ.
    const txnDate = toExcelDate(cell(row, col.date)) ?? toIsoDate(cell(row, col.date));
    if (!txnDate) continue; // огноогүй мөр (хоосон/footer) таслагдана

    if (txnDate.getTime() <= cutoff.getTime()) continue;

    const income = toNum(cell(row, col.income));
    const expense = toNum(cell(row, col.expense));
    if (income === 0 && expense === 0) continue;

    const rawDesc = String(cell(row, col.description) ?? "");
    if (shouldSkip(rawDesc)) continue;

    const rawCtpy = String(cell(row, col.counterparty) ?? "").trim();
    const ctpy = extractCounterparty(rawDesc, rawCtpy);
    const desc = cleanDescription(rawDesc, accountNo);
    // MNT-д ханш 1; гадаад валютад файлын ханш (col16).
    const rate = currency === "MNT" ? 1 : toNum(cell(row, col.rate)) || 1;

    result.push({
      account_id: account.accountNo,
      txn_date: txnDate,
      bank: account.label || "ТДБ",
      description: desc,
      counterparty: ctpy,
      account_no: "",
      exchange_rate: rate,
      currency,
      income: income > 0 ? income : null,
      expense: expense > 0 ? expense : null,
    });
  }

  return result;
}

// Golomt XLSX файл унших (cutoff: TT-тэй ижил).
export function parseGolomt(
  rows: Row[],
  account: AccountConfig,
  cutoff: Date,
): NormalizedTxn[] {
  const col = GOLOMT_COL;
  const result: NormalizedTxn[] = [];

  for (const row of rows) {
    const r = row ?? [];
    const txnDate = toIsoDate(cell(r, col.date));
    if (!txnDate) continue; // header болон бусад мөр алгасагдана

    if (txnDate.getTime() <= cutoff.getTime()) continue;

    const income = toNum(cell(r, col.income));
    const expense = toNum(cell(r, col.expense));
    if (income === 0 && expense === 0) continue;

    const rawDesc = String(cell(r, col.description) ?? "");
    const ctpy = String(cell(r, col.counterparty) ?? "");
    const acct = String(cell(r, col.account_no) ?? "");
    const desc = cleanDescription(rawDesc);

    result.push({
      account_id: account.accountNo,
      txn_date: txnDate,
      bank: account.label || "Голомт банк",
      description: desc,
      counterparty: ctpy,
      account_no: acct,
      exchange_rate: 1.0,
      income: income > 0 ? income : null,
      expense: expense > 0 ? expense : null,
    });
  }

  return result;
}

// M Bank XLS файл унших. Data мөр нь row_no тоотой.
export function parseMbank(
  rows: Row[],
  account: AccountConfig,
  cutoff: Date,
): NormalizedTxn[] {
  const col = MBANK_COL;
  const result: NormalizedTxn[] = [];

  for (let i = col.data_start_row; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const rowNo = cell(row, col.row_no);
    if (typeof rowNo !== "number") continue; // Зөвхөн дугаартай data мөр

    const txnDate = toIsoDate(cell(row, col.date));
    if (!txnDate) continue;

    if (txnDate.getTime() <= cutoff.getTime()) continue;

    const income = toNum(cell(row, col.income));
    const expense = toNum(cell(row, col.expense));
    if (income === 0 && expense === 0) continue;

    const rawDesc = String(cell(row, col.description) ?? "");
    if (shouldSkip(rawDesc)) continue;

    const ctpy = String(cell(row, col.counterparty) ?? "").trim();
    const acct = String(cell(row, col.account_no) ?? "").trim();
    const desc = cleanDescription(rawDesc);

    result.push({
      account_id: account.accountNo,
      txn_date: txnDate,
      bank: account.label || "М банк",
      description: desc,
      counterparty: ctpy,
      account_no: acct,
      exchange_rate: 1.0,
      income: income > 0 ? income : null,
      expense: expense > 0 ? expense : null,
    });
  }

  return result;
}

// Workbook-ийн эхний sheet-ийг array-of-arrays болгож унших.
function sheetRows(buffer: ArrayBuffer | Buffer): Row[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(ws, {
    header: 1,
    raw: true,
    blankrows: true,
    defval: null,
  });
}

// Компакт форматын харилцагч (col5: "MN…IBAN НЭР" эсвэл "12345 НЭР") → нэр гаргах.
function compactCounterparty(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const m = s.match(/^(?:MN\d+|\d{6,})\s+(.+)$/i);
  return (m ? m[1] : s).trim();
}

// ТДБ "Депозит дансны хуулга" компакт формат унших (MNT/USD/EUR данс).
// Орлого/зарлага тусдаа багана, ханш col4-д, валют толгойн мөр 0-оос.
export function parseTdbCompact(
  rows: Row[],
  account: AccountConfig,
  cutoff: Date,
): NormalizedTxn[] {
  const col = TDB_COMPACT_COL;
  // Валют: толгой мөр 0, col3 "Дансны дугаар: 411099342 USD" → эсвэл config-оос.
  const hdr = String(rows[0]?.[3] ?? "");
  const curMatch = hdr.match(/\b(MNT|USD|EUR|CNY|RUB|JPY|GBP|KRW)\b/);
  const currency = curMatch ? curMatch[1] : account.currency || "MNT";

  const result: NormalizedTxn[] = [];
  for (let i = col.data_start_row; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const txnDate = toIsoDate(cell(row, col.date));
    if (!txnDate) continue; // footer ("Нийт:"/"Хуудас:") болон хоосон мөр таслагдана
    if (txnDate.getTime() <= cutoff.getTime()) continue;

    const income = toNum(cell(row, col.income));
    const expense = toNum(cell(row, col.expense));
    if (income === 0 && expense === 0) continue;

    const rawDesc = String(cell(row, col.description) ?? "");
    if (shouldSkip(rawDesc)) continue;

    const rate = toNum(cell(row, col.rate)) || 1;
    const ctpy = compactCounterparty(cell(row, col.counterparty));
    const desc = cleanDescription(rawDesc);

    result.push({
      account_id: account.accountNo,
      txn_date: txnDate,
      bank: account.label || "ТДБ",
      description: desc,
      counterparty: ctpy,
      account_no: "",
      exchange_rate: rate,
      currency,
      income: income > 0 ? income : null,
      expense: expense > 0 ? expense : null,
    });
  }
  return result;
}

// Компакт формат мөн эсэхийг таних (толгой мөр 0-д "Хэвлэсэн огноо").
function isTdbCompact(rows: Row[]): boolean {
  return String(rows[0]?.[0] ?? "").includes("Хэвлэсэн огноо");
}

// Файлын төрлийг тодорхойлж парсер дуудна.
export function parseFile(
  buffer: ArrayBuffer | Buffer,
  account: AccountConfig,
  cutoff: Date,
): NormalizedTxn[] {
  const rows = sheetRows(buffer);

  // Банкны төрлөөр parser сонгоно.
  if (account.bankType === "tdb") {
    // ТДБ компакт формат — агуулгаар танина, бусад нь wide формат.
    return isTdbCompact(rows)
      ? parseTdbCompact(rows, account, cutoff)
      : parseTdb(rows, account, cutoff);
  }
  if (account.bankType === "golomt") {
    return parseGolomt(rows, account, cutoff);
  }
  if (account.bankType === "mbank") {
    return parseMbank(rows, account, cutoff);
  }
  throw new Error(`Танихгүй банкны төрөл: ${account.bankType}`);
}
