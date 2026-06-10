import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import {
  INCOME_STATEMENT,
  computeStatement,
  type FsBalanceMap,
} from "@/lib/fs-report";

type SearchParams = { year?: string; period?: string };

function fmt(n: number): string {
  if (!n) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Өмчийн бүрэлдэхүүн → fs_line (баланс 2.3.x).
const COMPONENTS: { key: string; label: string; fs: string }[] = [
  { key: "capital", label: "Өмч", fs: "СБТ 2.3.1 Өмч" },
  { key: "treasury", label: "Халаасны хувьцаа", fs: "СБТ 2.3.2 Халаасны хувьцаа" },
  { key: "addPaid", label: "Нэмж төлөгдсөн капитал", fs: "СБТ 2.3.3 Нэмж төлөгдсөн капитал" },
  { key: "reval", label: "Дахин үнэлгээний нэмэгдэл", fs: "СБТ 2.3.4 Хөрөнгийн дахин үнэлгээний нэмэгдэл" },
  { key: "fx", label: "Валютын хөрвүүлэлтийн нөөц", fs: "СБТ 2.3.5 Гадаад валютын хөрвүүлэлтийн нөөц" },
  { key: "other", label: "Эздийн өмчийн бусад хэсэг", fs: "СБТ 2.3.6 Эздийн өмчийн бусад хэсэг" },
  { key: "retained", label: "Хуримтлагдсан ашиг", fs: "СБТ 2.3.7 Хуримтлагдсан ашиг" },
];

export default async function EquityChangesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: yearRows } = await supabase
    .from("trial_balances")
    .select("year");
  const years = [
    ...new Set(
      ((yearRows as { year: number }[] | null) ?? [])
        .map((r) => r.year)
        .filter(Boolean),
    ),
  ].sort((a, b) => b - a);
  if (years.length === 0) years.push(new Date().getFullYear());
  const selYear =
    sp.year && years.includes(Number(sp.year)) ? Number(sp.year) : years[0];
  const period = sp.period || "annual";

  const { data: fsRows, error } = await supabase
    .from("fs_line_balances")
    .select("fs_line, opening_total, closing_total")
    .eq("year", selYear)
    .eq("period", period);

  const balances: FsBalanceMap = new Map();
  for (const r of (fsRows as
    | { fs_line: string; opening_total: number | null; closing_total: number | null }[]
    | null) ?? []) {
    balances.set(r.fs_line, {
      opening: Number(r.opening_total) || 0,
      closing: Number(r.closing_total) || 0,
    });
  }
  const hasData = balances.size > 0;

  // Тайлант үеийн цэвэр ашиг — орлогын тайлангаас.
  const incRows = computeStatement(INCOME_STATEMENT, balances);
  const netProfit = incRows.find((r) => "code" in r && r.code === "22")?.closing ?? 0;

  // Бүрэлдэхүүн бүрийн эхний/эцсийн (өмч = кредит, эерэг болгож эргүүлнэ).
  const open: Record<string, number> = {};
  const close: Record<string, number> = {};
  for (const c of COMPONENTS) {
    const b = balances.get(c.fs);
    open[c.key] = b ? -b.opening : 0;
    close[c.key] = b ? -b.closing : 0;
  }
  const openTotal = COMPONENTS.reduce((s, c) => s + open[c.key], 0);
  const closeTotal = COMPONENTS.reduce((s, c) => s + close[c.key], 0);

  // Цэвэр ашиг → хуримтлагдсан баганад.
  const profitRow: Record<string, number> = {};
  for (const c of COMPONENTS) profitRow[c.key] = c.key === "retained" ? netProfit : 0;

  const matrix: { label: string; vals: Record<string, number>; total: number; strong?: boolean }[] = [
    { label: "Эхний үлдэгдэл", vals: open, total: openTotal, strong: true },
    { label: "Тайлант үеийн цэвэр ашиг (алдагдал)", vals: profitRow, total: netProfit },
    { label: "Эцсийн үлдэгдэл", vals: close, total: closeTotal, strong: true },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Өмчийн өөрчлөлтийн тайлан
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            E-balance (СС №361) загвар. Эхний үлдэгдэл + цэвэр ашиг = эцсийн
            үлдэгдэл.
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Алдаа: {error.message}
        </div>
      ) : null}

      {!hasData && !error ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          {selYear} оны өгөгдөл ороогүй байна.
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left">Үзүүлэлт</th>
              {COMPONENTS.map((c) => (
                <th key={c.key} className="px-3 py-2 text-right">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-2 text-right">Нийт дүн</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {matrix.map((row, i) => (
              <tr
                key={i}
                className={row.strong ? "bg-zinc-50 font-semibold" : ""}
              >
                <td className="px-4 py-2 text-zinc-800">{row.label}</td>
                {COMPONENTS.map((c) => (
                  <td key={c.key} className="px-3 py-2 text-right tabular-nums text-zinc-600">
                    {fmt(row.vals[c.key])}
                  </td>
                ))}
                <td className="px-4 py-2 text-right font-semibold tabular-nums">
                  {fmt(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
