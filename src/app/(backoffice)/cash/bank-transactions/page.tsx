import { createClient } from "@/lib/supabase/server";
import { BANK_DISPLAY } from "@/lib/bank-importer";
import { PrintButton } from "@/components/print-button";

type SearchParams = { acc?: string; from?: string; to?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Харилцах дансны дараалал (өгөгдөлтэй болон төлөвлөгөөнд буй).
const ACCOUNT_ORDER = ["TT", "GM", "MB", "TR", "TTU", "TTE"];
const ACCOUNT_CCY: Record<string, string> = {
  TTU: "USD",
  TTE: "EUR",
};

function fmt(n: number): string {
  if (!n) return "—";
  return Math.round(n).toLocaleString("en-US");
}

// timestamptz → Улаанбаатарын YYYY-MM-DD.
function ubDate(ts: string): string {
  return new Date(ts).toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });
}

type Txn = {
  id: number;
  txn_date: string;
  description: string | null;
  counterparty: string | null;
  income: number | null;
  expense: number | null;
};

export default async function BankTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const display = BANK_DISPLAY as Record<string, string>;
  const accounts = ACCOUNT_ORDER.filter((a) => display[a]);
  const acc = sp.acc && accounts.includes(sp.acc) ? sp.acc : accounts[0] ?? "TT";

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });
  const year = today.slice(0, 4);
  const from = sp.from && ISO.test(sp.from) ? sp.from : `${year}-01-01`;
  const to = sp.to && ISO.test(sp.to) ? sp.to : today;
  const fromYear = from.slice(0, 4);
  const ccy = ACCOUNT_CCY[acc] ?? "MNT";

  // Жилийн эхний үлдэгдэл.
  const { data: balRow } = await supabase
    .from("account_balances")
    .select("opening_balance")
    .eq("account_id", acc)
    .eq("year", Number(fromYear))
    .maybeSingle();

  const yearOpening = Number(
    (balRow as { opening_balance: number } | null)?.opening_balance ?? 0,
  );

  // Тухайн оны эхнээс to хүртэлх бүх гүйлгээ. PostgREST мөрийн дээд хязгаар
  // (~1000) тул хуудаслаж бүгдийг татна (нэг банкны жилийн дүн → хэдэн мянга).
  const PAGE = 1000;
  const allTxns: Txn[] = [];
  let error: { message: string } | null = null;
  for (let offset = 0; offset < 100000; offset += PAGE) {
    const { data, error: e } = await supabase
      .from("transactions")
      .select("id, txn_date, description, counterparty, income, expense")
      .eq("account_id", acc)
      .gte("txn_date", `${fromYear}-01-01T00:00:00+08:00`)
      .lte("txn_date", `${to}T23:59:59.999+08:00`)
      .order("txn_date", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (e) {
      error = e;
      break;
    }
    const page = (data as Txn[] | null) ?? [];
    allTxns.push(...page);
    if (page.length < PAGE) break;
  }
  // Мужийн өмнөх (эхний үлдэгдэлд нэмэх) ба мужийн доторх гэж хуваана.
  let preMovement = 0;
  const rows: { t: Txn; inc: number; exp: number; balance: number }[] = [];
  let balance = 0;
  for (const t of allTxns) {
    const d = ubDate(t.txn_date);
    if (d > to) continue;
    const inc = Number(t.income) || 0;
    const exp = Number(t.expense) || 0;
    if (d < from) {
      preMovement += inc - exp;
    }
  }
  const opening = yearOpening + preMovement;
  balance = opening;
  let totalIn = 0;
  let totalOut = 0;
  for (const t of allTxns) {
    const d = ubDate(t.txn_date);
    if (d < from || d > to) continue;
    const inc = Number(t.income) || 0;
    const exp = Number(t.expense) || 0;
    balance += inc - exp;
    totalIn += inc;
    totalOut += exp;
    rows.push({ t, inc, exp, balance });
  }
  const closing = opening + totalIn - totalOut;

  const qs = (over: Partial<SearchParams>) => {
    const p = new URLSearchParams();
    p.set("acc", over.acc ?? acc);
    p.set("from", over.from ?? from);
    p.set("to", over.to ?? to);
    return `/cash/bank-transactions?${p.toString()}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Харилцахын гүйлгээний тайлан
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {display[acc]} · {from} → {to} · {ccy}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="acc" value={acc} />
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

      {/* Данс сонгох */}
      <div className="no-print mt-4 flex flex-wrap gap-2">
        {accounts.map((a) => (
          <a
            key={a}
            href={qs({ acc: a })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              a === acc
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {display[a]}
          </a>
        ))}
      </div>

      <div className="mt-1 hidden text-center print:block">
        <h1 className="text-xl font-bold text-zinc-900">Харилцахын гүйлгээний тайлан</h1>
        <p className="text-sm text-zinc-600">
          {display[acc]} · {from} → {to}
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Алдаа: {error.message}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white print:border-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
            <span className="font-semibold text-zinc-900">{display[acc]}</span>
            <div className="text-xs text-zinc-500">
              Эхний үлдэгдэл:{" "}
              <span className="font-medium text-zinc-700">{fmt(opening)}</span>
              {"  ·  "}
              Эцсийн үлдэгдэл:{" "}
              <span className="font-medium text-zinc-700">{fmt(closing)}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-100 text-xs font-medium text-zinc-600">
                <tr>
                  <th colSpan={2} className="border border-zinc-200 px-3 py-2 text-center">
                    Баримтын
                  </th>
                  <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-left">
                    Гүйлгээний утга
                  </th>
                  <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-left">
                    Харилцагч
                  </th>
                  <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-right">
                    Орлого
                  </th>
                  <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-right">
                    Зарлага
                  </th>
                  <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-right">
                    Үлдэгдэл
                  </th>
                </tr>
                <tr>
                  <th className="border border-zinc-200 px-3 py-1.5 text-right">№</th>
                  <th className="border border-zinc-200 px-3 py-1.5 text-left">Огноо</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-zinc-50/60 font-medium text-zinc-700">
                  <td colSpan={5} className="border border-zinc-200 px-3 py-2 text-right">
                    Эхний үлдэгдэл :
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums">
                    {fmt(opening)}
                  </td>
                </tr>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border border-zinc-200 px-3 py-10 text-center text-sm text-zinc-500">
                      Энэ хугацаанд гүйлгээ алга.
                    </td>
                  </tr>
                ) : (
                  rows.map(({ t, inc, exp, balance }, i) => (
                    <tr key={t.id} className="hover:bg-zinc-50">
                      <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-zinc-400">
                        {i + 1}
                      </td>
                      <td className="whitespace-nowrap border border-zinc-200 px-3 py-1.5 text-zinc-600">
                        {ubDate(t.txn_date)}
                      </td>
                      <td className="border border-zinc-200 px-3 py-1.5 text-zinc-700">
                        {t.description || "—"}
                      </td>
                      <td className="whitespace-nowrap border border-zinc-200 px-3 py-1.5 text-zinc-500">
                        {t.counterparty || "—"}
                      </td>
                      <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-green-700">
                        {inc ? fmt(inc) : "—"}
                      </td>
                      <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-red-600">
                        {exp ? fmt(exp) : "—"}
                      </td>
                      <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums font-medium text-zinc-900">
                        {fmt(balance)}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-zinc-50 font-semibold text-zinc-900">
                  <td colSpan={4} className="border border-zinc-200 px-3 py-2">
                    Дансны дүн
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums text-green-700">
                    {fmt(totalIn)}
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums text-red-600">
                    {fmt(totalOut)}
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums">
                    {fmt(closing)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
