import { loadDashboard } from "@/lib/dashboard";
import { AGING_BUCKETS, AGING_LABEL } from "@/lib/receivables-calc";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function fmt(n: number): string {
  return n ? Math.round(n).toLocaleString("en-US") : "0";
}

const MONTH_LABELS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
];

// ── Самбарын хүрээ ─────────────────────────────────────────────────────────
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white">
      <header className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-700">{title}</h2>
      </header>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

// ── Орлогын баганан график (сараар) ─────────────────────────────────────────
function IncomeChart({ monthly }: { monthly: number[] }) {
  const max = Math.max(1, ...monthly);
  return (
    <div className="p-4">
      <div className="flex h-48 items-end gap-1 sm:gap-2">
        {monthly.map((v, i) => {
          const h = max > 0 ? Math.max(2, (v / max) * 100) : 2;
          return (
            <div
              key={i}
              className="flex flex-1 flex-col items-center justify-end"
              title={`${MONTH_LABELS[i]}-р сар: ${fmt(v)}₮`}
            >
              <div
                className="w-full rounded-t bg-blue-500/80 transition-all hover:bg-blue-600"
                style={{ height: `${h}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1 sm:gap-2">
        {MONTH_LABELS.map((m, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-zinc-400">
            {m}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Үлдэгдлийн хүснэгт (data код/нэр → дүн) ──────────────────────────────────
function BalanceTable({
  rows,
  total,
  codeHeader,
  nameHeader,
  emptyText,
}: {
  rows: { code?: string; name: string; balance: number }[];
  total: number;
  codeHeader?: string;
  nameHeader: string;
  emptyText: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-zinc-400">{emptyText}</p>
    );
  }
  return (
    <div className="max-h-80 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-zinc-50 text-left text-xs font-medium text-zinc-500">
          <tr>
            {codeHeader && <th className="px-4 py-2">{codeHeader}</th>}
            <th className="px-4 py-2">{nameHeader}</th>
            <th className="px-4 py-2 text-right">Үлдэгдэл</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r, i) => (
            <tr key={(r.code ?? "") + i} className="hover:bg-zinc-50">
              {codeHeader && (
                <td className="whitespace-nowrap px-4 py-1.5 font-mono text-xs text-zinc-400">
                  {r.code}
                </td>
              )}
              <td className="px-4 py-1.5 text-zinc-800">{r.name}</td>
              <td className="whitespace-nowrap px-4 py-1.5 text-right tabular-nums text-zinc-700">
                {fmt(r.balance)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 border-t border-zinc-200 bg-zinc-50 text-sm font-semibold">
          <tr>
            <td className="px-4 py-2 text-zinc-500" colSpan={codeHeader ? 2 : 1}>
              Нийт {rows.length}
            </td>
            <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-zinc-900">
              {fmt(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Насжилтын хүснэгт ───────────────────────────────────────────────────────
function AgingTable({
  aging,
  total,
}: {
  aging: Record<string, number>;
  total: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
          <tr>
            <th className="px-4 py-2">Хоног</th>
            <th className="px-4 py-2 text-right">Дүн</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {AGING_BUCKETS.map((b) => (
            <tr key={b} className="hover:bg-zinc-50">
              <td className="px-4 py-2 text-zinc-700">{AGING_LABEL[b]}</td>
              <td
                className={`whitespace-nowrap px-4 py-2 text-right tabular-nums ${
                  b === "90+" ? "font-medium text-rose-700" : "text-zinc-600"
                }`}
              >
                {fmt(aging[b])}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm font-semibold">
          <tr>
            <td className="px-4 py-2 text-zinc-500">Нийт</td>
            <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-zinc-900">
              {fmt(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });
  const asof = sp.date && ISO.test(sp.date) ? sp.date : today;

  let data: Awaited<ReturnType<typeof loadDashboard>> | null = null;
  let error: string | null = null;
  try {
    data = await loadDashboard(asof);
  } catch (e) {
    error = e instanceof Error ? e.message : "Өгөгдөл ачаалахад алдаа гарлаа.";
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Санхүүгийн дашбоард
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {asof} огнооны байдлаар.
          </p>
        </div>
        <form method="get" className="flex items-end gap-2">
          <input
            type="date"
            name="date"
            defaultValue={asof}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Харах
          </button>
        </form>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : (
        data && (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 1. Дансны үлдэгдэл */}
            <Panel title="Дансны үлдэгдэл">
              <BalanceTable
                rows={data.accounts}
                total={data.accounts.reduce((a, b) => a + b.balance, 0)}
                codeHeader="Дансны код"
                nameHeader="Дансны нэр"
                emptyText="Үлдэгдэл олдсонгүй."
              />
            </Panel>

            {/* 2. Орлого */}
            <Panel title={`Орлого (${data.year} он) — ${fmt(data.incomeTotal)}₮`}>
              <IncomeChart monthly={data.incomeMonthly} />
            </Panel>

            {/* 3. Харилцагчийн авлагын үлдэгдэл */}
            <Panel title="Харилцагчийн авлагын үлдэгдэл">
              <BalanceTable
                rows={data.receivables.map((p) => ({
                  name: p.partnerName,
                  balance: p.total,
                }))}
                total={data.receivableTotal}
                nameHeader="Харилцагчийн нэр"
                emptyText="Авлага олдсонгүй."
              />
            </Panel>

            {/* 4. Харилцагчийн өглөгийн үлдэгдэл */}
            <Panel title="Харилцагчийн өглөгийн үлдэгдэл">
              <BalanceTable
                rows={data.payables.map((p) => ({
                  name: p.partnerName,
                  balance: p.total,
                }))}
                total={data.payableTotal}
                nameHeader="Харилцагчийн нэр"
                emptyText="Өглөг олдсонгүй."
              />
            </Panel>

            {/* 5. Авлагын насжилт */}
            <Panel title="Харилцагчийн авлагын насжилт">
              <AgingTable aging={data.receivableAging} total={data.receivableTotal} />
            </Panel>

            {/* 6. Өглөгийн насжилт */}
            <Panel title="Харилцагчийн өглөгийн насжилт">
              <AgingTable aging={data.payableAging} total={data.payableTotal} />
            </Panel>
          </div>
        )
      )}
    </div>
  );
}
