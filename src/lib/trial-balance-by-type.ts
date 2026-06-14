// Гүйлгээ баланс — дансны төрлөөр (asset/liability/equity/income/expense)
// нэгтгэх цэвэр логик. trial_balance_full_range RPC-ийн мөрүүдийг accounts.type-аар
// бүлэглэж, баланс хэлбэрийн Дт/Кт багануудаар (эхний/гүйлгээ/эцсийн) гаргана.

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

// Дансны төрлийн код + Монгол нэр + дараалал (тайлангийн мөрийн дараалал).
export const TYPE_META: { type: AccountType; code: string; name: string }[] = [
  { type: "asset", code: "1", name: "Хөрөнгө" },
  { type: "liability", code: "2", name: "Өр төлбөр" },
  { type: "equity", code: "3", name: "Эзэмшигчийн өмч" },
  { type: "income", code: "4", name: "Орлого" },
  { type: "expense", code: "5", name: "Зардал" },
];

// RPC-ийн нэг мөр (код тус бүрийн цэвэр opening/closing + бохир гүйлгээ).
export type FullRangeRow = {
  code: string;
  name: string | null;
  opening: number | null;
  debit_turn: number | null;
  credit_turn: number | null;
  closing: number | null;
};

// Баланс хэлбэрийн 6 багана (Дт/Кт × эхний/гүйлгээ/эцсийн).
export type BalRow = {
  openDt: number;
  openKt: number;
  turnDt: number;
  turnKt: number;
  closeDt: number;
  closeKt: number;
};

// Нэг дансны төрлийн нэгтгэсэн мөр.
export type TypeRow = BalRow & {
  type: AccountType;
  code: string; // дансны төрлийн код (1..5)
  name: string; // дансны төрлийн нэр
};

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

const ZERO = (): BalRow => ({
  openDt: 0,
  openKt: 0,
  turnDt: 0,
  turnKt: 0,
  closeDt: 0,
  closeKt: 0,
});

function addRow(acc: BalRow, r: FullRangeRow): void {
  const open = Number(r.opening) || 0;
  const close = Number(r.closing) || 0;
  // Цэвэр үлдэгдлийг тэмдгээр нь Дт/Кт талд хуваана (баланс хэлбэр).
  acc.openDt += open > 0 ? open : 0;
  acc.openKt += open < 0 ? -open : 0;
  acc.turnDt += Number(r.debit_turn) || 0;
  acc.turnKt += Number(r.credit_turn) || 0;
  acc.closeDt += close > 0 ? close : 0;
  acc.closeKt += close < 0 ? -close : 0;
}

function round(acc: BalRow): BalRow {
  return {
    openDt: r2(acc.openDt),
    openKt: r2(acc.openKt),
    turnDt: r2(acc.turnDt),
    turnKt: r2(acc.turnKt),
    closeDt: r2(acc.closeDt),
    closeKt: r2(acc.closeKt),
  };
}

export function sumBal(rows: BalRow[]): BalRow {
  const t = ZERO();
  for (const r of rows) {
    t.openDt += r.openDt;
    t.openKt += r.openKt;
    t.turnDt += r.turnDt;
    t.turnKt += r.turnKt;
    t.closeDt += r.closeDt;
    t.closeKt += r.closeKt;
  }
  return round(t);
}

// RPC мөрүүд + код→төрөл map → дансны төрөл тус бүрийн нэгтгэсэн мөр.
// Тэг биш төрлүүдийг л буцаана (хоосон төрлийг алгасна).
export function groupByType(
  rows: FullRangeRow[],
  typeByCode: Map<string, AccountType>,
): { rows: TypeRow[]; total: BalRow } {
  const acc = new Map<AccountType, BalRow>();
  for (const r of rows) {
    const t = typeByCode.get(r.code);
    if (!t) continue; // дансны төрөлгүй код алгасна
    const cur = acc.get(t) ?? ZERO();
    addRow(cur, r);
    acc.set(t, cur);
  }

  const out: TypeRow[] = [];
  for (const meta of TYPE_META) {
    const bal = acc.get(meta.type);
    if (!bal) continue;
    const rounded = round(bal);
    const empty =
      !rounded.openDt && !rounded.openKt && !rounded.turnDt &&
      !rounded.turnKt && !rounded.closeDt && !rounded.closeKt;
    if (empty) continue;
    out.push({ type: meta.type, code: meta.code, name: meta.name, ...rounded });
  }

  return { rows: out, total: sumBal(out) };
}
