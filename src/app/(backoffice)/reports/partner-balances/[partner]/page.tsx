import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";

type SearchParams = { to?: string };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

type JE = {
  txn_date: string;
  description: string | null;
  debit_code: string | null;
  credit_code: string | null;
  amount: number;
};

function fmt(n: number): string {
  if (!n) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export default async function PartnerLedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ partner: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { partner: rawPartner } = await params;
  const partner = decodeURIComponent(rawPartner);
  const sp = await searchParams;
  const to = sp.to && ISO.test(sp.to) ? sp.to : "2026-12-31";

  const supabase = await createClient();
  const { data } = await supabase
    .from("journal_entries")
    .select("txn_date, description, debit_code, credit_code, amount")
    .eq("partner_name", partner)
    .lte("txn_date", to)
    .or(
      "debit_code.in.(120101,310101),credit_code.in.(120101,310101)",
    )
    .order("txn_date", { ascending: true })
    .order("id", { ascending: true })
    .limit(5000);

  const entries = (data as JE[] | null) ?? [];

  // Гүйлгээ бүрийн авлага/өглөгийн нөлөө + явцын цэвэр үлдэгдэл.
  let runRec = 0;
  let runPay = 0;
  const rows = entries.map((e) => {
    const amt = Number(e.amount) || 0;
    const recEff =
      e.debit_code === "130100" ? amt : e.credit_code === "130100" ? -amt : 0;
    const payEff =
      e.credit_code === "310100" ? amt : e.debit_code === "310100" ? -amt : 0;
    runRec += recEff;
    runPay += payEff;
    return { ...e, recEff, payEff, net: runRec - runPay };
  });

  const totRec = runRec;
  const totPay = runPay;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <a
            href="/reports/partner-balances"
            className="text-sm text-zinc-500 hover:text-zinc-800"
          >
            ← Харилцагчийн тооцоо
          </a>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">{partner}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Гүйлгээний дэлгэрэнгүй (авлага 120101, өглөг 310101) — {to} хүртэл.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">Авлагын үлдэгдэл</div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-emerald-700">{fmt(totRec)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">Өглөгийн үлдэгдэл</div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-amber-700">{fmt(totPay)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">Цэвэр (авлага−өглөг)</div>
          <div className={`mt-1 text-lg font-semibold tabular-nums ${totRec - totPay < 0 ? "text-red-600" : "text-zinc-900"}`}>
            {fmt(totRec - totPay)}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Огноо</th>
              <th className="px-3 py-2 text-left">Гүйлгээний утга</th>
              <th className="px-3 py-2 text-right">Авлага +/−</th>
              <th className="px-3 py-2 text-right">Өглөг +/−</th>
              <th className="px-3 py-2 text-right">Цэвэр үлдэгдэл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-zinc-50">
                <td className="whitespace-nowrap px-3 py-1.5 text-zinc-600">
                  {String(r.txn_date).slice(0, 10)}
                </td>
                <td className="max-w-md px-3 py-1.5 text-zinc-700">
                  <span title={r.description ?? ""}>{r.description}</span>
                </td>
                <td className={`px-3 py-1.5 text-right tabular-nums ${r.recEff < 0 ? "text-red-500" : "text-emerald-700"}`}>
                  {r.recEff ? fmt(r.recEff) : ""}
                </td>
                <td className={`px-3 py-1.5 text-right tabular-nums ${r.payEff < 0 ? "text-red-500" : "text-amber-700"}`}>
                  {r.payEff ? fmt(r.payEff) : ""}
                </td>
                <td className={`px-3 py-1.5 text-right tabular-nums font-medium ${r.net < 0 ? "text-red-600" : "text-zinc-900"}`}>
                  {fmt(r.net)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-zinc-400">
                  Энэ харилцагчийн авлага/өглөгийн гүйлгээ алга.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        {rows.length} гүйлгээ. Авлага: Дт 120101 = +, Кт = −. Өглөг: Кт 310101 = +, Дт = −.
      </p>
    </div>
  );
}
