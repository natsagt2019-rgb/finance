import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { ExcelExportButton } from "@/components/excel-export";
import { isPayableAccount, isReceivableAccount, normalizePartner } from "@/lib/receivables-calc";

// Харилцагчийн үлдэгдлийн тайлан (Smart Accounting загвар) — харилцагч бүрийг
// дансаар задалж, Өглөгийн үлдэгдэл ба Авлагын үлдэгдэл багана, харилцагчийн
// дүн + нийт дүн. Эх сурвалж: journal_entries (as-of d_to).

const ENTRY_LIMIT = 100000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const NO_PARTNER = "Тодорхойгүй";

function fmt(n: number): string {
  return Math.abs(n) < 0.5 ? "—" : Math.round(n).toLocaleString("en-US");
}

type AccRow = {
  code: string;
  name: string;
  type: string | null;
  fs_line: string | null;
  currency: string | null;
};
type EntryRow = {
  id: number;
  partner_name: string | null;
  amount: number;
  debit_code: string | null;
  credit_code: string | null;
};

type AcctBal = { code: string; name: string; currency: string; payable: number; receivable: number };
type PartnerGroup = {
  key: string;
  name: string;
  accounts: AcctBal[];
  payTotal: number;
  recvTotal: number;
};

export default async function PartnerBalanceDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; q?: string; account?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const to = sp.to && ISO.test(sp.to) ? sp.to : "2026-12-31";
  const q = (sp.q ?? "").trim();
  const acctFilter = (sp.account ?? "").trim();

  // 1) Авлага/өглөгийн данс.
  const { data: accData } = await supabase
    .from("accounts")
    .select("code, name, type, fs_line, currency")
    .eq("is_active", true)
    .limit(5000);
  const accs = (accData as AccRow[] | null) ?? [];
  const recvSet = new Set<string>();
  const paySet = new Set<string>();
  const accInfo = new Map<string, { name: string; currency: string }>();
  for (const a of accs) {
    if (isReceivableAccount(a.name, a.type, a.fs_line)) recvSet.add(a.code);
    else if (isPayableAccount(a.name, a.type, a.fs_line)) paySet.add(a.code);
    accInfo.set(a.code, { name: a.name, currency: a.currency || "MNT" });
  }
  const allCodes = [...recvSet, ...paySet];

  // 2) Журналаас (as-of to) тухайн данснуудыг хөндсөн бичилт.
  // partnerKey → accountCode → {pay, recv}
  const byPartner = new Map<string, Map<string, { pay: number; recv: number }>>();
  const displayName = new Map<string, string>();

  if (allCodes.length > 0) {
    const seen = new Set<number>();
    const [{ data: dRows }, { data: cRows }] = await Promise.all([
      supabase
        .from("journal_entries")
        .select("id, partner_name, amount, debit_code, credit_code")
        .in("debit_code", allCodes)
        .lte("txn_date", to)
        .limit(ENTRY_LIMIT),
      supabase
        .from("journal_entries")
        .select("id, partner_name, amount, debit_code, credit_code")
        .in("credit_code", allCodes)
        .lte("txn_date", to)
        .limit(ENTRY_LIMIT),
    ]);

    const apply = (e: EntryRow) => {
      if (seen.has(e.id)) return;
      seen.add(e.id);
      const key = normalizePartner(e.partner_name);
      if (key && !displayName.has(key) && e.partner_name)
        displayName.set(key, e.partner_name.trim());
      const amt = Number(e.amount) || 0;
      const dc = e.debit_code;
      const cc = e.credit_code;
      let m = byPartner.get(key);
      if (!m) {
        m = new Map();
        byPartner.set(key, m);
      }
      const bump = (code: string, pay: number, recv: number) => {
        const cur = m!.get(code) ?? { pay: 0, recv: 0 };
        cur.pay += pay;
        cur.recv += recv;
        m!.set(code, cur);
      };
      // Авлага: Дт +, Кт −. Өглөг: Кт +, Дт −.
      if (dc && recvSet.has(dc)) bump(dc, 0, amt);
      if (cc && recvSet.has(cc)) bump(cc, 0, -amt);
      if (cc && paySet.has(cc)) bump(cc, amt, 0);
      if (dc && paySet.has(dc)) bump(dc, -amt, 0);
    };
    for (const e of (dRows as EntryRow[] | null) ?? []) apply(e);
    for (const e of (cRows as EntryRow[] | null) ?? []) apply(e);
  }

  // 3) Бүлэг болгон цэгцэлнэ.
  const term = q.toLowerCase();
  const groups: PartnerGroup[] = [];
  for (const [key, accMap] of byPartner) {
    const name = key ? displayName.get(key) ?? key : NO_PARTNER;
    if (term && !name.toLowerCase().includes(term)) continue;
    const accounts: AcctBal[] = [];
    let payTotal = 0;
    let recvTotal = 0;
    for (const [code, bal] of accMap) {
      if (acctFilter && code !== acctFilter) continue;
      if (Math.abs(bal.pay) < 0.5 && Math.abs(bal.recv) < 0.5) continue;
      const info = accInfo.get(code);
      accounts.push({
        code,
        name: info?.name ?? code,
        currency: info?.currency ?? "MNT",
        payable: bal.pay,
        receivable: bal.recv,
      });
      payTotal += bal.pay;
      recvTotal += bal.recv;
    }
    if (accounts.length === 0) continue;
    accounts.sort((a, b) => a.code.localeCompare(b.code));
    groups.push({ key, name, accounts, payTotal, recvTotal });
  }
  // Их үлдэгдэлтэйг нь эхэнд.
  groups.sort(
    (a, b) =>
      Math.abs(b.payTotal) + Math.abs(b.recvTotal) - (Math.abs(a.payTotal) + Math.abs(a.recvTotal)),
  );

  const grandPay = groups.reduce((s, g) => s + g.payTotal, 0);
  const grandRecv = groups.reduce((s, g) => s + g.recvTotal, 0);

  // Excel aoa.
  const xn = (x: number) => (Math.abs(x) < 0.5 ? "" : Math.round(x));
  const excelAoa: (string | number)[][] = [
    [`Харилцагчийн үлдэгдлийн тайлан — ${to}`],
    ["Дансны код", "Дансны нэр", "Валют", "Өглөгийн үлдэгдэл", "Авлагын үлдэгдэл"],
  ];
  for (const g of groups) {
    excelAoa.push([g.name]);
    for (const a of g.accounts)
      excelAoa.push([a.code, a.name, a.currency, xn(a.payable), xn(a.receivable)]);
    excelAoa.push(["", "Харилцагчийн дүн:", "", xn(g.payTotal), xn(g.recvTotal)]);
  }
  excelAoa.push(["", `Нийт (${groups.length} харилцагч)`, "", xn(grandPay), xn(grandRecv)]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Харилцагчийн үлдэгдлийн тайлан
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Харилцагч бүрийн авлага/өглөг дансаар задалсан — {to} огнооны байдлаар.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Огноо хүртэл
              <input type="date" name="to" defaultValue={to} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Харилцагч
              <input type="text" name="q" defaultValue={q} placeholder="нэр…" className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Данс
              <input type="text" name="account" defaultValue={acctFilter} placeholder="код" className="w-24 rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            </label>
            <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
              Харах
            </button>
          </form>
          <ExcelExportButton aoa={excelAoa} filename={`Харилцагчийн-үлдэгдэл_${to}`} sheet="Харилцагч" />
          <PrintButton />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100 text-xs font-medium text-zinc-600">
            <tr>
              <th className="px-4 py-2 text-left">Дансны код</th>
              <th className="px-4 py-2 text-left">Дансны нэр</th>
              <th className="px-4 py-2 text-center">Валют</th>
              <th className="px-4 py-2 text-right">Өглөгийн үлдэгдэл</th>
              <th className="px-4 py-2 text-right">Авлагын үлдэгдэл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {groups.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-400">
                  Үлдэгдэл олдсонгүй.
                </td>
              </tr>
            ) : (
              groups.map((g) => (
                <PartnerBlock key={g.key || g.name} g={g} />
              ))
            )}
          </tbody>
          {groups.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-zinc-400 bg-zinc-100 font-bold text-zinc-900">
                <td className="px-4 py-2" colSpan={3}>
                  Нийт ({groups.length} харилцагч)
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-amber-700">{fmt(grandPay)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-blue-700">{fmt(grandRecv)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function PartnerBlock({ g }: { g: PartnerGroup }) {
  return (
    <>
      <tr className="bg-zinc-50">
        <td colSpan={5} className="px-4 py-1.5 text-sm font-semibold text-zinc-800">
          {g.name}
        </td>
      </tr>
      {g.accounts.map((a) => {
        const href = `/reports/partner-statement?partner=${encodeURIComponent(g.name)}&account=${a.code}`;
        return (
          <tr key={a.code} className="hover:bg-zinc-50">
            <td className="px-4 py-1.5 font-mono text-xs text-zinc-500">{a.code}</td>
            <td className="px-4 py-1.5 text-zinc-700">{a.name}</td>
            <td className="px-4 py-1.5 text-center text-xs text-zinc-400">{a.currency}</td>
            <td className="px-4 py-1.5 text-right tabular-nums text-amber-700">
              {Math.abs(a.payable) > 0.5 ? (
                <a href={href} className="hover:underline" title="Дансны хуулга харах">
                  {fmt(a.payable)}
                </a>
              ) : (
                fmt(a.payable)
              )}
            </td>
            <td className="px-4 py-1.5 text-right tabular-nums text-blue-700">
              {Math.abs(a.receivable) > 0.5 ? (
                <a href={href} className="hover:underline" title="Дансны хуулга харах">
                  {fmt(a.receivable)}
                </a>
              ) : (
                fmt(a.receivable)
              )}
            </td>
          </tr>
        );
      })}
      <tr className="border-t border-zinc-200 bg-white font-semibold">
        <td colSpan={3} className="px-4 py-1.5 text-right text-zinc-500">
          Харилцагчийн дүн:
        </td>
        <td className="px-4 py-1.5 text-right tabular-nums text-amber-800">{fmt(g.payTotal)}</td>
        <td className="px-4 py-1.5 text-right tabular-nums text-blue-800">{fmt(g.recvTotal)}</td>
      </tr>
    </>
  );
}
