// bank-summary.ts — Мөнгөн хөрөнгийн нэгтгэл (банк тус бүрийн сарын хөдөлгөөн).
//
// Эх загвар: TumenAccounting3 `/cash/bank-summary`.
// Банк бүрээр: эхний үлдэгдэл → орлого → зарлага → цэвэр урсгал → эцсийн үлдэгдэл,
// 12 сарын багана + Нийт, мөн бүх банкны нэгтгэл.
//
// finance 2.0-д: transactions-ийг account_id × сараар нэгтгэж, эхний үлдэгдлийг
// account_balances-аас авч гүйлгээт үлдэгдэл бодно.

export type BankSummaryTxn = {
  account_id: string;
  month: number; // 1..12
  income: number | null;
  expense: number | null;
};

export type BankBlock = {
  accountId: string;
  bank: string; // дэлгэцийн нэр
  opening: number[]; // 12 — гүйлгээт (running)
  income: number[];
  expense: number[];
  net: number[];
  closing: number[];
  yearOpening: number; // оны эхэн
  yearClosing: number; // оны эцэс
};

export type BankSummary = {
  banks: BankBlock[];
  total: BankBlock; // нэгтгэл
  months: number[];
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function zeros(): number[] {
  return new Array(12).fill(0);
}

// Нэг дансны (банк эсвэл касс) блок байгуулна.
export function buildBlock(
  accountId: string,
  bank: string,
  income: number[],
  expense: number[],
  yearOpening: number,
): BankBlock {
  const net = MONTHS.map((_, i) => income[i] - expense[i]);
  const opening: number[] = [];
  const closing: number[] = [];
  let bal = yearOpening;
  for (let i = 0; i < 12; i++) {
    opening[i] = bal;
    bal += net[i];
    closing[i] = bal;
  }
  return {
    accountId,
    bank,
    opening,
    income,
    expense,
    net,
    closing,
    yearOpening,
    yearClosing: closing[11],
  };
}

// Олон блокийг (банк + касс) нэг нэгтгэлийн блок болгон нэмнэ.
export function combineBlocks(
  blocks: BankBlock[],
  accountId: string,
  label: string,
): BankBlock {
  const totIncome = MONTHS.map((_, i) => blocks.reduce((s, b) => s + b.income[i], 0));
  const totExpense = MONTHS.map((_, i) => blocks.reduce((s, b) => s + b.expense[i], 0));
  const totOpening = blocks.reduce((s, b) => s + b.yearOpening, 0);
  return buildBlock(accountId, label, totIncome, totExpense, totOpening);
}

export function buildBankSummary(
  txns: BankSummaryTxn[],
  openingByAccount: Record<string, number>,
  accounts: string[],
  bankNames: Record<string, string>,
): BankSummary {
  // account_id × сар → орлого / зарлага нийлбэр
  const inc: Record<string, number[]> = {};
  const exp: Record<string, number[]> = {};
  for (const a of accounts) {
    inc[a] = zeros();
    exp[a] = zeros();
  }
  for (const t of txns) {
    const m = (t.month ?? 0) - 1;
    if (m < 0 || m > 11) continue;
    if (!inc[t.account_id]) continue; // сонгосон бүлэгт үл хамаарах данс
    if (t.income) inc[t.account_id][m] += Number(t.income);
    if (t.expense) exp[t.account_id][m] += Number(t.expense);
  }

  const banks = accounts.map((a) =>
    buildBlock(a, bankNames[a] ?? a, inc[a], exp[a], openingByAccount[a] ?? 0),
  );

  // Нэгтгэл — банкны массивуудыг элемент тус бүрээр нэмнэ.
  const totIncome = MONTHS.map((_, i) => banks.reduce((s, b) => s + b.income[i], 0));
  const totExpense = MONTHS.map((_, i) => banks.reduce((s, b) => s + b.expense[i], 0));
  const totOpening = banks.reduce((s, b) => s + b.yearOpening, 0);
  const total = buildBlock("ALL", "Нийт мөнгөн хөрөнгө", totIncome, totExpense, totOpening);

  return { banks, total, months: MONTHS };
}
