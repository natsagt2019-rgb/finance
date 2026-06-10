import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import {
  AGING_BUCKETS,
  AGING_LABEL,
  isReceivableAccount,
  settleFifo,
  summarizeReceivables,
  type DatedAmount,
  type ReceivableItem,
} from "@/lib/receivables-calc";

const LINE_LIMIT = 100000;
const INVOICE_LIMIT = 5000;
const NO_PARTNER = "Тодорхойгүй (партнергүй)";

function fmt(n: number): string {
  return n ? Math.round(n).toLocaleString("en-US") : "—";
}

type AccRow = { id: number; code: string; name: string; type: string | null };

type LineRow = {
  account_id: number;
  debit: number;
  credit: number;
  journals: { status: string; partner_id: number | null; date: string } | null;
};

type InvRow = {
  partner_id: number | null;
  partner_name: string | null;
  inv_date: string;
  due_date: string | null;
  amount: number;
  paid_amount: number;
};

export default async function ReceivablesPage() {
  const supabase = await createClient();

  // Өнөөдөр (МУ цагийн бүс) — насжилтын суурь огноо.
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });

  // 1) Авлагын данснууд (актив + нэрэндээ "авлага").
  const { data: accData } = await supabase
    .from("accounts")
    .select("id, code, name, type")
    .eq("is_active", true)
    .limit(5000);
  const recvAccounts = ((accData as AccRow[] | null) ?? []).filter((a) =>
    isReceivableAccount(a.name, a.type),
  );
  const recvAccountIds = recvAccounts.map((a) => a.id);

  // 2) Журналын мөрүүд — авлагын данс, батлагдсан журнал.
  // Харилцагч тус бүрээр дебет (авлага үүсэх) мөрүүд + нийт кредит (төлөлт).
  const jDebits = new Map<string, DatedAmount[]>(); // key = partnerId | "__none__"
  const jCredit = new Map<string, number>();
  const jPartnerId = new Map<string, number | null>();

  if (recvAccountIds.length > 0) {
    const { data: lineData } = await supabase
      .from("journal_lines")
      .select("account_id, debit, credit, journals!inner(status, partner_id, date)")
      .in("account_id", recvAccountIds)
      .eq("journals.status", "posted")
      .limit(LINE_LIMIT);

    for (const l of (lineData as LineRow[] | null) ?? []) {
      const j = l.journals;
      if (!j) continue;
      const pid = j.partner_id;
      const key = pid == null ? "__none__" : String(pid);
      jPartnerId.set(key, pid);
      const net = (Number(l.debit) || 0) - (Number(l.credit) || 0);
      if (net > 0) {
        const arr = jDebits.get(key) ?? [];
        arr.push({ date: j.date, amount: net });
        jDebits.set(key, arr);
      } else if (net < 0) {
        jCredit.set(key, (jCredit.get(key) ?? 0) + -net);
      }
    }
  }

  // 3) Журналаас гарсан партнеруудын нэр.
  const jPids = [...jPartnerId.values()].filter((x): x is number => x != null);
  const partnerName = new Map<number, string>();
  if (jPids.length > 0) {
    const { data: parts } = await supabase
      .from("partners")
      .select("id, name")
      .in("id", jPids);
    for (const p of (parts as { id: number; name: string }[] | null) ?? [])
      partnerName.set(p.id, p.name);
  }

  const items: ReceivableItem[] = [];
  for (const [key, debits] of jDebits) {
    const pid = jPartnerId.get(key) ?? null;
    const name = pid == null ? NO_PARTNER : partnerName.get(pid) ?? `#${pid}`;
    const open = settleFifo(debits, jCredit.get(key) ?? 0);
    for (const chunk of open) {
      items.push({
        partnerId: pid,
        partnerName: name,
        amount: chunk.amount,
        date: chunk.date,
        source: "journal",
      });
    }
  }

  // 4) Нээлттэй нэхэмжлэх (open/partial) — үлдэгдэл авлага.
  const { data: invData } = await supabase
    .from("invoices")
    .select("partner_id, partner_name, inv_date, due_date, amount, paid_amount")
    .eq("is_active", true)
    .neq("status", "paid")
    .limit(INVOICE_LIMIT);

  for (const r of (invData as InvRow[] | null) ?? []) {
    const remaining = (Number(r.amount) || 0) - (Number(r.paid_amount) || 0);
    if (remaining <= 0.005) continue;
    items.push({
      partnerId: r.partner_id,
      partnerName: r.partner_name || NO_PARTNER,
      amount: remaining,
      date: r.due_date || r.inv_date,
      source: "invoice",
    });
  }

  const sum = summarizeReceivables(items, today);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">
            📥 Авлагын насжилт
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Авлагын дансны журнал (FIFO хаалт) болон нээлттэй нэхэмжлэхээс
            харилцагч бүрийн авлагыг насжилтаар нэгтгэв.
          </p>
        </div>
      </div>

      {/* Нэгтгэлийн картууд */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Нийт авлага
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-blue-900">
            {fmt(sum.total)}₮
          </p>
          <p className="mt-1 text-xs text-blue-500">
            {sum.partnerCount} харилцагч
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Журналаас
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-800">
            {fmt(sum.fromJournal)}₮
          </p>
          <p className="mt-1 text-xs text-zinc-400">Дансны үлдэгдэл</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Нэхэмжлэхээс
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-800">
            {fmt(sum.fromInvoice)}₮
          </p>
          <p className="mt-1 text-xs text-zinc-400">Нээлттэй нэхэмжлэх</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-rose-600">
            90+ хоног хэтэрсэн
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-rose-900">
            {fmt(sum.buckets["90+"])}₮
          </p>
          <p className="mt-1 text-xs text-rose-500">
            {sum.total > 0
              ? `${((sum.buckets["90+"] / sum.total) * 100).toFixed(1)}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* Хүснэгт */}
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white">
        {sum.partners.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            Авлага олдсонгүй. Авлагын дансны батлагдсан журнал эсвэл нээлттэй
            нэхэмжлэх байхгүй байна.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Харилцагч</th>
                  {AGING_BUCKETS.map((b) => (
                    <th key={b} className="px-4 py-2 text-right">
                      {AGING_LABEL[b]}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-right">Нийт</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sum.partners.map((p) => (
                  <tr
                    key={p.partnerId ?? "none"}
                    className="hover:bg-zinc-50"
                  >
                    <td className="px-4 py-2 text-zinc-800">
                      {p.partnerName}
                      {p.fromInvoice > 0 && p.fromJournal > 0 && (
                        <span className="ml-2 text-xs text-zinc-400">
                          (журнал {fmt(p.fromJournal)} + нэхэмжлэх{" "}
                          {fmt(p.fromInvoice)})
                        </span>
                      )}
                    </td>
                    {AGING_BUCKETS.map((b) => (
                      <td
                        key={b}
                        className={`whitespace-nowrap px-4 py-2 text-right tabular-nums ${
                          b === "90+"
                            ? "font-medium text-rose-700"
                            : "text-zinc-600"
                        }`}
                      >
                        {fmt(p.buckets[b])}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums text-zinc-900">
                      {fmt(p.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm font-semibold">
                <tr>
                  <td className="px-4 py-2 text-zinc-500">
                    Нийт {sum.partnerCount} харилцагч
                  </td>
                  {AGING_BUCKETS.map((b) => (
                    <td
                      key={b}
                      className={`whitespace-nowrap px-4 py-2 text-right tabular-nums ${
                        b === "90+" ? "text-rose-700" : "text-zinc-800"
                      }`}
                    >
                      {fmt(sum.buckets[b])}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-zinc-900">
                    {fmt(sum.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-zinc-400">
        Насжилт нь журналын огноо (нэхэмжлэхэд төлөх хугацаа эсвэл огноо)-оос
        өнөөдрийг ({today}) хүртэлх хоногоор тооцов. Журнал ба нэхэмжлэх
        тусдаа эх сурвалж тул нэг авлагыг хоёр газар бүртгэвэл давхар тоологдоно.
      </p>
    </div>
  );
}
