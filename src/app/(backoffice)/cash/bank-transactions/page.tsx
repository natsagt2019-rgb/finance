import { createClient } from "@/lib/supabase/server";
import { loadRegistry, displayMap, currencyMap } from "@/lib/bank-registry";
import { PrintButton } from "@/components/print-button";

type SearchParams = { acc?: string; from?: string; to?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// MNT бол бүхэл, гадаад валют бол 2 орон (жишээ нь EUR 0.24 дугуйрахгүй).
function fmt(n: number, ccy = "MNT"): string {
  if (!n) return "—";
  const d = ccy === "MNT" ? 0 : 2;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
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
  account_no: string | null;
  exchange_rate: number | null;
  income: number | null;
  expense: number | null;
};

// Ханш форматлах (MNT данс 1 → зураас, гадаад валют → 2 орон).
function fmtRate(n: number | null): string {
  const r = Number(n) || 0;
  if (!r || r === 1) return "—";
  return r.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

// MNT дүйцэл (валютын данс дээр давхар харуулна — санхүүгийн тайлан MNT-ээр).
function fmtMnt(n: number): string {
  if (!n) return "—";
  return `${Math.round(n).toLocaleString("en-US")}₮`;
}

export default async function BankTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  // Бүртгэлтэй банкны дансууд (Тохиргоо → Банкны данс).
  const registry = await loadRegistry(supabase);
  const display = displayMap(registry);
  const ccyByAcc = currencyMap(registry);
  const accounts = registry.map((a) => a.accountNo);
  const acc = sp.acc && accounts.includes(sp.acc) ? sp.acc : accounts[0] ?? "";

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });
  const year = today.slice(0, 4);
  const from = sp.from && ISO.test(sp.from) ? sp.from : `${year}-01-01`;
  const to = sp.to && ISO.test(sp.to) ? sp.to : today;
  const fromYear = from.slice(0, 4);
  const ccy = ccyByAcc[acc] ?? "MNT";

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
      .select("id, txn_date, description, counterparty, account_no, exchange_rate, income, expense")
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
  const rows: {
    t: Txn;
    inc: number;
    exp: number;
    balance: number;
    rate: number;
    balanceMnt: number;
  }[] = [];
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
  // MNT дүйцэл (валютын данс) — гүйлгээ бүрийг өөрийн ханшаар.
  const isForeign = ccy !== "MNT";
  let totalInMnt = 0;
  let totalOutMnt = 0;
  for (const t of allTxns) {
    const d = ubDate(t.txn_date);
    if (d < from || d > to) continue;
    const inc = Number(t.income) || 0;
    const exp = Number(t.expense) || 0;
    const rate = isForeign ? Number(t.exchange_rate) || 0 : 1;
    balance += inc - exp;
    totalIn += inc;
    totalOut += exp;
    totalInMnt += inc * rate;
    totalOutMnt += exp * rate;
    rows.push({ t, inc, exp, balance, rate, balanceMnt: balance * rate });
  }
  const closing = opening + totalIn - totalOut;
  // Эхэн/эцсийн MNT — хамгийн ойрын гүйлгээний ханшаар (валютын данс).
  const firstRate = rows[0]?.rate ?? 0;
  const lastRate = rows[rows.length - 1]?.rate ?? 0;
  const openingMnt = isForeign ? opening * firstRate : opening;
  const closingMnt = isForeign ? closing * lastRate : closing;

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
              <span className="font-medium text-zinc-700">{fmt(opening, ccy)}</span>
              {isForeign && (
                <span className="text-zinc-400"> ({fmtMnt(openingMnt)})</span>
              )}
              {"  ·  "}
              Эцсийн үлдэгдэл:{" "}
              <span className="font-medium text-zinc-700">{fmt(closing, ccy)}</span>
              {isForeign && (
                <span className="text-zinc-400"> ({fmtMnt(closingMnt)})</span>
              )}
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
                    Ханш
                  </th>
                  <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-left">
                    Харьцсан данс / IBAN
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
                  <td colSpan={8} className="border border-zinc-200 px-3 py-2 text-right">
                    Эхний үлдэгдэл :
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums">
                    {fmt(opening, ccy)}
                    {isForeign && (
                      <div className="text-[10px] font-normal text-zinc-400">
                        {fmtMnt(openingMnt)}
                      </div>
                    )}
                  </td>
                </tr>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="border border-zinc-200 px-3 py-10 text-center text-sm text-zinc-500">
                      Энэ хугацаанд гүйлгээ алга.
                    </td>
                  </tr>
                ) : (
                  rows.map(({ t, inc, exp, balance, rate, balanceMnt }, i) => (
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
                      <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-zinc-500">
                        {fmtRate(t.exchange_rate)}
                      </td>
                      <td className="whitespace-nowrap border border-zinc-200 px-3 py-1.5 text-zinc-500">
                        {t.account_no || "—"}
                      </td>
                      <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-green-700">
                        {inc ? fmt(inc, ccy) : "—"}
                        {isForeign && inc ? (
                          <div className="text-[10px] text-zinc-400">
                            {fmtMnt(inc * rate)}
                          </div>
                        ) : null}
                      </td>
                      <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-red-600">
                        {exp ? fmt(exp, ccy) : "—"}
                        {isForeign && exp ? (
                          <div className="text-[10px] text-zinc-400">
                            {fmtMnt(exp * rate)}
                          </div>
                        ) : null}
                      </td>
                      <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums font-medium text-zinc-900">
                        {fmt(balance, ccy)}
                        {isForeign && (
                          <div className="text-[10px] font-normal text-zinc-400">
                            {fmtMnt(balanceMnt)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-zinc-50 font-semibold text-zinc-900">
                  <td colSpan={6} className="border border-zinc-200 px-3 py-2">
                    Дансны дүн
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums text-green-700">
                    {fmt(totalIn, ccy)}
                    {isForeign && totalIn ? (
                      <div className="text-[10px] font-normal text-zinc-400">
                        {fmtMnt(totalInMnt)}
                      </div>
                    ) : null}
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums text-red-600">
                    {fmt(totalOut, ccy)}
                    {isForeign && totalOut ? (
                      <div className="text-[10px] font-normal text-zinc-400">
                        {fmtMnt(totalOutMnt)}
                      </div>
                    ) : null}
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums">
                    {fmt(closing, ccy)}
                    {isForeign && (
                      <div className="text-[10px] font-normal text-zinc-400">
                        {fmtMnt(closingMnt)}
                      </div>
                    )}
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
