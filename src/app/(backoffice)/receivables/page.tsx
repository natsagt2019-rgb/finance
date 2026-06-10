import { createClient } from "@/lib/supabase/server";
import {
  AGING_BUCKETS,
  AGING_LABEL,
  isReceivableAccount,
  normalizePartner,
  settleFifo,
  summarizeReceivables,
  type DatedAmount,
  type ReceivableItem,
} from "@/lib/receivables-calc";

const ENTRY_LIMIT = 100000;
const INVOICE_LIMIT = 5000;
const NO_PARTNER = "Тодорхойгүй (партнергүй)";

function fmt(n: number): string {
  return n ? Math.round(n).toLocaleString("en-US") : "—";
}

type AccRow = {
  code: string;
  name: string;
  type: string | null;
  fs_line: string | null;
};

type EntryRow = {
  txn_date: string;
  partner_name: string | null;
  amount: number;
};

type InvRow = {
  partner_name: string | null;
  inv_date: string;
  due_date: string | null;
  amount: number;
  paid_amount: number;
};

export default async function ReceivablesPage() {
  const supabase = await createClient();

  // Өнөөдөр (МУ цагийн бүс) — насжилт ба as-of огноо.
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });

  // 1) Авлагын дансны кодууд (актив + нэр/fs_line-д "авлага").
  const { data: accData } = await supabase
    .from("accounts")
    .select("code, name, type, fs_line")
    .eq("is_active", true)
    .limit(5000);
  const recvCodes = ((accData as AccRow[] | null) ?? [])
    .filter((a) => isReceivableAccount(a.name, a.type, a.fs_line))
    .map((a) => a.code);

  // 2) Ерөнхий журналаас (journal_entries) авлагын дансны Дт ба Кт.
  //    Дт → авлага үүснэ (огноотой), Кт → төлөгдөнө (нийт дүн, FIFO хаалт).
  const jDebits = new Map<string, DatedAmount[]>(); // key = нормчилсон нэр
  const jCredit = new Map<string, number>();
  const displayName = new Map<string, string>(); // key → дэлгэцийн нэр

  if (recvCodes.length > 0) {
    const [{ data: dr }, { data: cr }] = await Promise.all([
      supabase
        .from("journal_entries")
        .select("txn_date, partner_name, amount")
        .in("debit_code", recvCodes)
        .lte("txn_date", today)
        .limit(ENTRY_LIMIT),
      supabase
        .from("journal_entries")
        .select("partner_name, amount")
        .in("credit_code", recvCodes)
        .lte("txn_date", today)
        .limit(ENTRY_LIMIT),
    ]);

    for (const e of (dr as EntryRow[] | null) ?? []) {
      const key = normalizePartner(e.partner_name);
      if (key && !displayName.has(key)) displayName.set(key, e.partner_name!.trim());
      const arr = jDebits.get(key) ?? [];
      arr.push({ date: e.txn_date, amount: Number(e.amount) || 0 });
      jDebits.set(key, arr);
    }
    for (const e of (cr as { partner_name: string | null; amount: number }[] | null) ?? []) {
      const key = normalizePartner(e.partner_name);
      jCredit.set(key, (jCredit.get(key) ?? 0) + (Number(e.amount) || 0));
    }
  }

  const items: ReceivableItem[] = [];

  // 3) Нээлттэй нэхэмжлэх (эхэлж — дэлгэцийн нэрний цэвэр бичлэг давамгайлахаар).
  const { data: invData } = await supabase
    .from("invoices")
    .select("partner_name, inv_date, due_date, amount, paid_amount")
    .eq("is_active", true)
    .neq("status", "paid")
    .limit(INVOICE_LIMIT);

  for (const r of (invData as InvRow[] | null) ?? []) {
    const remaining = (Number(r.amount) || 0) - (Number(r.paid_amount) || 0);
    if (remaining <= 0.005) continue;
    const key = normalizePartner(r.partner_name);
    if (key && !displayName.has(key) && r.partner_name)
      displayName.set(key, r.partner_name.trim());
    items.push({
      partnerKey: key,
      partnerName: key ? displayName.get(key) ?? r.partner_name ?? NO_PARTNER : NO_PARTNER,
      amount: remaining,
      date: r.due_date || r.inv_date,
      source: "invoice",
    });
  }

  // 4) Журналын авлага — харилцагч бүрээр FIFO хаалт хийж нээлттэй хэсгүүд.
  for (const [key, debits] of jDebits) {
    const open = settleFifo(debits, jCredit.get(key) ?? 0);
    const name = key ? displayName.get(key) ?? key : NO_PARTNER;
    for (const chunk of open) {
      items.push({
        partnerKey: key,
        partnerName: name,
        amount: chunk.amount,
        date: chunk.date,
        source: "journal",
      });
    }
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
            Ерөнхий журналын авлагын данс (FIFO хаалт) болон нээлттэй
            нэхэмжлэхээс харилцагч бүрийн авлагыг насжилтаар нэгтгэв.
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
            Авлага олдсонгүй. Авлагын дансны журнал эсвэл нээлттэй нэхэмжлэх
            байхгүй байна.
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
                  <tr key={p.partnerKey || "none"} className="hover:bg-zinc-50">
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
        Насжилт нь гүйлгээний огноо (нэхэмжлэхэд төлөх хугацаа эсвэл огноо)-оос
        өнөөдрийг ({today}) хүртэлх хоногоор тооцов. Журналын авлага нь дансны
        Дт−Кт цэвэр үлдэгдэл (төлбөрийг хуучин авлагаас FIFO-гоор хаасан).
        Журнал ба нэхэмжлэх тусдаа эх сурвалж тул нэг авлагыг хоёр газар бүртгэвэл
        давхар тоологдоно.
      </p>
    </div>
  );
}
