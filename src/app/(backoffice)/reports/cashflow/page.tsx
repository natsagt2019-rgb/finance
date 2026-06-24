import { createClient } from "@/lib/supabase/server";
import { loadRegistry } from "@/lib/bank-registry";
import { buildInternalCashflow, type CodeMonthly } from "@/lib/cashflow";
import { PrintButton } from "@/components/print-button";

type SearchParams = { mode?: string; year?: string; company?: string };

const MN_MONTH = ["1-р", "2-р", "3-р", "4-р", "5-р", "6-р", "7-р", "8-р", "9-р", "10-р", "11-р", "12-р"];

function fmt(n: number): string {
  if (!n) return "—";
  return Math.round(n).toLocaleString("en-US");
}

function sum(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0);
}

export default async function CashflowPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  // Бүртгэлтэй бүх банкны данс (Тохиргоо → Банкны данс). Нэг байгууллага тул
  // компаниар бүлэглэхгүй — бүх данс нэгтгэгдэнэ.
  const registry = await loadRegistry(supabase);
  const groupAccountIds = registry.map((a) => a.accountNo);
  const inIds = groupAccountIds.length ? groupAccountIds : ["__none__"];

  // Боломжит онууд (transactions-аас, байхгүй бол энэ он).
  const { data: yearRows } = await supabase.from("transactions").select("year");
  const years = [
    ...new Set(((yearRows as { year: number }[] | null) ?? []).map((r) => r.year).filter(Boolean)),
  ].sort((a, b) => b - a);
  if (years.length === 0) years.push(2026);
  const selYear = sp.year && years.includes(Number(sp.year)) ? Number(sp.year) : years[0];

  // Ангилал × сарын нэгтгэл — monthly_by_category view ашиглана.
  // (DB дотор GROUP BY хийдэг тул 1000 мөрийн хязгаарт өртөхгүй, бүх гүйлгээг хамруулна.)
  const { data: catData, error } = await supabase
    .from("monthly_by_category")
    .select("month,category_code,total")
    .eq("year", selYear)
    .in("account_id", inIds);

  // Эхний мөнгөн үлдэгдэл (account_balances-аас).
  const { data: balData } = await supabase
    .from("account_balances")
    .select("opening_balance")
    .eq("year", selYear)
    .in("account_id", inIds);

  const openingCash = ((balData as { opening_balance: number }[] | null) ?? []).reduce(
    (s, r) => s + Number(r.opening_balance),
    0,
  );

  // Код × сар → дүн map (дансуудаар нэгтгэнэ).
  const byCode: CodeMonthly = {};
  for (const r of (catData as { month: number; category_code: string; total: number }[] | null) ?? []) {
    if (!r.category_code || r.month < 1 || r.month > 12) continue;
    (byCode[r.category_code] ??= new Array(12).fill(0))[r.month - 1] += Number(r.total);
  }
  const report = buildInternalCashflow(byCode, openingCash);

  const colCount = 2 + 12 + 1; // код + тайлбар + 12 сар + нийт

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Мөнгөн урсгалын тайлан</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Дотоод тайлан (шууд арга) · {selYear} он · MNT
          </p>
        </div>
        <div className="no-print">
          <PrintButton />
        </div>
      </div>

      {/* Шүүлт */}
      <form className="mt-6 flex flex-wrap items-end gap-3 no-print" method="get">
        <input type="hidden" name="mode" value="internal" />
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
          <p className="mt-2 text-zinc-500">transactions хүснэгт үүссэн эсэхийг шалгана уу.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-800 text-white">
                <th className="px-2 py-2 text-left font-medium">Код</th>
                <th className="px-3 py-2 text-left font-medium" style={{ minWidth: 240 }}>
                  Үзүүлэлт
                </th>
                {MN_MONTH.map((m) => (
                  <th key={m} className="px-2 py-2 text-right font-medium" style={{ minWidth: 86 }}>
                    {m}
                  </th>
                ))}
                <th className="bg-zinc-900 px-2 py-2 text-right font-semibold" style={{ minWidth: 100 }}>
                  Нийт
                </th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, i) => {
                if (row.kind === "section") {
                  return (
                    <tr key={i} className="bg-zinc-700 text-white">
                      <td colSpan={colCount} className="px-3 py-1.5 font-semibold tracking-wide">
                        {row.label}
                      </td>
                    </tr>
                  );
                }
                if (row.kind === "subheader") {
                  return (
                    <tr key={i} className="bg-zinc-100">
                      <td />
                      <td
                        colSpan={colCount - 1}
                        className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500"
                      >
                        {row.label}
                      </td>
                    </tr>
                  );
                }
                if (row.kind === "data") {
                  const total = sum(row.vals);
                  return (
                    <tr key={i} className="border-t border-zinc-100 hover:bg-zinc-50">
                      <td className="px-2 py-1 font-mono text-[11px] text-zinc-400">{row.code}</td>
                      <td
                        className="px-3 py-1 text-zinc-700"
                        style={{ paddingLeft: (row.indent ?? 1) * 14 }}
                      >
                        {row.label}
                      </td>
                      {row.vals.map((v, j) => (
                        <NumCell key={j} v={v} />
                      ))}
                      <NumCell v={total} className="font-medium" />
                    </tr>
                  );
                }
                if (row.kind === "total") {
                  const total = sum(row.vals);
                  const cls =
                    row.level === "net"
                      ? "bg-zinc-700 text-white font-semibold"
                      : row.level === "section"
                        ? "bg-zinc-200 font-semibold text-zinc-800"
                        : "bg-zinc-50 font-medium text-zinc-700";
                  return (
                    <tr key={i} className={cls}>
                      <td className="px-2 py-1 font-mono text-[11px] opacity-70">{row.code ?? ""}</td>
                      <td className="px-3 py-1">{row.label}</td>
                      {row.vals.map((v, j) => (
                        <NumCell key={j} v={v} dark={row.level === "net"} />
                      ))}
                      <NumCell v={total} dark={row.level === "net"} className="font-semibold" />
                    </tr>
                  );
                }
                // balance
                return (
                  <tr key={i} className="border-t-2 border-zinc-300 bg-zinc-100 font-medium text-zinc-800">
                    <td />
                    <td className="px-3 py-1">{row.label}</td>
                    {row.vals.map((v, j) => (
                      <NumCell key={j} v={v} />
                    ))}
                    <NumCell v={row.total} className="font-semibold" />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-zinc-400">
        Эх сурвалж: дансны хуулга (transactions) · ангилал кодоор нэгтгэв. Эхний үлдэгдэл:
        account_balances ({selYear}).
      </p>
    </div>
  );
}

function NumCell({
  v,
  dark = false,
  className = "",
}: {
  v: number;
  dark?: boolean;
  className?: string;
}) {
  const neg = v < 0;
  const color = neg ? (dark ? "text-red-300" : "text-red-600") : "";
  return (
    <td className={`px-2 py-1 text-right tabular-nums ${color} ${className}`}>{fmt(v)}</td>
  );
}
