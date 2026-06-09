import { createClient } from "@/lib/supabase/server";
import { BANK_DISPLAY } from "@/lib/bank-importer";
import { buildBankSummary, type BankSummaryTxn, type BankBlock } from "@/lib/bank-summary";
import { PrintButton } from "@/components/print-button";

type SearchParams = { year?: string; company?: string };

// Компани → дансны бүлэг. Дараалал нь эх системтэй ойролцоо (Голомт, ХХБ/ТДБ, М банк).
const COMPANY_GROUPS: Record<string, { label: string; accounts: string[] }> = {
  tt: { label: "Түмэн Тээх", accounts: ["GM", "TT", "MB"] },
  tr: { label: "Түмэн Ресурс", accounts: ["TR"] },
  all: { label: "Бүгд", accounts: ["GM", "TT", "MB", "TR"] },
};

const MN_MONTH = ["1-р", "2-р", "3-р", "4-р", "5-р", "6-р", "7-р", "8-р", "9-р", "10-р", "11-р", "12-р"];

function fmt(n: number): string {
  if (!n) return "—";
  return Math.round(n).toLocaleString("en-US");
}
function fmtSigned(n: number): string {
  if (!n) return "—";
  const s = Math.round(Math.abs(n)).toLocaleString("en-US");
  return n > 0 ? `+${s}` : `−${s}`;
}
function sum(a: number[]): number {
  return a.reduce((s, v) => s + v, 0);
}

export default async function BankSummaryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const companyKey = COMPANY_GROUPS[sp.company ?? ""] ? sp.company! : "tt";
  const group = COMPANY_GROUPS[companyKey];

  const { data: yearRows } = await supabase.from("transactions").select("year");
  const years = [
    ...new Set(((yearRows as { year: number }[] | null) ?? []).map((r) => r.year).filter(Boolean)),
  ].sort((a, b) => b - a);
  if (years.length === 0) years.push(2026);
  const selYear = sp.year && years.includes(Number(sp.year)) ? Number(sp.year) : years[0];

  // Данс × сарын нэгтгэл — monthly_cashflow view (DB дотор GROUP BY, 1000-ийн хязгааргүй).
  const { data: mcData, error } = await supabase
    .from("monthly_cashflow")
    .select("account_id,month,total_income,total_expense")
    .eq("year", selYear)
    .in("account_id", group.accounts);

  const summaryTxns: BankSummaryTxn[] = (
    (mcData as
      | { account_id: string; month: number; total_income: number | null; total_expense: number | null }[]
      | null) ?? []
  ).map((r) => ({
    account_id: r.account_id,
    month: r.month,
    income: r.total_income,
    expense: r.total_expense,
  }));

  const { data: balData } = await supabase
    .from("account_balances")
    .select("account_id,opening_balance")
    .eq("year", selYear)
    .in("account_id", group.accounts);

  const openingByAccount: Record<string, number> = {};
  for (const r of (balData as { account_id: string; opening_balance: number }[] | null) ?? []) {
    openingByAccount[r.account_id] = Number(r.opening_balance);
  }

  const summary = buildBankSummary(
    summaryTxns,
    openingByAccount,
    group.accounts,
    BANK_DISPLAY as Record<string, string>,
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Мөнгөн хөрөнгийн нэгтгэл — {selYear} он
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Банк тус бүрийн сарын мөнгөн хөдөлгөөн ба үлдэгдэл · {group.label} · MNT
          </p>
        </div>
        <div className="no-print">
          <PrintButton />
        </div>
      </div>

      {/* Шүүлт */}
      <form className="mt-6 flex flex-wrap items-end gap-3 no-print" method="get">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Компани
          <select
            name="company"
            defaultValue={companyKey}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
          >
            {Object.entries(COMPANY_GROUPS).map(([k, g]) => (
              <option key={k} value={k}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Он
          <select
            name="year"
            defaultValue={String(selYear)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Харах
        </button>
      </form>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-600">
          Алдаа: {error.message}
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {summary.banks.map((b) => (
            <BankCard key={b.accountId} block={b} highlight={false} />
          ))}
          <BankCard block={summary.total} highlight />
        </div>
      )}
    </div>
  );
}

function BankCard({ block, highlight }: { block: BankBlock; highlight: boolean }) {
  const rows: {
    label: string;
    vals: number[];
    total: number;
    kind: "bal" | "in" | "out" | "net";
  }[] = [
    { label: "Эхний үлдэгдэл", vals: block.opening, total: block.yearOpening, kind: "bal" },
    { label: "Орлого", vals: block.income, total: sum(block.income), kind: "in" },
    { label: "Зарлага", vals: block.expense, total: sum(block.expense), kind: "out" },
    { label: "Цэвэр урсгал", vals: block.net, total: sum(block.net), kind: "net" },
    { label: "Эцсийн үлдэгдэл", vals: block.closing, total: block.yearClosing, kind: "bal" },
  ];

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        highlight ? "border-zinc-400 bg-zinc-50" : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-white">
            {block.accountId}
          </span>
          <span className="font-semibold text-zinc-900">{block.bank}</span>
        </div>
        <div className="text-xs text-zinc-500">
          Эхний үлдэгдэл: <span className="font-medium text-zinc-700">{fmt(block.yearOpening)}₮</span>
          {"  ·  "}
          Эцсийн үлдэгдэл: <span className="font-medium text-zinc-700">{fmt(block.yearClosing)}₮</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-100 text-zinc-500">
              <th className="px-3 py-2 text-left font-medium" style={{ minWidth: 130 }}>
                Үзүүлэлт
              </th>
              {MN_MONTH.map((m) => (
                <th key={m} className="px-2 py-2 text-right font-medium" style={{ minWidth: 84 }}>
                  {m} сар
                </th>
              ))}
              <th className="bg-zinc-200 px-2 py-2 text-right font-semibold" style={{ minWidth: 100 }}>
                Нийт
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowCls =
                row.kind === "bal"
                  ? "bg-white font-medium text-zinc-800"
                  : row.kind === "net"
                    ? "bg-amber-50/60 font-medium"
                    : "";
              const labelExtra =
                row.kind === "in" ? "text-green-700" : row.kind === "out" ? "text-red-700" : "";
              return (
                <tr key={row.label} className={`border-t border-zinc-100 ${rowCls}`}>
                  <td className={`px-3 py-1.5 ${labelExtra}`}>
                    {row.kind === "in" ? "↓ " : row.kind === "out" ? "↑ " : ""}
                    {row.label}
                  </td>
                  {row.vals.map((v, j) => (
                    <Cell key={j} v={v} kind={row.kind} />
                  ))}
                  <Cell v={row.total} kind={row.kind} bold />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({
  v,
  kind,
  bold = false,
}: {
  v: number;
  kind: "bal" | "in" | "out" | "net";
  bold?: boolean;
}) {
  let color = "";
  let text: string;
  if (kind === "net") {
    text = fmtSigned(v);
    color = v > 0 ? "text-green-700" : v < 0 ? "text-red-600" : "text-zinc-400";
  } else {
    text = fmt(v);
    if (kind === "in") color = v ? "text-green-700" : "text-zinc-300";
    else if (kind === "out") color = v ? "text-red-600" : "text-zinc-300";
    else color = v < 0 ? "text-red-600" : "text-zinc-700";
  }
  return (
    <td className={`px-2 py-1.5 text-right tabular-nums ${color} ${bold ? "font-semibold" : ""}`}>
      {text}
    </td>
  );
}
