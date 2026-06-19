import { createClient } from "@/lib/supabase/server";
import { loadRegistry, displayMap, currencyMap } from "@/lib/bank-registry";
import { PrintButton } from "@/components/print-button";
import { BankJournalTable } from "./bank-journal-table";

type SearchParams = { acc?: string; from?: string; to?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function fmt(n: number, ccy = "MNT"): string {
  if (!n) return "—";
  const d = ccy === "MNT" ? 0 : 2;
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function ubDate(ts: string): string {
  return new Date(ts).toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });
}

type Txn = {
  id: number;
  txn_date: string;
  description: string | null;
  counterparty: string | null;
  income: number | null;
  expense: number | null;
  exchange_rate: number | null;
  debit_code: string | null;
  credit_code: string | null;
};

type Group = {
  code: string;
  name: string;
  rows: { t: Txn; inc: number; exp: number }[];
  totalIn: number;
  totalOut: number;
};

export default async function BankJournalPage({
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

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });
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

  // Гүйлгээ татах (PostgREST 1000 хязгаар тул хуудаслана).
  const PAGE = 1000;
  const allTxns: Txn[] = [];
  let error: { message: string } | null = null;
  for (let offset = 0; offset < 100000; offset += PAGE) {
    const { data, error: e } = await supabase
      .from("transactions")
      .select("id, txn_date, description, counterparty, income, expense, exchange_rate, debit_code, credit_code")
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

  // Мужийн өмнөх → эхний үлдэгдэлд; мужийн дотор → бүлэглэнэ.
  let preMovement = 0;
  const inRange: Txn[] = [];
  for (const t of allTxns) {
    const d = ubDate(t.txn_date);
    if (d > to) continue;
    if (d < from) preMovement += (Number(t.income) || 0) - (Number(t.expense) || 0);
    else inRange.push(t);
  }
  const opening = yearOpening + preMovement;

  // Харьцсан дансны нэр.
  const offsetCodes = new Set<string>();
  for (const t of inRange) {
    const off = (Number(t.income) || 0) ? t.credit_code : t.debit_code;
    if (off) offsetCodes.add(off);
  }
  const { data: accRows } = await supabase
    .from("accounts")
    .select("code, name")
    .in("code", [...offsetCodes].length ? [...offsetCodes] : ["__none__"])
    .limit(5000);
  const nameByCode = new Map(
    ((accRows as { code: string; name: string }[] | null) ?? []).map((a) => [a.code, a.name]),
  );

  // Бүх идэвхтэй данс (харьцсан данс засах datalist-д).
  const { data: allAccData } = await supabase
    .from("accounts")
    .select("code, name")
    .eq("is_active", true)
    .order("code")
    .limit(5000);
  const allAccounts = (allAccData as { code: string; name: string }[] | null) ?? [];

  // Харьцсан дансаар бүлэглэх.
  const groupMap = new Map<string, Group>();
  let totalIn = 0;
  let totalOut = 0;
  for (const t of inRange) {
    const inc = Number(t.income) || 0;
    const exp = Number(t.expense) || 0;
    const off = (inc ? t.credit_code : t.debit_code) || "(тодорхойгүй)";
    let g = groupMap.get(off);
    if (!g) {
      g = { code: off, name: nameByCode.get(off) ?? "", rows: [], totalIn: 0, totalOut: 0 };
      groupMap.set(off, g);
    }
    g.rows.push({ t, inc, exp });
    g.totalIn += inc;
    g.totalOut += exp;
    totalIn += inc;
    totalOut += exp;
  }
  const groups = [...groupMap.values()].sort((a, b) => a.code.localeCompare(b.code));
  const closing = opening + totalIn - totalOut;

  const qs = (over: Partial<SearchParams>) => {
    const p = new URLSearchParams();
    p.set("acc", over.acc ?? acc);
    p.set("from", over.from ?? from);
    p.set("to", over.to ?? to);
    return `/cash/bank-journal?${p.toString()}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Мөнгөн хөрөнгийн журнал
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            /Харьцсан дансаар бүлэглэсэн/ · {display[acc]} · {from} → {to} · {ccy}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="acc" value={acc} />
            <input type="date" name="from" defaultValue={from} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            <input type="date" name="to" defaultValue={to} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
              Харах
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      <div className="no-print mt-4 flex flex-wrap gap-2">
        {accounts.map((a) => (
          <a
            key={a}
            href={qs({ acc: a })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              a === acc ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {display[a]}
          </a>
        ))}
      </div>

      <div className="mt-1 hidden text-center print:block">
        <h1 className="text-xl font-bold text-zinc-900">Мөнгөн хөрөнгийн журнал</h1>
        <p className="text-sm text-zinc-600">/Харьцсан дансаар бүлэглэсэн/ · {display[acc]} · {from} → {to}</p>
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
              Эхний үлдэгдэл: <span className="font-medium text-zinc-700">{fmt(opening, ccy)}</span>
              {"  ·  "}
              Эцсийн үлдэгдэл: <span className="font-medium text-zinc-700">{fmt(closing, ccy)}</span>
            </div>
          </div>

          <div className="px-2 py-2">
            <BankJournalTable
              groups={groups}
              ccy={ccy}
              totalIn={totalIn}
              totalOut={totalOut}
              accounts={allAccounts}
            />
          </div>
        </div>
      )}
    </div>
  );
}
