import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import {
  BALANCE_SHEET,
  computeStatement,
  type FsBalanceMap,
} from "@/lib/fs-report";

type SearchParams = { year?: string; period?: string };

function fmt(n: number): string {
  if (!n) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  // Боломжит онууд (trial_balances-аас).
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

  // fs_line нэгтгэл (view).
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

  const rows = computeStatement(BALANCE_SHEET, balances);

  // Тэнцлийн шалгалт: Актив (1.3) ↔ Өр+Өмч (2.4).
  const assets = rows.find((r) => "code" in r && r.code === "1.3");
  const liabEquity = rows.find((r) => "code" in r && r.code === "2.4");
  const diffOpen = (assets?.opening ?? 0) - (liabEquity?.opening ?? 0);
  const diffClose = (assets?.closing ?? 0) - (liabEquity?.closing ?? 0);
  const hasData = balances.size > 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Санхүүгийн байдлын тайлан
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            E-balance (СС №361) загвар. Эх өгөгдөл: гүйлгээ баланс (trial
            balance).
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
          <p className="mt-1 text-red-500">
            trial_balances / fs_line_balances үүссэн эсэхийг шалгана уу
            (schema.sql §13-14).
          </p>
        </div>
      ) : null}

      {!hasData && !error ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          {selYear} оны гүйлгээ баланс ороогүй байна. Эхлээд дансны үлдэгдлийг
          импортолно уу.
        </div>
      ) : null}

      {/* Тэнцлийн шалгалт */}
      <div className="mt-4 flex flex-wrap gap-3 print:hidden">
        <span
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            Math.abs(diffClose) < 0.5
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {Math.abs(diffClose) < 0.5
            ? "✓ Тэнцэл бүрэн (Актив = Пассив)"
            : `⚠ Зөрүү: ${fmt(diffClose)}`}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left">Үзүүлэлт</th>
              <th className="px-4 py-2 text-right">Эхний үлдэгдэл</th>
              <th className="px-4 py-2 text-right">Эцсийн үлдэгдэл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((r, i) => {
              if (r.kind === "section") {
                return (
                  <tr key={i} className="bg-zinc-100">
                    <td colSpan={3} className="px-4 py-2 font-bold text-zinc-900">
                      {r.label}
                    </td>
                  </tr>
                );
              }
              if (r.kind === "subhead") {
                return (
                  <tr key={i} className="bg-zinc-50/60">
                    <td colSpan={3} className="px-4 py-1.5 font-semibold text-zinc-700">
                      {r.label}
                    </td>
                  </tr>
                );
              }
              const isTotal = r.kind === "total";
              const isSub = r.kind === "subtotal";
              const strong = isTotal || isSub;
              return (
                <tr
                  key={i}
                  className={isTotal ? "bg-zinc-50 font-semibold" : ""}
                >
                  <td
                    className={`px-4 py-1.5 ${strong ? "font-semibold text-zinc-900" : "text-zinc-700"}`}
                  >
                    <span className="mr-2 font-mono text-xs text-zinc-400">
                      {r.code}
                    </span>
                    {r.kind === "line" || isTotal || isSub ? r.label : ""}
                  </td>
                  <td
                    className={`px-4 py-1.5 text-right tabular-nums ${strong ? "font-semibold" : "text-zinc-600"}`}
                  >
                    {fmt(r.opening)}
                  </td>
                  <td
                    className={`px-4 py-1.5 text-right tabular-nums ${strong ? "font-semibold" : "text-zinc-600"}`}
                  >
                    {fmt(r.closing)}
                  </td>
                </tr>
              );
            })}
            {/* Тэнцлийн мөрүүд */}
            <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold">
              <td className="px-4 py-1.5">Актив</td>
              <td className="px-4 py-1.5 text-right tabular-nums">
                {fmt(assets?.opening ?? 0)}
              </td>
              <td className="px-4 py-1.5 text-right tabular-nums">
                {fmt(assets?.closing ?? 0)}
              </td>
            </tr>
            <tr className="bg-zinc-50 font-semibold">
              <td className="px-4 py-1.5">Пассив</td>
              <td className="px-4 py-1.5 text-right tabular-nums">
                {fmt(liabEquity?.opening ?? 0)}
              </td>
              <td className="px-4 py-1.5 text-right tabular-nums">
                {fmt(liabEquity?.closing ?? 0)}
              </td>
            </tr>
            <tr className="bg-zinc-50 font-semibold">
              <td className="px-4 py-1.5">Зөрүү</td>
              <td className="px-4 py-1.5 text-right tabular-nums">
                {fmt(diffOpen)}
              </td>
              <td className="px-4 py-1.5 text-right tabular-nums">
                {fmt(diffClose)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
