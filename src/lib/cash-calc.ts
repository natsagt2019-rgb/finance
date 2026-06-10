// ============================================================
// Кассын тооцооллын цөм — кассын дэвтрийн үлдэгдэл, нэгтгэл.
// ============================================================
// Цэвэр функцууд: page (тайлан) болон action хоёул дуудна.
// ============================================================

// ── Тоо форматлах (модулийн конвенц) ─────────────────────────────────────────
export function fmt(n: number): string {
  return Math.round(Number(n) || 0).toLocaleString("en-US");
}

export function fmtSigned(n: number): string {
  if (!n) return "—";
  const s = Math.round(Math.abs(n)).toLocaleString("en-US");
  return n > 0 ? `+${s}` : `−${s}`;
}

// ── Баримтын төрөл ───────────────────────────────────────────────────────────
export type CashType = "in" | "out";

export const CASH_TYPE_LABELS: Record<CashType, string> = {
  in: "Орлого",
  out: "Зарлага",
};

// Баримтын дугаарын угтвар (Кассын орлого/зарлагын ордер).
export const CASH_DOC: Record<CashType, string> = {
  in: "КО",
  out: "КЗ",
};

// ── Кассын дэвтэр ─────────────────────────────────────────────────────────────
// Журналд хэрэглэх хөнгөн хэлбэр (MNT дүнгээр бодно).
export type EntryLite = {
  id: number;
  date: string; // YYYY-MM-DD
  type: CashType;
  amount_mnt: number;
};

// Нэг (running balance) мөр — баримт + гүйлгээний дараах үлдэгдэл.
export type BookRow<T extends EntryLite = EntryLite> = {
  entry: T;
  inAmt: number;
  outAmt: number;
  balance: number; // тухайн мөрийн дараах үлдэгдэл
};

export type BookResult<T extends EntryLite = EntryLite> = {
  opening: number;
  totalIn: number;
  totalOut: number;
  closing: number;
  rows: BookRow<T>[];
};

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Огноо, дараа нь id-аар эрэмбэлэх (тогтвортой дараалал).
function chrono<T extends EntryLite>(a: T, b: T): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.id - b.id;
}

// Эхний үлдэгдэлээс эхлэн running balance бодно. entries нь нэг кассынх.
export function computeBook<T extends EntryLite>(
  entries: T[],
  opening = 0,
): BookResult<T> {
  const sorted = [...entries].sort(chrono);
  let balance = r2(opening);
  let totalIn = 0;
  let totalOut = 0;
  const rows: BookRow<T>[] = [];

  for (const e of sorted) {
    const amt = r2(e.amount_mnt);
    const inAmt = e.type === "in" ? amt : 0;
    const outAmt = e.type === "out" ? amt : 0;
    balance = r2(balance + inAmt - outAmt);
    totalIn = r2(totalIn + inAmt);
    totalOut = r2(totalOut + outAmt);
    rows.push({ entry: e, inAmt, outAmt, balance });
  }

  return {
    opening: r2(opening),
    totalIn,
    totalOut,
    closing: balance,
    rows,
  };
}

// Бүх касс/бүх хугацааны эцсийн үлдэгдэл (касс бүрээр).
export function balanceByRegister(
  entries: (EntryLite & { register_id: number })[],
): Record<number, number> {
  const out: Record<number, number> = {};
  for (const e of entries) {
    const amt = r2(e.amount_mnt);
    out[e.register_id] = r2((out[e.register_id] ?? 0) + (e.type === "in" ? amt : -amt));
  }
  return out;
}
