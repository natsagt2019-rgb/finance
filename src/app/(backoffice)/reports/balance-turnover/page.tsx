import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { isPayableAccount, isReceivableAccount, normalizePartner } from "@/lib/receivables-calc";

// Авлага/Өглөгийн товчоо тайлан — харилцагч бүрээр тайлант үеийн эхний үлдэгдэл,
// дебет, кредит, эцсийн үлдэгдэл. kind=recv (авлага) | pay (өглөг).
// Эх сурвалж: journal_entries (авлага/өглөгийн данс).

const ENTRY_LIMIT = 100000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const NO_PARTNER = "Тодорхойгүй";

function f2(n: number): string {
  if (Math.abs(n) < 0.005) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type AccRow = { code: string; name: string; type: string | null; fs_line: string | null };
type Entry = { id: number; txn_date: string; amount: number; debit_code: string | null; credit_code: string | null; partner_name: string | null };
type Row = { key: string; code: string; name: string; opening: number; debit: number; credit: number; closing: number };

export default async function BalanceTurnoverPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; from?: string; to?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const isRecv = (sp.kind ?? "recv") !== "pay";
  const from = sp.from && ISO.test(sp.from) ? sp.from : "2026-01-01";
  const to = sp.to && ISO.test(sp.to) ? sp.to : "2026-12-31";
  const q = (sp.q ?? "").trim();
  const term = q.toLowerCase();

  const title = isRecv ? "Авлагын товчоо тайлан" : "Өглөгийн товчоо тайлан";
  const otherKind = isRecv ? "pay" : "recv";
  const otherLabel = isRecv ? "→ Өглөгийн товчоо" : "→ Авлагын товчоо";

  // Авлага/өглөгийн данс.
  const { data: accData } = await supabase
    .from("accounts")
    .select("code, name, type, fs_line")
    .eq("is_active", true)
    .limit(5000);
  const codeSet = new Set<string>();
  for (const a of (accData as AccRow[] | null) ?? []) {
    if (isRecv ? isReceivableAccount(a.name, a.type, a.fs_line) : isPayableAccount(a.name, a.type, a.fs_line))
      codeSet.add(a.code);
  }
  const codes = [...codeSet];

  // Харилцагчийн код (нэр → code).
  const { data: pData } = await supabase
    .from("partners")
    .select("name, code")
    .eq("is_active", true)
    .limit(5000);
  const codeByKey = new Map<string, string>();
  for (const p of (pData as { name: string; code: string | null }[] | null) ?? []) {
    const k = normalizePartner(p.name);
    if (k && p.code && !codeByKey.has(k)) codeByKey.set(k, p.code);
  }

  const rowsByKey = new Map<string, Row>();
  const displayName = new Map<string, string>();

  if (codes.length > 0) {
    const seen = new Set<number>();
    const all: Entry[] = [];
    const [{ data: dr }, { data: cr }] = await Promise.all([
      supabase.from("journal_entries").select("id, txn_date, amount, debit_code, credit_code, partner_name").in("debit_code", codes).lte("txn_date", to).limit(ENTRY_LIMIT),
      supabase.from("journal_entries").select("id, txn_date, amount, debit_code, credit_code, partner_name").in("credit_code", codes).lte("txn_date", to).limit(ENTRY_LIMIT),
    ]);
    for (const e of [...((dr as Entry[] | null) ?? []), ...((cr as Entry[] | null) ?? [])]) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      all.push(e);
    }

    for (const e of all) {
      const key = normalizePartner(e.partner_name);
      if (key && !displayName.has(key) && e.partner_name) displayName.set(key, e.partner_name.trim());
      const amt = Number(e.amount) || 0;
      const drAmt = e.debit_code && codeSet.has(e.debit_code) ? amt : 0;
      const crAmt = e.credit_code && codeSet.has(e.credit_code) ? amt : 0;
      if (drAmt === 0 && crAmt === 0) continue;
      let r = rowsByKey.get(key);
      if (!r) {
        r = { key, code: codeByKey.get(key) ?? "", name: key ? displayName.get(key) ?? key : NO_PARTNER, opening: 0, debit: 0, credit: 0, closing: 0 };
        rowsByKey.set(key, r);
      }
      const date = (e.txn_date || "").slice(0, 10);
      const normDelta = isRecv ? drAmt - crAmt : crAmt - drAmt;
      if (date < from) {
        r.opening += normDelta;
      } else {
        r.debit += drAmt;
        r.credit += crAmt;
      }
    }
  }

  let rows = [...rowsByKey.values()].map((r) => ({
    ...r,
    name: r.name || (displayName.get(r.key) ?? r.key) || NO_PARTNER,
    closing: r.opening + (isRecv ? r.debit - r.credit : r.credit - r.debit),
  }));
  // Бүх нь тэг мөрийг алгасна.
  rows = rows.filter((r) => Math.abs(r.opening) > 0.5 || r.debit > 0.5 || r.credit > 0.5 || Math.abs(r.closing) > 0.5);
  if (term) rows = rows.filter((r) => r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term));
  rows.sort((a, b) => Math.abs(b.closing) - Math.abs(a.closing));

  const tOpen = rows.reduce((s, r) => s + r.opening, 0);
  const tDebit = rows.reduce((s, r) => s + r.debit, 0);
  const tCredit = rows.reduce((s, r) => s + r.credit, 0);
  const tClose = rows.reduce((s, r) => s + r.closing, 0);

  const accent = isRecv ? "text-blue-700" : "text-amber-700";

  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams({ kind: isRecv ? "recv" : "pay", from, to, ...(q ? { q } : {}), ...over });
    return `/reports/balance-turnover?${p.toString()}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Харилцагч бүрээр тайлант үеийн хөдөлгөөн ба үлдэгдэл — {from} — {to}.{" "}
            <a href={qs({ kind: otherKind })} className="text-zinc-600 underline hover:text-zinc-900">
              {otherLabel}
            </a>
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="kind" value={isRecv ? "recv" : "pay"} />
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Харилцагч
              <input type="text" name="q" defaultValue={q} placeholder="нэр/код" className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Эхлэх
              <input type="date" name="from" defaultValue={from} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Дуусах
              <input type="date" name="to" defaultValue={to} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            </label>
            <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
              Харах
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      <div className="mt-4 text-center print:mt-0">
        <h2 className="text-lg font-bold text-zinc-900 print:block hidden">{title}</h2>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100 text-xs font-medium text-zinc-600">
            <tr>
              <th className="px-4 py-2 text-left">Харилцагчийн код</th>
              <th className="px-4 py-2 text-left">Харилцагчийн нэр</th>
              <th className="px-4 py-2 text-right">Эхний үлдэгдэл</th>
              <th className="px-4 py-2 text-right">Дебет</th>
              <th className="px-4 py-2 text-right">Кредит</th>
              <th className="px-4 py-2 text-right">Эцсийн үлдэгдэл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-400">Үлдэгдэл олдсонгүй.</td>
              </tr>
            ) : (
              rows.map((r) => {
                const href = `/reports/partner-statement?partner=${encodeURIComponent(r.name)}&from=${from}&to=${to}`;
                return (
                  <tr key={r.key || r.name} className="hover:bg-zinc-50">
                    <td className="px-4 py-1.5 font-mono text-xs text-zinc-500">{r.code || "—"}</td>
                    <td className="px-4 py-1.5 text-zinc-800">
                      <a href={href} className="hover:underline" title="Тооцооны хуулга харах">{r.name}</a>
                    </td>
                    <td className="px-4 py-1.5 text-right tabular-nums text-zinc-500">{f2(r.opening)}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums text-zinc-700">{f2(r.debit)}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums text-zinc-700">{f2(r.credit)}</td>
                    <td className={`px-4 py-1.5 text-right tabular-nums font-semibold ${accent}`}>{f2(r.closing)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-zinc-400 bg-zinc-100 font-bold text-zinc-900">
                <td colSpan={2} className="px-4 py-2">Нийт ({rows.length} харилцагч)</td>
                <td className="px-4 py-2 text-right tabular-nums">{f2(tOpen)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{f2(tDebit)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{f2(tCredit)}</td>
                <td className={`px-4 py-2 text-right tabular-nums ${accent}`}>{f2(tClose)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
