// Гүйлгээ балансыг харуулах бүлэглэл — хуучин системийн trial_balance route-ийн
// логикийг (код prefix-ээр бүлэг + хэсгийн нийлбэр) дагасан.
//
// Импортолсон trial_balances нь цэвэр (net, debit-positive) opening/closing-той.
// Гүйлгээ = closing − opening. Дт/Кт баганад эерэг→Дт, сөрөг→Кт болгож хуваана.

export type TbAccount = {
  code: string;
  name: string;
  opening: number; // net (debit-positive)
  closing: number; // net (debit-positive)
};

export type TbCells = {
  obDt: number;
  obKt: number;
  tnDt: number;
  tnKt: number;
  clDt: number;
  clKt: number;
};

export type TbViewRow =
  | ({ type: "account"; code: string; name: string } & TbCells)
  | ({ type: "subtotal" | "section"; label: string } & TbCells)
  | { type: "header"; label: string };

export type TbViewResult = {
  rows: TbViewRow[];
  grand: TbCells;
  accountCount: number;
  balanced: boolean; // нийт эцсийн Дт = Кт эсэх
};

// Хэсгийн нэр (кодын эхний орон) — компанийн бодит чарт (1-2 хөрөнгө, 3 өр…).
const SECTION_LABELS: Record<string, string> = {
  "1": "1. ЭРГЭЛТИЙН ХӨРӨНГӨ",
  "2": "2. ҮНДСЭН ХӨРӨНГӨ",
  "3": "3. ӨР ТӨЛБӨР",
  "4": "4. ЭЗДИЙН ӨМЧ",
  "5": "5. ОРЛОГО",
  "6": "6. БОРЛУУЛАЛТЫН ӨРТӨГ",
  "7": "7. ЗАРДАЛ",
  "8": "8. БУСАД ОРЛОГО/ЗАРДАЛ",
  "9": "9. ТАТВАР / ХААЛТ",
};

const dt = (n: number) => (n > 0 ? n : 0);
const kt = (n: number) => (n < 0 ? -n : 0);

function emptyCells(): TbCells {
  return { obDt: 0, obKt: 0, tnDt: 0, tnKt: 0, clDt: 0, clKt: 0 };
}

function addCells(a: TbCells, b: TbCells): void {
  a.obDt += b.obDt;
  a.obKt += b.obKt;
  a.tnDt += b.tnDt;
  a.tnKt += b.tnKt;
  a.clDt += b.clDt;
  a.clKt += b.clKt;
}

function cellsFor(acc: TbAccount): TbCells {
  const turnover = acc.closing - acc.opening;
  return {
    obDt: dt(acc.opening),
    obKt: kt(acc.opening),
    tnDt: dt(turnover),
    tnKt: kt(turnover),
    clDt: dt(acc.closing),
    clKt: kt(acc.closing),
  };
}

export function buildTrialBalanceView(accounts: TbAccount[]): TbViewResult {
  // Кодоор эрэмбэлнэ.
  const sorted = [...accounts].sort((a, b) => a.code.localeCompare(b.code));

  const rows: TbViewRow[] = [];
  const grand = emptyCells();

  let curSection: string | null = null;
  let curPrefix: string | null = null;
  let grpCells = emptyCells();
  let secCells = emptyCells();
  let grpHasData = false;
  let secHasData = false;

  const flushGroup = () => {
    if (!grpHasData) return;
    rows.push({ type: "subtotal", label: `${curPrefix}xx нийт`, ...grpCells });
    grpCells = emptyCells();
    grpHasData = false;
  };
  const flushSection = () => {
    if (!secHasData) return;
    const label = (SECTION_LABELS[curSection ?? ""] ?? `${curSection}xxx`) + " — НИЙТ";
    rows.push({ type: "section", label, ...secCells });
    secCells = emptyCells();
    secHasData = false;
  };

  for (const acc of sorted) {
    const section = acc.code.slice(0, 1);
    const prefix = acc.code.slice(0, 2);

    if (section !== curSection) {
      flushGroup();
      flushSection();
      curSection = section;
      curPrefix = null;
    }
    if (prefix !== curPrefix) {
      flushGroup();
      curPrefix = prefix;
      rows.push({ type: "header", label: `${prefix}xx` });
    }

    const cells = cellsFor(acc);
    rows.push({ type: "account", code: acc.code, name: acc.name, ...cells });
    addCells(grpCells, cells);
    addCells(secCells, cells);
    addCells(grand, cells);
    grpHasData = true;
    secHasData = true;
  }
  flushGroup();
  flushSection();

  return {
    rows,
    grand,
    accountCount: sorted.length,
    balanced: Math.abs(grand.clDt - grand.clKt) < 0.5,
  };
}
