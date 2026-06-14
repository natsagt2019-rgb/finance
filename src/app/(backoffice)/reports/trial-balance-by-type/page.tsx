import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import {
  groupByType,
  type AccountType,
  type BalRow,
  type FullRangeRow,
} from "@/lib/trial-balance-by-type";

type SearchParams = { from?: string; to?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function fmt(n: number): string {
  if (!n) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export default async function TrialBalanceByTypePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });
  const year = today.slice(0, 4);
  const from = sp.from && ISO.test(sp.from) ? sp.from : `${year}-01-01`;
  const to = sp.to && ISO.test(sp.to) ? sp.to : today;

  const [{ data: rpcRows, error }, { data: accData }] = await Promise.all([
    supabase.rpc("trial_balance_full_range", { d_from: from, d_to: to }),
    supabase
      .from("accounts")
      .select("code, type")
      .eq("is_active", true)
      .limit(5000),
  ]);

  const typeByCode = new Map<string, AccountType>();
  for (const a of (accData as { code: string; type: AccountType | null }[] | null) ?? []) {
    if (a.type) typeByCode.set(a.code, a.type);
  }

  const { rows, total } = groupByType(
    (rpcRows as FullRangeRow[] | null) ?? [],
    typeByCode,
  );
  const hasData = rows.length > 0;

  // Тэнцлийн шалгалт (гүйлгээ Дт = Кт).
  const turnDiff = Math.abs(total.turnDt - total.turnKt);

  const cell = (v: number) =>
    `px-3 py-1.5 text-right tabular-nums ${v ? "text-zinc-800" : "text-zinc-300"}`;

  const cols: { key: keyof BalRow }[] = [
    { key: "openDt" },
    { key: "openKt" },
    { key: "turnDt" },
    { key: "turnKt" },
    { key: "closeDt" },
    { key: "closeKt" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Гүйлгээ баланс — дансны төрлөөр
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Журналаас динамик · {from} → {to} · MNT
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" className="flex items-end gap-2">
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
            />
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Харах
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      <div className="mt-1 hidden text-center print:block">
        <h1 className="text-xl font-bold text-zinc-900">Гүйлгээ баланс</h1>
        <p className="text-sm text-zinc-600">Дансны төрлөөр · {from} → {to}</p>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Алдаа: {error.message}
          <p className="mt-1 text-red-500">
            trial_balance_full_range функц үүссэн эсэхийг шалгана уу
            (scripts/trial-balance-full-range.sql).
          </p>
        </div>
      ) : null}

      {!hasData && !error ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          Энэ хугацаанд журналд гүйлгээ бүртгэгдээгүй байна.
        </div>
      ) : null}

      {!error && (
        <>
          <div className="mt-4 flex flex-wrap gap-3 print:hidden">
            <span
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                turnDiff < 0.5
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {turnDiff < 0.5
                ? "✓ Гүйлгээ тэнцэв (Дт = Кт)"
                : `⚠ Гүйлгээний зөрүү: ${fmt(turnDiff)}`}
            </span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-xs font-medium text-zinc-600">
                  <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-left">
                    Дансны төрлийн код
                  </th>
                  <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-left">
                    Дансны төрлийн нэр
                  </th>
                  <th colSpan={2} className="border border-zinc-200 px-3 py-2 text-center">
                    Эхний үлдэгдэл
                  </th>
                  <th colSpan={2} className="border border-zinc-200 px-3 py-2 text-center">
                    Гүйлгээ
                  </th>
                  <th colSpan={2} className="border border-zinc-200 px-3 py-2 text-center">
                    Эцсийн үлдэгдэл
                  </th>
                </tr>
                <tr className="bg-zinc-50 text-xs font-medium text-zinc-500">
                  {["Дебет", "Кредит", "Дебет", "Кредит", "Дебет", "Кредит"].map(
                    (h, i) => (
                      <th
                        key={i}
                        className="border border-zinc-200 px-3 py-1.5 text-right"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.type} className="hover:bg-zinc-50">
                    <td className="border border-zinc-200 px-3 py-1.5 font-mono text-xs text-zinc-500">
                      {r.code}
                    </td>
                    <td className="border border-zinc-200 px-3 py-1.5 font-medium text-zinc-800">
                      {r.name}
                    </td>
                    {cols.map(({ key }) => (
                      <td key={key} className={`border border-zinc-200 ${cell(r[key])}`}>
                        {fmt(r[key])}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-zinc-50 font-semibold text-zinc-900">
                  <td colSpan={2} className="border border-zinc-200 px-3 py-2">
                    Нийт
                  </td>
                  {cols.map(({ key }) => (
                    <td
                      key={key}
                      className="border border-zinc-200 px-3 py-2 text-right tabular-nums"
                    >
                      {fmt(total[key])}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
