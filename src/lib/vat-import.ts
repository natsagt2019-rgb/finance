// НӨАТ (eBarimt) Excel импорт — ebarimt.mn порталын бодит экспорт форматуудыг
// танина. Хуучин TumenAccounting3-ийн import_ebarimt.py логикийн TS хувилбар.
//
// Танигддаг 3 layout:
//   A) "Нэхэмжлэх ..." (11 багана, толгой нэхэмжлэхтэй):
//      Толгой ДДТД | ДДТД | Огноо | Нэр | ТТД | Үлдэгдэл | Төлсөн | НӨАТ | Нийт | Татв.төрөл | Эх
//   B) "Байгууллага хоорондын гүйлгээ ..." (9 багана):
//      ДДТД | Огноо | Нэр | ТТД | НӨАТ | Нийт | Татв.төрөл | Эх | Төлөв
//   C) Загвар (manual): A=Огноо B=Төрөл C=ДДТД D=Нэхэмж E=Нэр F=Регистр G=НӨАТ-гүй H=НӨАТ I=Нийт
//
// Төрөл (out/in) нь портал форматад дата дотор байдаггүй тул ФАЙЛЫН НЭРНЭЭС
// тодорхойлно: "худалдан авалт" → in, бусад → out (борлуулалт).
import * as XLSX from "xlsx";

export type VatType = "out" | "in";

export type ParsedVatRow = {
  date: string; // ISO (YYYY-MM-DD)
  type: VatType;
  ddtd: string | null;
  parent_ddtd: string | null;
  invoice_no: string | null;
  partner_name: string | null;
  partner_register: string | null;
  amount: number; // НӨАТ-гүй дүн
  vat_amount: number; // НӨАТ дүн
  total_amount: number; // нийт дүн
  paid_amount: number;
  remaining: number;
  tax_type: string | null;
  source: string | null;
  ebarimt_status: string | null;
};

export type VatFormat = "portal-parent" | "portal-flat" | "template";

export type ParseResult = {
  rows: ParsedVatRow[];
  format: VatFormat;
  skipped: number; // огноо/дүн уншигдаагүй мөрүүд
};

// ── Туслахууд ────────────────────────────────────────────────────────────────

function toFloat(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).replace(/[,₮\s]/g, "").trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

// ДДТД-ийн урдах 0-г хасна (хуучин системтэй ижил норм).
function normDdtd(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/^0+/, "");
  return s || null;
}

function cellStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

// Регистрийн float-маягийн утгыг (2702673.0) цэвэрлэнэ.
function toReg(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") return String(Math.trunc(v));
  const s = String(v).trim();
  return /^\d+\.0+$/.test(s) ? s.replace(/\.0+$/, "") : s;
}

