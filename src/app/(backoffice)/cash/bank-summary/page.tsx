import { createClient } from "@/lib/supabase/server";
import { loadRegistry, displayMap, currencyMap } from "@/lib/bank-registry";
import {
  buildBankSummary,
  buildBlock,
  combineBlocks,
  type BankSummaryTxn,
  type BankBlock,
} from "@/lib/bank-summary";
import { PrintButton } from "@/components/print-button";

type SearchParams = { year?: string; company?: string };

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

  // Бүртгэлтэй бүх банкны данс (Тохиргоо → Банкны данс). Нэг байгууллага тул
  // компаниар бүлэглэхгүй — бүх данс ба касс нэгтгэгдэнэ.
  const registry = await loadRegistry(supabase);
  const groupAccountIds = registry.map((a) => a.accountNo);
  // PostgREST .in() хоосон массивт буруу ажиллах тул хамгаалалт.
  const inIds = groupAccountIds.length ? groupAccountIds : ["__none__"];
  const bankNames = displayMap(registry);

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
    .in("account_id", inIds);

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

  // Эхний үлдэгдэл — тухайн дансны GL кодын is_opening бичилтээс (Дт-эерэг).
  // (Эхний үлдэгдэл хуудсаар оруулсан дүн journal_entries-д GL кодоор ордог.
  // Хуучин account_balances нь богино түлхүүртэй тул зөвхөн нөөц эх сурвалж.)
  const glByAccount: Record<string, string> = {};
  for (const a of registry) if (a.glCode) glByAccount[a.accountNo] = a.glCode;
  const glCodes = [...new Set(Object.values(glByAccount))];
  const openDate = `${selYear - 1}-12-31`;

  const openingByAccount: Record<string, number> = {};
  if (glCodes.length) {
    const { data: oeData } = await supabase
      .from("journal_entries")
      .select("debit_code, credit_code, amount")
      .eq("is_opening", true)
      .eq("txn_date", openDate)
      .or(
        `debit_code.in.(${glCodes.join(",")}),credit_code.in.(${glCodes.join(",")})`,
      )
      .limit(5000);
    const glSet = new Set(glCodes);
    const netByGl: Record<string, number> = {};
    for (const e of (oeData as
      | { debit_code: string | null; credit_code: string | null; amount: number }[]
      | null) ?? []) {
      const amt = Number(e.amount) || 0;
      if (e.debit_code && glSet.has(e.debit_code))
        netByGl[e.debit_code] = (netByGl[e.debit_code] ?? 0) + amt;
      if (e.credit_code && glSet.has(e.credit_code))
        netByGl[e.credit_code] = (netByGl[e.credit_code] ?? 0) - amt;
    }
    for (const [acc, gl] of Object.entries(glByAccount)) {
      if (netByGl[gl] != null) openingByAccount[acc] = netByGl[gl];
    }
  }

  // Нөөц: account_balances (хэрэв дансны дугаараар байвал, GL-д олдоогүйг нөхнө).
  const { data: balData } = await supabase
    .from("account_balances")
    .select("account_id,opening_balance")
    .eq("year", selYear)
    .in("account_id", inIds);
  for (const r of (balData as { account_id: string; opening_balance: number }[] | null) ?? []) {
    if (openingByAccount[r.account_id] == null)
      openingByAccount[r.account_id] = Number(r.opening_balance);
  }

  const summary = buildBankSummary(
    summaryTxns,
    openingByAccount,
    groupAccountIds,
    bankNames,
  );

  // ── Валютын данс: валютаараа (CNY/USD…) зэрэгцээ цуврал ──────────────────────
  // monthly_cashflow нь ₮ (дүн × ханш) тул валютын дүнг гаргахын тулд transactions-
  // ийн түүхий income/expense-ийг account_id × сараар нэгтгэнэ. Эхний үлдэгдлийг
  // өмнөх оны цэвэр (орлого−зарлага) валютын дүнгээс бодно.
  const curByAccount = currencyMap(registry);
  const foreignIds = groupAccountIds.filter(
    (id) => (curByAccount[id] ?? "MNT").toUpperCase() !== "MNT",
  );
  if (foreignIds.length) {
    type FxTxn = {
      account_id: string;
      month: number;
      year: number;
      income: number | null;
      expense: number | null;
      exchange_rate: number | null;
    };
    // 1000-ийн хязгаараас сэргийлж хуудаслана (зөвхөн валютын данс).
    async function pageFxTxns(scope: (q: any) => any): Promise<FxTxn[]> {
      const out: FxTxn[] = [];
      for (let off = 0; off < 500000; off += 1000) {
        const { data } = await scope(
          supabase
            .from("transactions")
            .select("account_id,month,year,income,expense,exchange_rate")
            .in("account_id", foreignIds),
        ).range(off, off + 999);
        const page = (data as FxTxn[] | null) ?? [];
        out.push(...page);
        if (page.length < 1000) break;
      }
      return out;
    }
    const fxCur = await pageFxTxns((q) => q.eq("year", selYear));
    const fxPrior = await pageFxTxns((q) => q.lt("year", selYear));

    const fxInc: Record<string, number[]> = {};
    const fxExp: Record<string, number[]> = {};
    const fxOpen: Record<string, number> = {};
    const fxWarn: Record<string, number> = {};
    for (const id of foreignIds) {
      fxInc[id] = new Array(12).fill(0);
      fxExp[id] = new Array(12).fill(0);
      fxOpen[id] = 0;
      fxWarn[id] = 0;
    }
    const isAnom = (t: FxTxn) =>
      ((Number(t.income) || 0) !== 0 || (Number(t.expense) || 0) !== 0) &&
      (Number(t.exchange_rate) || 0) <= 1;
    for (const t of fxCur) {
      const m = (t.month ?? 0) - 1;
      if (m < 0 || m > 11) continue;
      fxInc[t.account_id][m] += Number(t.income) || 0;
      fxExp[t.account_id][m] += Number(t.expense) || 0;
      if (isAnom(t)) fxWarn[t.account_id]++;
    }
    for (const t of fxPrior) {
      fxOpen[t.account_id] += (Number(t.income) || 0) - (Number(t.expense) || 0);
      if (isAnom(t)) fxWarn[t.account_id]++;
    }
    for (const b of summary.banks) {
      const cur = (curByAccount[b.accountId] ?? "MNT").toUpperCase();
      if (cur === "MNT" || !fxInc[b.accountId]) continue;
      b.currency = cur;
      b.fx = buildBlock(
        b.accountId,
        b.bank,
        fxInc[b.accountId],
        fxExp[b.accountId],
        fxOpen[b.accountId],
      );
      if (fxWarn[b.accountId]) b.fxWarn = fxWarn[b.accountId];
    }
  }

  // ── Касс (бэлэн мөнгө) — cash_registers + cash_entries ──────────────────────
  // Банкнаас тусдаа хүснэгтэд хадгалагддаг тул нэгтгэлд гараар нэмнэ.
  // Нээлтийн үлдэгдэл = оны эхнээс өмнөх бүх баримтын (in−out) цэвэр дүн.
  const { data: regRows } = await supabase
    .from("cash_registers")
    .select("id,name,currency,company")
    .eq("is_active", true);
  const registers =
    (regRows as { id: number; name: string; currency: string; company: string | null }[] | null) ?? [];

  const cashBlocks: BankBlock[] = [];
  if (registers.length) {
    const regIds = registers.map((r) => r.id);
    // 1000-ийн хязгаараас сэргийлж хуудаслана.
    type CE = { register_id: number; type: string; amount_mnt: number; month: number; year: number };
    async function pageEntries(scope: (q: any) => any): Promise<CE[]> {
      const out: CE[] = [];
      for (let off = 0; off < 500000; off += 1000) {
        const { data } = await scope(
          supabase.from("cash_entries").select("register_id,type,amount_mnt,month,year").in("register_id", regIds),
        ).range(off, off + 999);
        const page = (data as CE[] | null) ?? [];
        out.push(...page);
        if (page.length < 1000) break;
      }
      return out;
    }
    const curEntries = await pageEntries((q) => q.eq("year", selYear));
    const priorEntries = await pageEntries((q) => q.lt("year", selYear));

    const incByReg: Record<number, number[]> = {};
    const expByReg: Record<number, number[]> = {};
    const openByReg: Record<number, number> = {};
    for (const r of registers) {
      incByReg[r.id] = new Array(12).fill(0);
      expByReg[r.id] = new Array(12).fill(0);
      openByReg[r.id] = 0;
    }
    for (const e of curEntries) {
      const m = (e.month ?? 0) - 1;
      if (m < 0 || m > 11) continue;
      if (e.type === "in") incByReg[e.register_id][m] += Number(e.amount_mnt);
      else expByReg[e.register_id][m] += Number(e.amount_mnt);
    }
    for (const e of priorEntries) {
      openByReg[e.register_id] += (e.type === "in" ? 1 : -1) * Number(e.amount_mnt);
    }
    for (const r of registers) {
      const label = r.currency && r.currency !== "MNT" ? `${r.name} (${r.currency})` : r.name;
      cashBlocks.push(buildBlock("КАСС", label, incByReg[r.id], expByReg[r.id], openByReg[r.id]));
    }
  }

  // Банк + касс нэгтгэл (нийт мөнгөн хөрөнгө).
  const allBlocks = [...summary.banks, ...cashBlocks];
  const grandTotal = combineBlocks(allBlocks, "ALL", "Нийт мөнгөн хөрөнгө");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Мөнгөн хөрөнгийн нэгтгэл — {selYear} он
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Банк ба касс тус бүрийн сарын мөнгөн хөдөлгөөн ба үлдэгдэл · MNT
          </p>
        </div>
        <div className="no-print">
          <PrintButton />
        </div>
      </div>

      {/* Шүүлт */}
      <form className="mt-6 flex flex-wrap items-end gap-3 no-print" method="get">
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
          {allBlocks.map((b, i) => (
            <BankCard key={`${b.accountId}-${i}`} block={b} highlight={false} />
          ))}
          <BankCard block={grandTotal} highlight />
        </div>
      )}
    </div>
  );
}

