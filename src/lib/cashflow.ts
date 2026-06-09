// cashflow.ts — Мөнгөн урсгалын тайлан (дотоод/internal) бүтэц ба тооцоо.
//
// Эх загвар: TumenAccounting3 `/reports/cashflow?mode=internal`.
// Тэнд CashTransaction.income_cat/expense_cat-ийг сар × ангиллаар нэгтгэж,
// Үйл ажиллагаа / Хөрөнгө оруулалт / Санхүүжилт / Холбоотой байгуулага гэсэн
// хэсгүүдэд эмхэлж, 12 сарын багана + эхний/эцсийн үлдэгдэлтэй гаргадаг.
//
// Энд яг тэр бүтцийг finance 2.0-ийн transactions (income_code/expense_code)
// дээр буулгана. Ангилал кодын систем ижил тул шууд тааруулна.
import { CATEGORY_CODES } from "./bank-importer/config";

export type CashflowTxn = {
  month: number; // 1..12
  income: number | null;
  expense: number | null;
  income_code: string | null;
  expense_code: string | null;
};

// Тайлангийн нэг мөр (төрлөөр нь template-д өөр загвартай харагдана).
export type CashflowRow =
  | { kind: "section"; label: string }
  | { kind: "subheader"; label: string }
  | { kind: "data"; code: string; label: string; vals: number[]; indent?: number }
  | { kind: "total"; code?: string; label: string; vals: number[]; level: "sub" | "section" | "net" }
  | { kind: "balance"; label: string; vals: number[]; total: number };

export type CashflowReport = {
  rows: CashflowRow[];
  months: number[]; // [1..12]
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function zeros(): number[] {
  return new Array(12).fill(0);
}
function addArr(...arrs: number[][]): number[] {
  return MONTHS.map((_, i) => arrs.reduce((s, a) => s + (a[i] ?? 0), 0));
}
function subArr(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - (b[i] ?? 0));
}

// Ангилал код тус бүрийн 12 сарын дүнгийн map үүсгэнэ.
function aggregate(txns: CashflowTxn[]): Record<string, number[]> {
  const map: Record<string, number[]> = {};
  for (const t of txns) {
    const m = (t.month ?? 0) - 1;
    if (m < 0 || m > 11) continue;
    if (t.income_code && t.income) {
      (map[t.income_code] ??= zeros())[m] += Number(t.income);
    }
    if (t.expense_code && t.expense) {
      (map[t.expense_code] ??= zeros())[m] += Number(t.expense);
    }
  }
  return map;
}

// Кодын тайлбар (config-оос, байхгүй бол кодыг өөрийг нь).
function label(code: string): string {
  return CATEGORY_CODES[code] ?? code;
}

