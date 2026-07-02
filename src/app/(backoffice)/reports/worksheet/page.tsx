import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { bankJournalStatus } from "@/lib/bank-journal-status";
import { BankJournalBanner } from "../bank-journal-banner";

// Ажлын хүснэгт (10 баганат working trial balance):
//   Шалгах баланс (эхний) → Гүйлгээ → Хаалтын бичилтийн өмнөх шалгах баланс
//   → ОЗНДанс (орлого/зарлага) → Үлдэгдэл баланс. Тус бүр Дебет/Кредит.
// Эх сурвалж: journal_entries (бүх данс, ≤ d_to).

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function f(n: number): string {
  return Math.abs(n) < 0.5 ? "" : Math.round(n).toLocaleString("en-US");
}

type AccRow = { code: string; name: string; type: string | null };

// Дансны type байхгүй (NULL) үед кодын эхний оронгоос дүгнэнэ (стандарт дансны
// төлөвлөгөө: 1=хөрөнгө, 3/4=өр, 5=өмч, 6=орлого, 7/8=зардал). "asset" руу
// автоматаар буулгахгүй — орлого/зардлыг буруу ангилж ашиг гажихаас сэргийлнэ.
function typeFromCode(code: string): string {
  switch (code[0]) {
    case "1":
      return "asset";
    case "3":
    case "4":
      return "liability";
    case "5":
      return "equity";
    case "6":
      return "income";
    case "7":
    case "8":
      return "expense";
    default:
      return "asset";
  }
}

type Acct = {
  code: string;
  name: string;
  type: string;
  openNet: number; // debit-positive эхний үлдэгдэл
  pDr: number;
  pCr: number;
};

const TYPE_ORDER = ["asset", "liability", "equity", "income", "expense"] as const;
const TYPE_LABEL: Record<string, string> = {
  asset: "Хөрөнгө",
  liability: "Өр төлбөр",
  equity: "Өмч",
  income: "Орлого",
  expense: "Зардал",
};

// Аккаунтын debit-positive үлдэгдлийг Дт/Кр баганад хуваана.
function split(v: number): { dr: number; cr: number } {
  return v >= 0 ? { dr: v, cr: 0 } : { dr: 0, cr: -v };
}

type Cols = {
  tbDr: number; tbCr: number; // Шалгах баланс (эхний)
  trDr: number; trCr: number; // Гүйлгээ
  adjDr: number; adjCr: number; // Хаалтын өмнөх ШБ
  isDr: number; isCr: number; // ОЗНДанс (орлого/зарлага)
  bsDr: number; bsCr: number; // Үлдэгдэл баланс
};

function emptyCols(): Cols {
  return { tbDr: 0, tbCr: 0, trDr: 0, trCr: 0, adjDr: 0, adjCr: 0, isDr: 0, isCr: 0, bsDr: 0, bsCr: 0 };
}

function colsOf(a: Acct): Cols {
  const tb = split(a.openNet);
  const adjNet = a.openNet + a.pDr - a.pCr;
  const adj = split(adjNet);
  const isPnl = a.type === "income" || a.type === "expense";
  const pnl = isPnl ? adj : { dr: 0, cr: 0 };
  const bs = isPnl ? { dr: 0, cr: 0 } : adj;
  return {
    tbDr: tb.dr, tbCr: tb.cr,
    trDr: a.pDr, trCr: a.pCr,
    adjDr: adj.dr, adjCr: adj.cr,
    isDr: pnl.dr, isCr: pnl.cr,
    bsDr: bs.dr, bsCr: bs.cr,
  };
}

function addCols(t: Cols, c: Cols) {
  t.tbDr += c.tbDr; t.tbCr += c.tbCr; t.trDr += c.trDr; t.trCr += c.trCr;
  t.adjDr += c.adjDr; t.adjCr += c.adjCr; t.isDr += c.isDr; t.isCr += c.isCr;
  t.bsDr += c.bsDr; t.bsCr += c.bsCr;
}

