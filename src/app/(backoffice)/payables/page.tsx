import { createClient } from "@/lib/supabase/server";
import {
  AGING_BUCKETS,
  AGING_LABEL,
  isPayableAccount,
  normalizePartner,
  settleFifo,
  summarizeReceivables,
  type DatedAmount,
  type ReceivableItem,
} from "@/lib/receivables-calc";

const ENTRY_LIMIT = 100000;
const NO_PARTNER = "Тодорхойгүй (партнергүй)";

function fmt(n: number): string {
  return n ? Math.round(n).toLocaleString("en-US") : "—";
}

type AccRow = { code: string; name: string; type: string | null; fs_line: string | null };
type EntryRow = { txn_date: string; partner_name: string | null; amount: number };

export default async function PayablesPage() {
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });

  // 1) Өглөгийн дансны кодууд.
  const { data: accData } = await supabase
    .from("accounts")
    .select("code, name, type, fs_line")
    .eq("is_active", true)
    .limit(5000);
  const payCodes = ((accData as AccRow[] | null) ?? [])
    .filter((a) => isPayableAccount(a.name, a.type, a.fs_line))
    .map((a) => a.code);

  // 2) Журналаас: Кт өглөг → үүснэ (огноотой), Дт → төлөгдөнө (FIFO хаалт).
  const jCreated = new Map<string, DatedAmount[]>();
  const jPaid = new Map<string, number>();
  const displayName = new Map<string, string>();

  if (payCodes.length > 0) {
    const [{ data: cr }, { data: dr }] = await Promise.all([
      supabase
        .from("journal_entries")
        .select("txn_date, partner_name, amount")
        .in("credit_code", payCodes)
        .lte("txn_date", today)
        .limit(ENTRY_LIMIT),
      supabase
        .from("journal_entries")
        .select("partner_name, amount")
        .in("debit_code", payCodes)
        .lte("txn_date", today)
        .limit(ENTRY_LIMIT),
    ]);

    for (const e of (cr as EntryRow[] | null) ?? []) {
      const key = normalizePartner(e.partner_name);
      if (key && !displayName.has(key) && e.partner_name)
        displayName.set(key, e.partner_name.trim());
      const arr = jCreated.get(key) ?? [];
      arr.push({ date: e.txn_date, amount: Number(e.amount) || 0 });
      jCreated.set(key, arr);
    }
    for (const e of (dr as { partner_name: string | null; amount: number }[] | null) ?? []) {
      const key = normalizePartner(e.partner_name);
      jPaid.set(key, (jPaid.get(key) ?? 0) + (Number(e.amount) || 0));
    }
  }

  // 3) Харилцагч бүрээр FIFO хаалт → нээлттэй өглөг.
  const items: ReceivableItem[] = [];
  for (const [key, created] of jCreated) {
    const open = settleFifo(created, jPaid.get(key) ?? 0);
    const name = key ? displayName.get(key) ?? key : NO_PARTNER;
    for (const chunk of open) {
      items.push({ partnerKey: key, partnerName: name, amount: chunk.amount, date: chunk.date, source: "journal" });
    }
  }

  const sum = summarizeReceivables(items, today);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">
            📤 Өглөгийн насжилт
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Ерөнхий журналын өглөгийн данс (FIFO хаалт) — харилцагч бүрийн
            өглөгийг насжилтаар нэгтгэв. {today} байдлаар.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Нийт өглөг</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-amber-900">{fmt(sum.total)}₮</p>
          <p className="mt-1 text-xs text-amber-500">{sum.partnerCount} харилцагч</p>
        </div>
        {AGING_BUCKETS.slice(1).map((b) => (
          <div
            key={b}
            className={`rounded-2xl border p-5 ${b === "90+" ? "border-rose-100 bg-rose-50" : "border-zinc-200 bg-white"}`}
          >
            <p className={`text-xs font-medium uppercase tracking-wide ${b === "90+" ? "text-rose-600" : "text-zinc-500"}`}>
              {AGING_LABEL[b]}
            </p>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${b === "90+" ? "text-rose-900" : "text-zinc-800"}`}>
              {fmt(sum.buckets[b])}₮
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left">Харилцагч</th>
              {AGING_BUCKETS.map((b) => (
                <th key={b} className="px-4 py-2 text-right">{AGING_LABEL[b]}</th>
              ))}
              <th className="px-4 py-2 text-right">Нийт</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sum.partners.map((p) => (
              <tr key={p.partnerKey || p.partnerName} className="hover:bg-zinc-50">
                <td className="px-4 py-1.5 text-zinc-800">
                  <a
                    href={`/reports/partner-balances/${encodeURIComponent(p.partnerName)}`}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {p.partnerName}
                  </a>
                </td>
                {AGING_BUCKETS.map((b) => (
                  <td key={b} className={`px-4 py-1.5 text-right tabular-nums ${b === "90+" && p.buckets[b] > 0 ? "text-rose-600" : "text-zinc-600"}`}>
                    {fmt(p.buckets[b])}
                  </td>
                ))}
                <td className="px-4 py-1.5 text-right tabular-nums font-semibold text-zinc-900">{fmt(p.total)}</td>
              </tr>
            ))}
            {sum.partners.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-400">
                  Нээлттэй өглөг алга.
                </td>
              </tr>
            )}
          </tbody>
          {sum.partners.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold">
                <td className="px-4 py-2">НИЙТ ({sum.partnerCount})</td>
                {AGING_BUCKETS.map((b) => (
                  <td key={b} className="px-4 py-2 text-right tabular-nums">{fmt(sum.buckets[b])}</td>
                ))}
                <td className="px-4 py-2 text-right tabular-nums">{fmt(sum.total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