// Дотоод мөнгөн урсгалын тайлан байгуулна.
// openingCash — сонгосон оны эхний мөнгөн үлдэгдэл (account_balances-аас).
export function buildInternalCashflow(
  txns: CashflowTxn[],
  openingCash: number,
): CashflowReport {
  const map = aggregate(txns);
  const get = (code: string): number[] => (map[code] ? map[code].slice() : zeros());

  const rows: CashflowRow[] = [];

  // ── 1. Үйл ажиллагааны мөнгөн урсгал ──────────────────────────────────
  const r111 = get("1.1.1");
  const r112 = get("1.1.2");
  const r113 = get("1.1.3");
  const r114 = get("1.1.4");
  const totalInc = addArr(r111, r112, r113, r114);

  const r121 = get("1.2.1");
  const r122 = get("1.2.2");
  const sub12 = addArr(r121, r122);

  const opsCodes = ["2.1.1", "2.1.3", "2.1.5", "2.1.10", "2.1.14"];
  const opsVals = opsCodes.map(get);
  const sub21 = addArr(...opsVals);

  const taxCodes = ["2.2.1", "2.2.2", "2.2.3", "2.2.4"];
  const taxVals = taxCodes.map(get);
  const sub22 = addArr(...taxVals);

  const totalExp = addArr(sub12, sub21, sub22);
  const opNet = subArr(totalInc, totalExp);

  rows.push({ kind: "section", label: "ҮЙЛ АЖИЛЛАГААНЫ МӨНГӨН УРСГАЛ" });
  rows.push({ kind: "subheader", label: "Мөнгөн орлого" });
  rows.push({ kind: "data", code: "1.1.1", label: label("1.1.1"), vals: r111, indent: 2 });
  rows.push({ kind: "data", code: "1.1.2", label: label("1.1.2"), vals: r112, indent: 2 });
  rows.push({ kind: "data", code: "1.1.3", label: label("1.1.3"), vals: r113, indent: 2 });
  rows.push({ kind: "data", code: "1.1.4", label: label("1.1.4"), vals: r114, indent: 2 });
  rows.push({ kind: "total", label: "Нийт мөнгөн орлого", vals: totalInc, level: "sub" });

  rows.push({ kind: "subheader", label: "Гүйцэтгэгчдийн төлбөр" });
  rows.push({ kind: "data", code: "1.2.1", label: label("1.2.1"), vals: r121, indent: 2 });
  rows.push({ kind: "data", code: "1.2.2", label: label("1.2.2"), vals: r122, indent: 2 });
  rows.push({ kind: "total", code: "1.2", label: "Гүйцэтгэгчдийн нийт төлбөр", vals: sub12, level: "sub" });

  rows.push({ kind: "subheader", label: "Бусад үйл ажиллагааны зарлага" });
  opsCodes.forEach((c, i) =>
    rows.push({ kind: "data", code: c, label: label(c), vals: opsVals[i], indent: 2 }),
  );
  rows.push({ kind: "total", code: "2.1", label: "Бусад үйл ажиллагааны нийт", vals: sub21, level: "sub" });

  rows.push({ kind: "subheader", label: "Татвар, НДШ" });
  taxCodes.forEach((c, i) =>
    rows.push({ kind: "data", code: c, label: label(c), vals: taxVals[i], indent: 2 }),
  );
  rows.push({ kind: "total", code: "2.2", label: "Татвар, НДШ нийт", vals: sub22, level: "sub" });

  rows.push({ kind: "total", label: "Нийт мөнгөн зарлага", vals: totalExp, level: "section" });
  rows.push({ kind: "total", label: "ҮЙЛ АЖИЛЛАГААНЫ ЦЭВЭР УРСГАЛ", vals: opNet, level: "net" });

  // ── 2. Хөрөнгө оруулалтын мөнгөн урсгал ───────────────────────────────
  const r321 = get("3.2.1");
  const r322 = get("3.2.2");
  const invExp = addArr(r321, r322);
  const invNet = subArr(zeros(), invExp);

  rows.push({ kind: "section", label: "ХӨРӨНГӨ ОРУУЛАЛТЫН МӨНГӨН УРСГАЛ" });
  rows.push({ kind: "subheader", label: "Хөрөнгө оруулалтын зарлага" });
  rows.push({ kind: "data", code: "3.2.1", label: label("3.2.1"), vals: r321, indent: 2 });
  rows.push({ kind: "data", code: "3.2.2", label: label("3.2.2"), vals: r322, indent: 2 });
  rows.push({ kind: "total", code: "3.2", label: "Нийт хөрөнгө оруулалтын зарлага", vals: invExp, level: "sub" });
  rows.push({ kind: "total", label: "ХӨРӨНГӨ ОРУУЛАЛТЫН ЦЭВЭР УРСГАЛ", vals: invNet, level: "net" });

  // ── 3. Санхүүжилтийн мөнгөн урсгал (зээл 5.1.2 / 5.2.2 энд шилжсэн) ────
  const finIncLoan = get("5.1.2");
  const finExpLoan = get("5.2.2");
  const finNet = subArr(finIncLoan, finExpLoan);

  rows.push({ kind: "section", label: "САНХҮҮЖИЛТИЙН МӨНГӨН УРСГАЛ" });
  rows.push({ kind: "data", code: "5.1.2", label: "Зээл авсан (орлого)", vals: finIncLoan, indent: 2 });
  rows.push({ kind: "data", code: "5.2.2", label: "Зээл эргэн төлсөн (зарлага)", vals: finExpLoan, indent: 2 });
  rows.push({ kind: "total", label: "САНХҮҮЖИЛТИЙН ЦЭВЭР УРСГАЛ", vals: finNet, level: "net" });

  // ── 5. Холбоотой байгуулага / ажилчдын зээл ───────────────────────────
  const r511 = get("5.1.1");
  const r513 = get("5.1.3");
  const sub51 = addArr(r511, r513);
  const r521 = get("5.2.1");
  const r523 = get("5.2.3");
  const sub52 = addArr(r521, r523);
  const sec5Net = subArr(sub51, sub52);

  rows.push({ kind: "section", label: "ХОЛБООТОЙ БАЙГУУЛАГА / АЖИЛЧДЫН ЗЭЭЛ" });
  rows.push({ kind: "subheader", label: "Орлого" });
  rows.push({ kind: "data", code: "5.1.1", label: label("5.1.1"), vals: r511, indent: 2 });
  rows.push({ kind: "data", code: "5.1.3", label: label("5.1.3"), vals: r513, indent: 2 });
  rows.push({ kind: "total", code: "5.1", label: "Нийт орлого", vals: sub51, level: "sub" });
  rows.push({ kind: "subheader", label: "Зарлага" });
  rows.push({ kind: "data", code: "5.2.1", label: label("5.2.1"), vals: r521, indent: 2 });
  rows.push({ kind: "data", code: "5.2.3", label: label("5.2.3"), vals: r523, indent: 2 });
  rows.push({ kind: "total", code: "5.2", label: "Нийт зарлага", vals: sub52, level: "sub" });
  rows.push({ kind: "total", label: "ХОЛБООТОЙ БАЙГУУЛАГЫН ЦЭВЭР УРСГАЛ", vals: sec5Net, level: "net" });

  // ── Нэгтгэл ба үлдэгдэл ───────────────────────────────────────────────
  const netTotal = addArr(opNet, invNet, finNet, sec5Net);

  const closing: number[] = [];
  let bal = openingCash;
  for (const v of netTotal) {
    bal += v;
    closing.push(bal);
  }
  const openingByMonth = [openingCash, ...closing.slice(0, -1)];

  rows.push({ kind: "total", label: "ТУХАЙН ҮЕИЙН ЦЭВЭР МӨНГӨН ГҮЙЛГЭЭ", vals: netTotal, level: "net" });
  rows.push({ kind: "balance", label: "Эхний үлдэгдэл", vals: openingByMonth, total: openingCash });
  rows.push({ kind: "balance", label: "Эцсийн үлдэгдэл", vals: closing, total: closing[closing.length - 1] ?? openingCash });

  return { rows, months: MONTHS };
}