export default async function WorksheetPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const from = sp.from && ISO.test(sp.from) ? sp.from : "2026-01-01";
  const to = sp.to && ISO.test(sp.to) ? sp.to : "2026-12-31";

  // Банкны хуулга журналд бүрэн тусаагүй (кодгүй/хуучирсан) эсэхийг шалгана —
  // импортолсон гүйлгээ transactions-д байгаа ч journal_entries-д ороогүй бол
  // энэ хүснэгтэд харагдахгүй тул анхааруулж, журналд бичих товч санал болгоно.
  const wsYear = Number(from.slice(0, 4)) || new Date().getFullYear();
  const bankStatus = await bankJournalStatus(supabase, wsYear);

  const { data: accData } = await supabase
    .from("accounts")
    .select("code, name, type")
    .eq("is_active", true)
    .limit(5000);
  const accInfo = new Map<string, { name: string; type: string }>();
  for (const a of (accData as AccRow[] | null) ?? [])
    accInfo.set(a.code, { name: a.name, type: a.type ?? typeFromCode(a.code) });

  // Нэгтгэлийг SQL дотор (worksheet_range RPC) — мөрийн хязгааргүй, хурдан.
  const { data: wsData } = await supabase.rpc("worksheet_range", { d_from: from, d_to: to });
  const acctByCode = new Map<string, Acct>();
  for (const r of (wsData as
    | { code: string; opening: number; pdebit: number; pcredit: number }[]
    | null) ?? []) {
    const info = accInfo.get(r.code);
    acctByCode.set(r.code, {
      code: r.code,
      name: info?.name ?? r.code,
      type: info?.type ?? typeFromCode(r.code),
      openNet: Number(r.opening) || 0,
      pDr: Number(r.pdebit) || 0,
      pCr: Number(r.pcredit) || 0,
    });
  }

  // Бүлэг (төрөл) → дансууд.
  const byType = new Map<string, Acct[]>();
  for (const a of acctByCode.values()) {
    const adjNet = a.openNet + a.pDr - a.pCr;
    if (Math.abs(a.openNet) < 0.5 && a.pDr < 0.5 && a.pCr < 0.5 && Math.abs(adjNet) < 0.5) continue;
    const arr = byType.get(a.type) ?? [];
    arr.push(a);
    byType.set(a.type, arr);
  }

  const grand = emptyCols();
  const groups = TYPE_ORDER.filter((t) => byType.has(t)).map((type) => {
    const list = (byType.get(type) ?? []).sort((a, b) => a.code.localeCompare(b.code));
    const sub = emptyCols();
    const rows = list.map((a) => {
      const c = colsOf(a);
      addCols(sub, c);
      return { a, c };
    });
    addCols(grand, sub);
    return { type, rows, sub };
  });

  // Тайлант үеийн ашиг/алдагдал — ОЗНДанс ба Үлдэгдэл балансыг тэнцүүлэх мөр.
  const profit = grand.isCr - grand.isDr; // >0 ашиг, <0 алдагдал
  const profitRow = emptyCols();
  if (profit >= 0) {
    profitRow.isDr = profit; // зардлын тал дээр нэмж ОЗН-г тэнцүүлнэ
    profitRow.bsCr = profit; // өмчийн тал дээр нэмж балансыг тэнцүүлнэ
  } else {
    profitRow.isCr = -profit;
    profitRow.bsDr = -profit;
  }
  const balanced = emptyCols();
  addCols(balanced, grand);
  addCols(balanced, profitRow);

  const C = ["tbDr", "tbCr", "trDr", "trCr", "adjDr", "adjCr", "isDr", "isCr", "bsDr", "bsCr"] as const;
  const cell = (c: Cols, k: (typeof C)[number], cls = "") => (
    <td key={k} className={`whitespace-nowrap px-2 py-1 text-right tabular-nums ${cls}`}>{f(c[k])}</td>
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Ажлын хүснэгт</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Working trial balance — шалгах баланс, гүйлгээ, ОЗНДанс, үлдэгдэл баланс. {from} — {to}.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <form method="get" className="flex items-end gap-2">
            <input type="date" name="from" defaultValue={from} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            <input type="date" name="to" defaultValue={to} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">Харах</button>
          </form>
          <PrintButton />
        </div>
      </div>

      <BankJournalBanner year={wsYear} status={bankStatus} />

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-100 text-zinc-600">
              <th rowSpan={2} className="px-2 py-1.5 text-left">Данс</th>
              <th colSpan={2} className="border-l border-zinc-200 px-2 py-1 text-center">Шалгах баланс</th>
              <th colSpan={2} className="border-l border-zinc-200 px-2 py-1 text-center">Гүйлгээ</th>
              <th colSpan={2} className="border-l border-zinc-200 px-2 py-1 text-center">Хаалтын өмнөх ШБ</th>
              <th colSpan={2} className="border-l border-zinc-200 px-2 py-1 text-center">ОЗНДанс</th>
              <th colSpan={2} className="border-l border-zinc-200 px-2 py-1 text-center">Үлдэгдэл баланс</th>
            </tr>
            <tr className="bg-zinc-50 text-zinc-500">
              {["Дебет", "Кредит", "Дебет", "Кредит", "Дебет", "Кредит", "Дебет", "Кредит", "Дебет", "Кредит"].map((h, i) => (
                <th key={i} className={`px-2 py-1 text-right ${i % 2 === 0 ? "border-l border-zinc-200" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {groups.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-zinc-400">Өгөгдөл олдсонгүй.</td></tr>
            ) : (
              groups.map((g) => (
                <GroupRows key={g.type} g={g} cell={cell} C={C} />
              ))
            )}
          </tbody>
          {groups.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold text-zinc-700">
                <td className="px-2 py-1.5 text-right">Дүн:</td>
                {C.map((k) => cell(grand, k))}
              </tr>
              <tr className="bg-amber-50 font-semibold text-amber-800">
                <td className="px-2 py-1.5">
                  Тайлант үеийн {profit >= 0 ? "цэвэр ашиг" : "цэвэр алдагдал"}
                </td>
                {C.map((k) => cell(profitRow, k))}
              </tr>
              <tr className="border-t border-zinc-400 bg-zinc-100 font-bold text-zinc-900">
                <td className="px-2 py-1.5">Нийт</td>
                {C.map((k) => cell(balanced, k))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function GroupRows({
  g,
  cell,
  C,
}: {
  g: { type: string; rows: { a: Acct; c: Cols }[]; sub: Cols };
  cell: (c: Cols, k: keyof Cols) => React.ReactElement;
  C: readonly (keyof Cols)[];
}) {
  return (
    <>
      <tr className="bg-zinc-50">
        <td colSpan={11} className="px-2 py-1 text-xs font-semibold text-zinc-700">
          {TYPE_LABEL[g.type] ?? g.type}
        </td>
      </tr>
      {g.rows.map(({ a, c }) => (
        <tr key={a.code} className="hover:bg-zinc-50">
          <td className="whitespace-nowrap px-2 py-1 text-zinc-700">
            <span className="font-mono text-zinc-500">{a.code}</span> {a.name}
          </td>
          {C.map((k) => cell(c, k))}
        </tr>
      ))}
      <tr className="border-t border-zinc-200 bg-white font-semibold text-zinc-700">
        <td className="px-2 py-1 text-right">Бүлгийн дүн:</td>
        {C.map((k) => cell(g.sub, k))}
      </tr>
    </>
  );
}
