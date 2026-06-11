import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import {
  INCOME_STATEMENT,
  computeStatement,
  type FsBalanceMap,
} from "@/lib/fs-report";
import {
  fsBalancesFromJournal,
  journalHasYear,
  reportYears,
} from "@/lib/fs-from-journal";

type SearchParams = { year?: string; period?: string; from?: string; to?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function fmt(n: number): string {
  if (!n) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function IncomeStatementPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const years = await reportYears(supabase);
  if (years.length === 0) years.push(new Date().getFullYear());
  const selYear =
    sp.year && years.includes(Number(sp.year)) ? Number(sp.year) : years[0];
  const period = sp.period || "annual";

  // Огнооны муж идэвхтэй бол журналаас динамик (мужийн орлого/зардал).
  const from = sp.from && ISO.test(sp.from) ? sp.from : "";
  const to = sp.to && ISO.test(sp.to) ? sp.to : "";
  const rangeMode = !!(from && to);

  // Жил сонгоход журналд гүйлгээ байвал журналаас, үгүй бол snapshot.
  const yearFromJournal = !rangeMode && (await journalHasYear(supabase, selYear));
  const journalMode = rangeMode || yearFromJournal;

  let balances: FsBalanceMap = new Map();
  let error: { message: string } | null = null;

  if (rangeMode) {
    const { is } = await fsBalancesFromJournal(supabase, from, to);
    balances = is;
  } else if (yearFromJournal) {
    // Тайлант он = эргэлт (closing); өмнөх он = харьцуулах багана (opening).
    const cur = await fsBalancesFromJournal(supabase, `${selYear}-01-01`, `${selYear}-12-31`);
    const prev = await fsBalancesFromJournal(supabase, `${selYear - 1}-01-01`, `${selYear - 1}-12-31`);
    for (const [fs, v] of cur.is) balances.set(fs, { opening: 0, closing: v.closing });
    for (const [fs, v] of prev.is) {
      const b = balances.get(fs) ?? { opening: 0, closing: 0 };
      b.opening = v.closing;
      balances.set(fs, b);
    }
  } else {
    const { data: fsRows, error: e } = await supabase
      .from("fs_line_balances")
      .select("fs_line, opening_total, closing_total")
      .eq("year", selYear)
      .eq("period", period);
    error = e;
    for (const r of (fsRows as
      | { fs_line: string; opening_total: number | null; closing_total: number | null }[]
      | null) ?? []) {
      balances.set(r.fs_line, {
        opening: Number(r.opening_total) || 0,
        closing: Number(r.closing_total) || 0,
      });
    }
  }

  const label = rangeMode
    ? `${from} → ${to}`
    : yearFromJournal
      ? `${selYear} он (журналаас)`
      : `${selYear} он`;
  const rows = computeStatement(INCOME_STATEMENT, balances);
  const hasData = balances.size > 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Орлогын дэлгэрэнгүй тайлан
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            E-balance (СС №361) загвар — {label}.{" "}
            {journalMode ? "Журналаас динамик." : "Эх өгөгдөл: гүйлгээ баланс."}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {!rangeMode && (
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
          )}
          <form method="get" className="flex items-end gap-2">
            <input type="date" name="from" defaultValue={from} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            <input type="date" name="to" defaultValue={to} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Муж
            </button>
          </form>
          {rangeMode && (
            <a
              href="/reports/income-statement"
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
            trial_balances / fs_line_balances үүссэн эсэхийг шалгана уу
            (schema.sql §13-14).
          </p>
        </div>
      ) : null}

      {!hasData && !error ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          {label} — өгөгдөл алга.{" "}
          {rangeMode
            ? "Энэ хугацаанд журналд гүйлгээ байхгүй."
            : "Эхлээд гүйлгээ баланс эсвэл журнал оруулна уу."}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left">Үзүүлэлт</th>
              <th className="px-4 py-2 text-right">Өмнөх үе</th>
              <th className="px-4 py-2 text-right">Тайлант үе</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((r, i) => {
              const isTotal = r.kind === "total";
              const isSub = r.kind === "subtotal";
              const strong = isTotal || isSub;
              return (
                <tr
                  key={i}
                  className={
                    isTotal
                      ? "border-t-2 border-zinc-300 bg-zinc-50 font-semibold"
                      : isSub
                        ? "bg-zinc-50/60 font-semibold"
                        : ""
                  }
                >
                  <td
                    className={`px-4 py-1.5 ${strong ? "font-semibold text-zinc-900" : "text-zinc-700"}`}
                  >
                    {"label" in r ? r.label : ""}
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