type SumRow = {
  label: string;
  vals: number[];
  total: number;
  kind: "bal" | "in" | "out" | "net";
};

function blockRows(b: BankBlock): SumRow[] {
  return [
    { label: "Эхний үлдэгдэл", vals: b.opening, total: b.yearOpening, kind: "bal" },
    { label: "Орлого", vals: b.income, total: sum(b.income), kind: "in" },
    { label: "Зарлага", vals: b.expense, total: sum(b.expense), kind: "out" },
    { label: "Цэвэр урсгал", vals: b.net, total: sum(b.net), kind: "net" },
    { label: "Эцсийн үлдэгдэл", vals: b.closing, total: b.yearClosing, kind: "bal" },
  ];
}

function BankCard({ block, highlight }: { block: BankBlock; highlight: boolean }) {
  const rows = blockRows(block);
  const fxRows = block.fx ? blockRows(block.fx) : null;
  const cur = block.currency;

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
          {cur && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              {cur}
            </span>
          )}
        </div>
        <div className="text-xs text-zinc-500">
          Эцсийн үлдэгдэл: <span className="font-medium text-zinc-700">{fmt(block.yearClosing)}₮</span>
          {block.fx && (
            <span className="font-medium text-amber-700">
              {"  ·  "}
              {fmt(block.fx.yearClosing)} {cur}
            </span>
          )}
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

            {/* Валютаараа (CNY/USD…) зэрэгцээ мөрүүд */}
            {fxRows && (
              <>
                <tr className="border-t-2 border-amber-200 bg-amber-50/40">
                  <td
                    colSpan={14}
                    className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-amber-700"
                  >
                    {cur} валютаар
                    {block.fxWarn ? (
                      <span className="ml-2 normal-case text-red-600">
                        ⚠ {block.fxWarn} гүйлгээ ханшгүй (rate≤1) — валютын дүн
                        гажуудсан байж болзошгүй, ханшийг нь засна уу.
                      </span>
                    ) : null}
                  </td>
                </tr>
                {fxRows.map((row) => {
                  const labelExtra =
                    row.kind === "in"
                      ? "text-green-700"
                      : row.kind === "out"
                        ? "text-red-700"
                        : "";
                  return (
                    <tr
                      key={`fx-${row.label}`}
                      className="border-t border-amber-100 bg-amber-50/20 text-zinc-600"
                    >
                      <td className={`px-3 py-1.5 ${labelExtra}`}>
                        {row.kind === "in" ? "↓ " : row.kind === "out" ? "↑ " : ""}
                        {row.label}{" "}
                        <span className="text-[10px] text-amber-600">({cur})</span>
                      </td>
                      {row.vals.map((v, j) => (
                        <Cell key={j} v={v} kind={row.kind} />
                      ))}
                      <Cell v={row.total} kind={row.kind} bold />
                    </tr>
                  );
                })}
              </>
            )}
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
