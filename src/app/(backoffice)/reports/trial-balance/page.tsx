import { createClient } from "@/lib/supabase/server";
import { TrialBalanceImportClient } from "./import-client";
import { TrialBalanceView } from "./trial-balance-view";
import { PnlSummaryBox, type PnlSummary } from "./pnl-summary";
import type { TbAccount } from "@/lib/trial-balance-view";

type SearchParams = { year?: string; from?: string; to?: string };

type AccMeta = { type: string; is_cogs: boolean };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  // Аль хэдийн орсон онуудыг харуулна.
  const { data: yearRows } = await supabase.from("trial_balances").select("year");
  const years = [
    ...new Set(
      ((yearRows as { year: number }[] | null) ?? [])
        .map((r) => r.year)
        .filter(Boolean),
    ),
  ].sort((a, b) => b - a);

  const defaultYear = years[0] ?? new Date().getFullYear();
  const viewYear =
    sp.year && years.includes(Number(sp.year)) ? Number(sp.year) : defaultYear;

  // Огнооны муж идэвхтэй бол журналаас динамик тооцно.
  const from = sp.from && ISO.test(sp.from) ? sp.from : "";
  const to = sp.to && ISO.test(sp.to) ? sp.to : "";
  const rangeMode = !!(from && to);

  let accounts: TbAccount[] = [];
  let label = "";

  if (rangeMode) {
    const { data: tbr } = await supabase.rpc("trial_balance_range", {
      d_from: from,
      d_to: to,
    });
    accounts = (
      (tbr as
        | { code: string; name: string | null; opening: number | null; closing: number | null }[]
        | null) ?? []
    ).map((r) => ({
      code: r.code,
      name: r.name ?? "",
      opening: Number(r.opening) || 0,
      closing: Number(r.closing) || 0,
    }));
    label = `${from} → ${to}`;
  } else if (years.length > 0) {
    const { data: tb } = await supabase
      .from("trial_balances")
      .select("account_code, account_name, opening_balance, closing_balance")
      .eq("year", viewYear)
      .eq("period", "annual")
      .limit(5000);
    accounts = (
      (tb as
        | {
            account_code: string;
            account_name: string | null;
            opening_balance: number | null;
            closing_balance: number | null;
          }[]
        | null) ?? []
    ).map((r) => ({
      code: r.account_code,
      name: r.account_name ?? "",
      opening: Number(r.opening_balance) || 0,
      closing: Number(r.closing_balance) || 0,
    }));
    label = `${viewYear} он`;
  }

  // ── P&L хураангуй (дансны type/is_cogs-аар, гүйлгээний дүнгээс) ──────────
  let pnl: PnlSummary | null = null;
  if (accounts.length > 0) {
    const { data: meta } = await supabase
      .from("accounts")
      .select("code, type, is_cogs")
      .eq("is_active", true)
      .limit(5000);
    const byCode = new Map<string, AccMeta>();
    for (const m of (meta as { code: string; type: string; is_cogs: boolean }[] | null) ?? []) {
      byCode.set(m.code, { type: m.type, is_cogs: m.is_cogs });
    }

    let income = 0;
    let cogs = 0;
    let expense = 0;
    for (const a of accounts) {
      const m = byCode.get(a.code);
      if (!m) continue;
      if (a.code.slice(0, 2) === "92") continue; // орлого-зардлын хаалтын данс
      const turn = a.closing - a.opening; // гүйлгээ (debit-positive)
      if (m.type === "income") {
        income += -turn;
      } else if (m.type === "expense") {
        if (a.code.slice(0, 2) === "91") continue; // бодит ОАТ — оронд 10% тооцоо
        const isCogs = m.is_cogs || a.code[0] === "6" || a.code.slice(0, 2) === "71";
        if (isCogs) cogs += turn;
        else expense += turn;
      }
    }
    pnl = { income, cogs, expense };
  }

  const inputCls =
    "rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 print:hidden">
        Гүйлгээ баланс
      </h1>
      <p className="mt-1 text-sm text-zinc-500 print:hidden">
        Жилээр (импорт) эсвэл огнооны мужаар (ерөнхий журналаас динамик) гаргана.
        {years.length > 0 ? ` Орсон он: ${years.join(", ")}.` : ""}
      </p>

      {/* Огнооны муж шүүлт — журналаас */}
      <form
        method="get"
        className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 print:hidden"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Эхлэх огноо
          </label>
          <input type="date" name="from" defaultValue={from} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Дуусах огноо
          </label>
          <input type="date" name="to" defaultValue={to} className={inputCls} />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Харах
        </button>
        {rangeMode && (
          <a
            href="/reports/trial-balance"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Цэвэрлэх
          </a>
        )}
        <span className="ml-auto text-xs text-zinc-400">
          {rangeMode
            ? "Журналаас динамик (сар/улирал)"
            : "Огноо сонгоход журналаас гарна"}
        </span>
      </form>

      {!rangeMode && (
        <div className="mt-4 print:hidden">
          <TrialBalanceImportClient defaultYear={defaultYear} />
        </div>
      )}

      {/* Гүйлгээ балансын харагдац */}
      {accounts.length > 0 ? (
        <div className="mt-8">
          {!rangeMode && years.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-2 print:hidden">
              {years.map((y) => (
                <a
                  key={y}
                  href={`/reports/trial-balance?year=${y}`}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    y === viewYear
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {y} он
                </a>
              ))}
            </div>
          )}
          <TrialBalanceView label={label} accounts={accounts} />
          {pnl && <PnlSummaryBox pnl={pnl} />}
        </div>
      ) : rangeMode ? (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          Энэ хугацаанд журналд гүйлгээ алга байна.
        </div>
      ) : null}
    </div>
  );
}