// Excel-ийн огноог (serial number, Date, эсвэл текст) ISO болгоно.
function parseDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${d.y}-${mm}-${dd}`;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    const [, y, mo, da] = m;
    return `${y}-${mo.padStart(2, "0")}-${da.padStart(2, "0")}`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Файлын нэрнээс төрөл: "худалдан авалт" → in, бусад → out.
export function vatTypeFromFilename(name: string): VatType {
  return name.toLowerCase().includes("худалдан авалт") ? "in" : "out";
}

function round2safe(n: number): number {
  return round2(Math.max(0, n));
}

// ── Үндсэн задлал ────────────────────────────────────────────────────────────

export function parseVatExcel(buffer: Buffer, filename = ""): ParseResult {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { rows: [], format: "template", skipped: 0 };

  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: true,
    defval: null,
  });
  if (grid.length === 0) return { rows: [], format: "template", skipped: 0 };

  const headers = (grid[0] as unknown[])
    .slice(0, 20)
    .map((h) => cellStr(h).toLowerCase());
  const h0 = headers[0] ?? "";

  // Файлын нэрээс төрлийн анхдагч (портал форматад дата дотор төрөл байхгүй).
  const typeFromName = vatTypeFromFilename(filename);

  // ── Layout таних ──────────────────────────────────────────────────────────
  let format: VatFormat;
  if (h0.includes("толгой")) {
    format = "portal-parent"; // Format A
  } else if (h0 === "ддтд" || (h0.includes("ддтд") && headers.length <= 12)) {
    format = "portal-flat"; // Format B
  } else {
    format = "template"; // загвар (А-I)
  }

  const rows: ParsedVatRow[] = [];
  let skipped = 0;

  for (let r = 1; r < grid.length; r++) {
    const row = grid[r] as unknown[];
    if (!row) continue;
    const get = (i: number) => row[i];

    let dateRaw: unknown,
      ddtdRaw: unknown,
      parentRaw: unknown,
      pname: string,
      preg: string,
      invoiceNo: string | null,
      vat: number,
      total: number,
      amount: number,
      paid: number,
      remaining: number,
      taxType: string | null,
      source: string | null,
      status: string | null,
      type: VatType;

    if (format === "portal-parent") {
      // 0:толгой 1:ддтд 2:огноо 3:нэр 4:ттд 5:үлдэгдэл 6:төлсөн 7:нөат 8:нийт 9:татв.төрөл 10:эх
      parentRaw = get(0);
      ddtdRaw = get(1);
      dateRaw = get(2);
      pname = cellStr(get(3));
      preg = toReg(get(4));
      invoiceNo = null;
      remaining = toFloat(get(5));
      paid = toFloat(get(6));
      vat = toFloat(get(7));
      total = toFloat(get(8));
      amount = round2safe(total - vat);
      taxType = cellStr(get(9)) || null;
      source = cellStr(get(10)) || null;
      status = null;
      type = typeFromName;
    } else if (format === "portal-flat") {
      // 0:ддтд 1:огноо 2:нэр 3:ттд 4:нөат 5:нийт 6:татв.төрөл 7:эх 8:төлөв
      parentRaw = null;
      ddtdRaw = get(0);
      dateRaw = get(1);
      pname = cellStr(get(2));
      preg = toReg(get(3));
      invoiceNo = null;
      vat = toFloat(get(4));
      total = toFloat(get(5));
      amount = round2safe(total - vat);
      paid = 0;
      remaining = 0;
      taxType = cellStr(get(6)) || null;
      source = cellStr(get(7)) || null;
      status = cellStr(get(8)) || null;
      type = typeFromName;
    } else {
      // Загвар: A=огноо B=төрөл C=ДДТД D=нэхэмж E=нэр F=регистр G=НӨАТ-гүй H=НӨАТ I=нийт
      parentRaw = null;
      dateRaw = get(0);
      ddtdRaw = get(2);
      pname = cellStr(get(4));
      preg = toReg(get(5));
      invoiceNo = cellStr(get(3)) || null;
      amount = toFloat(get(6));
      vat = toFloat(get(7));
      total = toFloat(get(8));
      paid = 0;
      remaining = 0;
      taxType = null;
      source = null;
      status = null;
      // Төрөл: B баганаас, эс бөгөөс файлын нэрнээс.
      const tv = cellStr(get(1)).toLowerCase();
      if (tv.includes("худалдан") || tv.includes("орц") || tv === "in") type = "in";
      else if (tv.includes("борлуулалт") || tv.includes("гарц") || tv === "out") type = "out";
      else type = typeFromName;
      // Загварт зөвхөн нийт дүнтэй бол НӨАТ-ыг 10%-аар нөхөж тооцоолно.
      if (total === 0 && amount > 0) total = round2(amount + vat);
      if (vat === 0 && total > 0 && amount === 0) vat = round2(total - total / 1.1);
      if (amount === 0 && total > 0) amount = round2safe(total - vat);
    }

    const dateIso = parseDate(dateRaw);
    if (!dateIso) {
      if (row.every((c) => c == null || c === "")) continue;
      skipped++;
      continue;
    }
    if (total === 0 && amount === 0) {
      skipped++;
      continue;
    }

    rows.push({
      date: dateIso,
      type,
      ddtd: normDdtd(ddtdRaw),
      parent_ddtd: normDdtd(parentRaw),
      invoice_no: invoiceNo,
      partner_name: pname || null,
      partner_register: preg || null,
      amount,
      vat_amount: round2(vat),
      total_amount: round2(total),
      paid_amount: round2(paid),
      remaining: round2(remaining),
      tax_type: taxType,
      source,
      ebarimt_status: status,
    });
  }

  return { rows, format, skipped };
}
