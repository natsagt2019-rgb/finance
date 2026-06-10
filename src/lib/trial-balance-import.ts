// Гүйлгээ баланс (Trial Balance) Excel импорт — "Gbalance" хэлбэрийн хуудсыг
// танина. build_tt_2025.py-ийн логикийн TS хувилбар.
//
// Хүлээгдэх багана (Gbalance):
//   A Код | B Дансны нэр | C/D Эхний үлдэгдэл Дт/Кт |
//   E/F Гүйлгээ Дт/Кт | G/H Эцсийн үлдэгдэл Дт/Кт
//
// Үлдэгдэл debit-positive (актив/зардал +, пассив/орлого −):
//   Баланс данс (1,2,3,4): opening = C−D, closing = G−H
//   Орлого/зардал данс (5–9): opening = 0, closing = эргэлт E−F
// "Бүлгийн дүн" болон кодгүй толгой мөрүүдийг алгасна.

import * as XLSX from "xlsx";

export type AccountKind = "asset" | "liability" | "equity" | "income" | "expense";

export type ParsedTbRow = {
  code: string;
  name: string;
  kind: AccountKind;
  opening: number;
  closing: number;
};

export type TbParseResult = {
  rows: ParsedTbRow[];
  skipped: number; // кодгүй / Бүлгийн дүн / уншигдаагүй мөр
  sheet: string;
};

function num(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).replace(/[,₮\s]/g, "").trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

// Дансны код (зөвхөн 4+ оронтой бүхэл тоо). "Бүлгийн дүн" г.м текстийг хасна.
function asCode(v: unknown): string | null {
  if (typeof v === "number" && Number.isInteger(v)) {
    return v >= 1000 ? String(v) : null;
  }
  const s = String(v ?? "").trim();
  return /^\d{4,}$/.test(s) ? s : null;
}

export function accountKind(code: string): AccountKind {
  const c = code;
  if (c[0] === "1" || c[0] === "2") return "asset";
  if (c[0] === "3") return "liability";
  if (c[0] === "4") return "equity";
  const p = c.slice(0, 3);
  if (p === "510" || p === "520" || p === "840" || p === "850") return "income";
  return "expense";
}

const BS_KINDS = new Set<AccountKind>(["asset", "liability", "equity"]);

export function parseTrialBalanceExcel(buf: ArrayBuffer): TbParseResult {
  const wb = XLSX.read(buf, { type: "array" });
  // "Gbalance" хуудсыг эрэлхийлнэ, эс бөгөөс эхнийх.
  const sheetName =
    wb.SheetNames.find((n) => /gbalance|гүйлгээ\s*баланс/i.test(n)) ??
    wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    blankrows: false,
  });

  const rows: ParsedTbRow[] = [];
  let skipped = 0;

  for (const r of grid) {
    const code = asCode(r[0]);
    if (!code) {
      skipped++;
      continue;
    }
    const name = String(r[1] ?? "").trim();
    const kind = accountKind(code);

    const openDt = num(r[2]);
    const openKt = num(r[3]);
    const turnDt = num(r[4]);
    const turnKt = num(r[5]);
    const closeDt = num(r[6]);
    const closeKt = num(r[7]);

    const opening = BS_KINDS.has(kind) ? openDt - openKt : 0;
    const closing = BS_KINDS.has(kind) ? closeDt - closeKt : turnDt - turnKt;

    rows.push({ code, name, kind, opening, closing });
  }

  return { rows, skipped, sheet: sheetName };
}
