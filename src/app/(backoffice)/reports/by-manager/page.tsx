import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";

type SearchParams = { year?: string; from?: string; to?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

type Row = {
  code: string;
  name: string;
  sales: number | null;
  collected: number | null;
  receivable: number | null;
  cost: number | null;
  profit: number | null;
  inv_count: number | null;
  txn_count: number | null;
};

function fmt(n: number): string {
  if (!n) return "0";
  return Math.round(n).toLocaleString("en-US");
}

export default async function ByManagerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  // Боломжит онууд — гүйлгээнээс.
  const { data: yearRows } = await supabase.from("transactions").select("year");
  const years = [
    ...new Set(
      ((yearRows as { year: number }[] | null) ?? [])
        .map((r) => r.year)
        .filter(Boolean),
    ),
  ].sort((a, b) => b - a);
  if (years.length === 0) years.push(2026);
  const selYear =
    sp.year && years.includes(Number(sp.year)) ? Number(sp.year) : years[0];

  // Огнооны муж эсвэл сонгосон жил.
  const fromIn = sp.from && ISO.test(sp.from) ? sp.from : "";
  const toIn = sp.to && ISO.test(sp.to) ? sp.to : "";
  const rangeMode = !!(fromIn && toIn);
  const dFrom = rangeMode ? fromIn : `${selYear}-01-01`;
  const dTo = rangeMode ? toIn : `${selYear}-12-31`;
  const label = rangeMode ? `${dFrom} → ${dTo}` : `${selYear} он`;

  const { data, error } = await supabase.rpc("manager_report", {
    d_from: dFrom,
    d_to: dTo,
  });
  const rows = ((data as Row[] | null) ?? []).map((r) => ({
    ...r,
    sales: Number(r.sales) || 0,
    collected: Number(r.collected) || 0,
    receivable: Number(r.receivable) || 0,
    cost: Number(r.cost) || 0,
    profit: Number(r.profit) || 0,
  }));

  const active = rows.filter((r) => r.sales || r.cost);
  const t = active.reduce(
    (a, r) => ({
      sales: a.sales + r.sales,
      collected: a.collected + r.collected,
      receivable: a.receivable + r.receivable,
      cost: a.cost + r.cost,
      profit: a.profit + r.profit,
    }),
    { sales: 0, collected: 0, receivable: 0, cost: 0, profit: 0 },
  );

  const inputCls =
    "rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Харицсан менежерийн тайлан
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Менежер бүрийн борлуулалт, цуглуулалт, авлагын үлдэгдэл, өртөг, ашиг —{" "}
            {label}. Эх сурвалж: нэхэмжлэх (responsible) + банк (K-код).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {!rangeMode && (
            <form method="get" className="flex items-center gap-2">
              <select name="year" defaultValue={String(selYear)} className={inputCls}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} он
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
          )}
          <form method="get" className="flex items-end gap-2">
            <input type="date" name="from" defaultValue={fromIn} className={inputCls} />
            <input type="date" name="to" defaultValue={toIn} className={inputCls} />
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Муж
            </button>
          </form>
          {rangeMode && (
            <a
              href="/reports/by-manager"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Цэвэрлэх
            </a>
          )}
          <PrintButton />
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Алдаа: {error.message}
          <p className="mt-1 text-red-500">
            managers хүснэгт + manager_report() RPC үүссэн эсэхийг шалгана уу.
          </p>
        </div>
      ) : null}

      {active.length === 0 && !error ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          {label} — менежерийн өгөгдөл алга.
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left">Менежер</th>
              <th className="px-4 py-2 text-right">Борлуулалт</th>
              <th className="px-4 py-2 text-right">Цуглуулсан</th>
              <th className="px-4 py-2 text-right">Авлага (нэхэх)</th>
              <th className="px-4 py-2 text-right">Өртөг</th>
              <th className="px-4 py-2 text-right">Ашиг</th>
              <th className="px-4 py-2 text-right">Ашгийн %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {active.map((r) => {
              const margin = r.sales ? (r.profit / r.sales) * 100 : 0;
              return (
                <tr key={r.code}>
                  <td className="px-4 py-1.5 text-zinc-700">
                    <span className="mr-2 font-mono text-xs text-zinc-400">
                      {r.code}
                    </span>
                    {r.name}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-zinc-600">
                    {fmt(r.sales)}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-zinc-600">
                    {fmt(r.collected)}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums font-medium text-amber-700">
                    {fmt(r.receivable)}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-zinc-600">
                    {fmt(r.cost)}
                  </td>
                  <td
                    className={`px-4 py-1.5 text-right tabular-nums font-medium ${
                      r.profit < 0 ? "text-red-600" : "text-green-700"
                    }`}
                  >
                    {fmt(r.profit)}
                  </td>
                  <td
                    className={`px-4 py-1.5 text-right tabular-nums ${
                      margin < 0 ? "text-red-600" : "text-zinc-500"
                    }`}
                  >
                    {margin.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          {active.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold">
                <td className="px-4 py-2 text-zinc-900">НИЙТ</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmt(t.sales)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmt(t.collected)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                  {fmt(t.receivable)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{fmt(t.cost)}</td>
                <td
                  className={`px-4 py-2 text-right tabular-nums ${
                    t.profit < 0 ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {fmt(t.profit)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-zinc-500">
                  {t.sales ? ((t.profit / t.sales) * 100).toFixed(1) : "0.0"}%
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="mt-3 text-xs text-zinc-400 print:hidden">
        Борлуулалт = нэхэмжилсэн дүн · Цуглуулсан = төлөгдсөн · Авлага = үлдэгдэл (нэхэж авах) ·
        Өртөг = K-кодтой банкны зарлага · Ашиг = Борлуулалт − Өртөг.
      </p>
    </div>
  );
}
