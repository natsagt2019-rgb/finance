import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { buildPitReport, pitReportYears } from "@/lib/pit-report";

type SearchParams = { year?: string; period?: string };

// period: "annual" | "q1".."q4" | "1".."12"
function monthRange(period: string): [number, number] {
  if (period === "annual" || !period) return [1, 12];
  const q: Record<string, [number, number]> = {
    q1: [1, 3],
    q2: [4, 6],
    q3: [7, 9],
    q4: [10, 12],
  };
  if (q[period]) return q[period];
  const m = Number(period);
  if (Number.isInteger(m) && m >= 1 && m <= 12) return [m, m];
  return [1, 12];
}

function fmt(n: number): string {
  if (!n) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "annual", label: "Жилийн дүн" },
  { value: "q1", label: "I улирал" },
  { value: "q2", label: "II улирал" },
  { value: "q3", label: "III улирал" },
  { value: "q4", label: "IV улирал" },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}-р сар`,
  })),
];

export default async function PersonalIncomeTaxPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const years = await pitReportYears(supabase);
  if (years.length === 0) years.push(new Date().getFullYear());
  const selYear =
    sp.year && years.includes(Number(sp.year)) ? Number(sp.year) : years[0];
  const period = sp.period || "annual";
  const [fromMonth, toMonth] = monthRange(period);

  const r = await buildPitReport(supabase, selYear, fromMonth, toMonth);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            ХХОАТ-ын тайлан — цалингаас суутгасан
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            ХХОАТ хууль 2019.03.22 — {selYear} он, {r.monthLabel}. Суутган
            төлөгчийн (ажил олгогч) тайлан. Хувь: {(r.pitRate * 100).toFixed(0)}%
            (шатлалт хасагдуулгатай).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" className="flex items-center gap-2">
            <select
              name="year"
              defaultValue={String(selYear)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y} он
                </option>
              ))}
            </select>
            <select
              name="period"
              defaultValue={period}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Шинэчлэх
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">№</th>
              <th className="px-3 py-2 text-left">Регистр (ДД)</th>
              <th className="px-3 py-2 text-left">Ажилтны нэр</th>
              <th className="px-3 py-2 text-right">Нийт орлого</th>
              <th className="px-3 py-2 text-right">ЭМНДШ</th>
              <th className="px-3 py-2 text-right">Татвар ногдох орлого</th>
              <th className="px-3 py-2 text-right">Хөнгөлөлт</th>
              <th className="px-3 py-2 text-right">Ногдуулсан ХХОАТ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {r.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                  Энэ хугацаанд цалингийн бүртгэл алга.
                </td>
              </tr>
            ) : (
              r.rows.map((row, i) => (
                <tr key={row.employeeId ?? `n${i}`}>
                  <td className="px-3 py-1.5 text-zinc-500">{i + 1}</td>
                  <td className="px-3 py-1.5 tabular-nums text-zinc-600">
                    {row.register || "—"}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-700">{row.name}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-zinc-600">
                    {fmt(row.gross)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-zinc-600">
                    {fmt(row.shInsurance)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-zinc-600">
                    {fmt(row.taxable)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-zinc-600">
                    {fmt(row.reliefApplied)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium text-zinc-900">
                    {fmt(row.pit)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {r.rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold">
                <td className="px-3 py-2" colSpan={3}>
                  Нийт ({r.rows.length} ажилтан)
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmt(r.total.gross)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmt(r.total.shInsurance)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmt(r.total.taxable)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmt(r.total.reliefApplied)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-900">
                  {fmt(r.total.pit)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        Татвар ногдох орлого = Нийт орлого − ЭМНДШ. Ногдуулсан ХХОАТ нь Арт.23.1
        шатлалт хасагдуулгыг тооцсон цэвэр дүн. Эх өгөгдөл: цалингийн модуль
        (320300 ХХОАТ-ын суутгалын өглөг данстай тулгана).
      </p>
    </div>
  );
}
