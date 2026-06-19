import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { BankTxnTable, VatPurchasePanel } from "./partner-client";

// Хуучин TumenAccounting3-ийн харилцагчийн дэлгэрэнгүй (partner_view) загвар:
// нэг харилцагчтай холбоотой eBarimt борлуулалт/худалдан авалт, банкны
// орлого/зарлага, нэхэмжлэл, орлого тулгалтыг нэг дор харуулна.

type SearchParams = { date_from?: string; date_to?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const NUM_LIMIT = 5000;

function fmt(n: number): string {
  return n ? Math.round(n).toLocaleString("en-US") : "0";
}
function d(s: string | null): string {
  return s ? s.slice(0, 10) : "—";
}

type Partner = {
  id: number;
  code: string | null;
  name: string;
  register: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  aliases: string[] | null;
};

type VatRow = {
  id: number;
  date: string;
  type: "out" | "in";
  ddtd: string | null;
  parent_ddtd: string | null;
  invoice_no: string | null;
  amount: number;
  vat_amount: number;
  total_amount: number;
  tax_type: string | null;
};

type TxnRow = {
  id: number;
  txn_date: string;
  description: string | null;
  bank: string | null;
  income: number | null;
  expense: number | null;
  exchange_rate: number | null;
  debit_code: string | null;
  credit_code: string | null;
};

type InvRow = {
  id: number;
  invoice_no: string | null;
  inv_date: string;
  due_date: string | null;
  description: string | null;
  amount: number;
  paid_amount: number;
  status: string;
};

export default async function PartnerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const pid = Number(id);
  const from = sp.date_from && ISO.test(sp.date_from) ? sp.date_from : "";
  const to = sp.date_to && ISO.test(sp.date_to) ? sp.date_to : "";

  // ── Харилцагч ──────────────────────────────────────────────────────────
  const { data: pData, error: pErr } = await supabase
    .from("partners")
    .select("id, code, name, register, phone, email, address, aliases")
    .eq("id", pid)
    .single();
  if (pErr || !pData) notFound();
  const partner = pData as Partner;
  const aliases = Array.isArray(partner.aliases) ? partner.aliases : [];

  // ── eBarimt (vat_records) — partner_id / register / нэрээр, давхардалгүй ──
  const vatById = new Map<number, VatRow>();
  const vatSel =
    "id, date, type, ddtd, parent_ddtd, invoice_no, amount, vat_amount, total_amount, tax_type";
  const vatQueries = [
    supabase.from("vat_records").select(vatSel).eq("partner_id", pid),
  ];
  if (partner.register)
    vatQueries.push(
      supabase.from("vat_records").select(vatSel).eq("partner_register", partner.register),
    );
  if (partner.name)
    vatQueries.push(
      supabase.from("vat_records").select(vatSel).ilike("partner_name", partner.name),
    );
  for (const q of vatQueries) {
    const { data } = await q.limit(NUM_LIMIT);
    for (const v of (data as VatRow[] | null) ?? []) {
      if (from && v.date < from) continue;
      if (to && v.date > to) continue;
      vatById.set(v.id, v);
    }
  }
  const vatAll = [...vatById.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  // Зөвхөн анхны борлуулалт (parent_ddtd хоосон) = бодит орлого.
  const vatOut = vatAll.filter((v) => v.type === "out" && !v.parent_ddtd);
  const vatOutClosing = vatAll.filter((v) => v.type === "out" && v.parent_ddtd);
  const vatIn = vatAll.filter((v) => v.type === "in");

  // ── Банкны гүйлгээ (transactions) ────────────────────────────────────────
  // Холбоос: master_code = partner.code (бүртгэгдсэн бол), мөн гүйлгээний утганд
  // бичигдсэн регистр (жишээ "рд:5540836") болон харилцагчийн нэр/alias-аар
  // (counterparty / master_name / description ilike). Олон query-г id-аар нэгтгэнэ.
  const txnSel =
    "id, txn_date, description, bank, income, expense, exchange_rate, debit_code, credit_code";
  const txnById = new Map<number, TxnRow>();
  const runTxn = async (col: string, value: string, exact: boolean) => {
    let tq = supabase.from("transactions").select(txnSel);
    tq = exact ? tq.eq(col, value) : tq.ilike(col, `%${value}%`);
    if (from) tq = tq.gte("txn_date", from);
    if (to) tq = tq.lte("txn_date", `${to}T23:59:59+08:00`);
    const { data } = await tq.limit(NUM_LIMIT);
    for (const t of (data as TxnRow[] | null) ?? []) txnById.set(t.id, t);
  };
  if (partner.code) await runTxn("master_code", partner.code, true);
  if (partner.register) {
    await runTxn("description", partner.register, false);
    await runTxn("counterparty", partner.register, false);
  }
  for (const nm of [partner.name, ...aliases].filter(Boolean)) {
    await runTxn("counterparty", nm, false);
    await runTxn("master_name", nm, false);
  }
  const txns = [...txnById.values()].sort((a, b) =>
    a.txn_date < b.txn_date ? 1 : -1,
  );
  const bankIncome = txns.filter((t) => Number(t.income) > 0);
  const bankExpense = txns.filter((t) => Number(t.expense) > 0);

  // ── Нэхэмжлэл (invoices) — partner_id ────────────────────────────────────
  let invQuery = supabase
    .from("invoices")
    .select("id, invoice_no, inv_date, due_date, description, amount, paid_amount, status")
    .eq("partner_id", pid)
    .eq("is_active", true);
  if (from) invQuery = invQuery.gte("inv_date", from);
  if (to) invQuery = invQuery.lte("inv_date", to);
  const { data: invData } = await invQuery
    .order("inv_date", { ascending: false })
    .limit(NUM_LIMIT);
  const invoices = (invData as InvRow[] | null) ?? [];

  // Бүх идэвхтэй данс (засварын datalist + зарлагын Дт нэр).
  const { data: accListData } = await supabase
    .from("accounts")
    .select("code, name")
    .eq("is_active", true)
    .order("code")
    .limit(5000);
  const accountsList = (accListData as { code: string; name: string }[] | null) ?? [];

  // ── Нийт дүнгүүд ─────────────────────────────────────────────────────────
  // Гадаад валютыг төгрөгт хөрвүүлж нэгтгэнэ (eBarimt-тай тулгалт MNT-ээр).
  const rateOf = (t: TxnRow) => Number(t.exchange_rate) || 1;
  const totalBankIncome = bankIncome.reduce((s, t) => s + (Number(t.income) || 0) * rateOf(t), 0);
  const totalBankExpense = bankExpense.reduce((s, t) => s + (Number(t.expense) || 0) * rateOf(t), 0);
  const totalVatOut = vatOut.reduce((s, v) => s + (Number(v.total_amount) || 0), 0);
  const totalVatIn = vatIn.reduce((s, v) => s + (Number(v.total_amount) || 0), 0);
  const totalInv = invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalInvPaid = invoices.reduce((s, i) => s + (Number(i.paid_amount) || 0), 0);

  // Орлого тулгалт: банкны орлого − eBarimt борлуулалт.
  const diff = totalBankIncome - totalVatOut;
  const balanced = Math.abs(diff) < 1;

  return (
    <div>
      <Link href="/partners" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Харилцагчид
      </Link>

      {/* Толгой — мэдээлэл + огноо шүүлт */}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{partner.name}</h1>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600">
            <span>
              <span className="text-zinc-400">Регистр:</span>{" "}
              {partner.register || "—"}
            </span>
            <span>
              <span className="text-zinc-400">Утас:</span> {partner.phone || "—"}
            </span>
            <span>
              <span className="text-zinc-400">И-мэйл:</span>{" "}
              {partner.email || "—"}
            </span>
          </div>
          {aliases.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <span className="text-xs text-zinc-400">Бусад нэр:</span>
              {aliases.map((a, i) => (
                <span
                  key={i}
                  className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/partners/${pid}/reconcile-act${
                from || to
                  ? `?${new URLSearchParams({
                      ...(from ? { date_from: from } : {}),
                      ...(to ? { date_to: to } : {}),
                    }).toString()}`
                  : ""
              }`}
              className="rounded-lg border border-green-300 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50"
            >
              📄 Тооцоо нийлсэн акт
            </Link>
            <Link
              href={`/partners/${pid}/edit`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              ✎ Засах
            </Link>
          </div>
          <form method="get" className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Эхлэх
            <input
              type="date"
              name="date_from"
              defaultValue={from}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Дуусах
            <input
              type="date"
              name="date_to"
              defaultValue={to}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Харуулах
          </button>
          {(from || to) && (
            <Link
              href={`/partners/${pid}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Цэвэрлэх
            </Link>
          )}
          </form>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-blue-600">Банкны орлого</div>
          <div className="mt-1 text-lg font-bold tabular-nums text-blue-900">{fmt(totalBankIncome)}₮</div>
          <div className="text-xs text-blue-500">{bankIncome.length} гүйлгээ</div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-amber-600">Банкны зарлага</div>
          <div className="mt-1 text-lg font-bold tabular-nums text-amber-900">{fmt(totalBankExpense)}₮</div>
          <div className="text-xs text-amber-500">{bankExpense.length} гүйлгээ</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-emerald-600">eBarimt борлуулалт</div>
          <div className="mt-1 text-lg font-bold tabular-nums text-emerald-900">{fmt(totalVatOut)}₮</div>
          <div className="text-xs text-emerald-500">
            {vatOut.length} баримт
            {vatOutClosing.length > 0 ? ` · ${vatOutClosing.length} хаалт` : ""}
          </div>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-violet-600">eBarimt худ.авалт</div>
          <div className="mt-1 text-lg font-bold tabular-nums text-violet-900">{fmt(totalVatIn)}₮</div>
          <div className="text-xs text-violet-500">{vatIn.length} баримт</div>
        </div>
        <div
          className={`rounded-2xl border p-4 ${
            balanced ? "border-emerald-100 bg-emerald-50" : "border-rose-100 bg-rose-50"
          }`}
        >
          <div className={`text-xs font-medium uppercase tracking-wide ${balanced ? "text-emerald-600" : "text-rose-600"}`}>
            Орлого тулгалт
          </div>
          <div className={`mt-1 text-lg font-bold tabular-nums ${balanced ? "text-emerald-900" : "text-rose-900"}`}>
            {fmt(Math.abs(diff))}₮
          </div>
          <div className={`text-xs ${balanced ? "text-emerald-500" : "text-rose-500"}`}>
            {balanced ? "Тэнцэж байна ✓" : diff > 0 ? "Банк илүү" : "Баримт илүү"}
          </div>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-sky-600">Нэхэмжлэл</div>
          <div className="mt-1 text-lg font-bold tabular-nums text-sky-900">{fmt(totalInv)}₮</div>
          <div className="text-xs text-sky-500">
            {invoices.length} ш · цугл. {fmt(totalInvPaid)}₮
          </div>
        </div>
      </div>

      {/* Эхний хос: eBarimt борлуулалт ↔ Банкны орлого */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="eBarimt борлуулалт" subtitle="(анхны нэхэмжлэл)" tone="green" count={vatOut.length}>
          <VatTable rows={vatOut} totalLabel={fmt(totalVatOut)} accent="text-green-700" />
          {vatOutClosing.length > 0 && (
            <div className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-400">
              + {vatOutClosing.length} хаалтын баримт (
              {fmt(vatOutClosing.reduce((s, v) => s + (Number(v.total_amount) || 0), 0))}₮) —
              орлого биш, тоологдоогүй
            </div>
          )}
        </Panel>

        <Panel title="Банкны орлого" tone="blue" count={bankIncome.length}>
          <BankTxnTable
            partnerId={pid}
            kind="income"
            rows={bankIncome}
            accounts={accountsList}
          />
        </Panel>
      </div>

      {/* Орлого тулгалт */}
      {(totalBankIncome > 0 || totalVatOut > 0) && (
        <div
          className={`mt-3 flex flex-wrap items-center gap-3 rounded-xl px-4 py-2 text-sm ${
            balanced ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"
          }`}
        >
          <strong>Орлогын тулгалт:</strong>
          <span>Банк <strong>{fmt(totalBankIncome)}₮</strong></span>
          <span className="text-zinc-400">−</span>
          <span>eBarimt <strong>{fmt(totalVatOut)}₮</strong></span>
          <span className="text-zinc-400">=</span>
          <strong className={balanced ? "text-green-700" : "text-rose-700"}>
            {balanced
              ? "Тэнцэж байна ✓"
              : `Зөрүү ${fmt(Math.abs(diff))}₮ (${diff > 0 ? "Банк илүү" : "Баримт илүү"})`}
          </strong>
        </div>
      )}

      {/* Хоёр дахь хос: eBarimt худалдан авалт ↔ Банкны зарлага */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="eBarimt худалдан авалт" subtitle="(ирсэн нэхэмжлэл)" tone="orange" count={vatIn.length}>
          <VatPurchasePanel partnerId={pid} rows={vatIn} accounts={accountsList} />
        </Panel>

        <Panel title="Банкны зарлага" tone="zinc" count={bankExpense.length}>
          <BankTxnTable
            partnerId={pid}
            kind="expense"
            rows={bankExpense}
            accounts={accountsList}
          />
        </Panel>
      </div>

      {/* Нэхэмжлэл */}
      <div className="mt-6">
        <Panel title="Нэхэмжлэл" tone="sky" count={invoices.length}>
          <table className="w-full text-sm">
            <thead className="bg-sky-50 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-3 py-2">Огноо</th>
                <th className="px-3 py-2">Нэхэмж №</th>
                <th className="px-3 py-2">Тайлбар</th>
                <th className="px-3 py-2 text-right">Дүн</th>
                <th className="px-3 py-2 text-right">Төлсөн</th>
                <th className="px-3 py-2 text-right">Үлдэгдэл</th>
                <th className="px-3 py-2">Төлөв</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {invoices.length === 0 ? (
                <EmptyRow cols={7} />
              ) : (
                invoices.map((i) => {
                  const rem = (Number(i.amount) || 0) - (Number(i.paid_amount) || 0);
                  return (
                    <tr key={i.id} className="hover:bg-zinc-50">
                      <td className="whitespace-nowrap px-3 py-1.5 text-zinc-500">{d(i.inv_date)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-zinc-700">
                        {i.invoice_no || `#${i.id}`}
                      </td>
                      <td className="max-w-[18rem] truncate px-3 py-1.5 text-zinc-500" title={i.description ?? ""}>
                        {i.description || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-zinc-800">
                        {fmt(Number(i.amount))}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-green-700">
                        {fmt(Number(i.paid_amount))}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums font-medium text-rose-700">
                        {fmt(rem)}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                          {i.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {invoices.length > 0 && (
              <tfoot className="border-t border-zinc-200 bg-sky-50 font-semibold">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right text-zinc-500">
                    Нийт {invoices.length}:
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{fmt(totalInv)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-green-700">{fmt(totalInvPaid)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                    {fmt(totalInv - totalInvPaid)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </Panel>
      </div>
    </div>
  );
}

// ── Туслах компонентууд ────────────────────────────────────────────────────

const TONE: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-800 border-emerald-100",
  blue: "bg-blue-50 text-blue-800 border-blue-100",
  orange: "bg-amber-50 text-amber-800 border-amber-100",
  zinc: "bg-zinc-50 text-zinc-700 border-zinc-200",
  sky: "bg-sky-50 text-sky-800 border-sky-100",
};

function Panel({
  title,
  subtitle,
  tone,
  count,
  children,
}: {
  title: string;
  subtitle?: string;
  tone: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className={`flex items-center justify-between border-b px-4 py-2.5 ${TONE[tone]}`}>
        <span className="text-sm font-semibold">
          {title}
          {subtitle && <span className="ml-1 text-xs font-normal opacity-70">{subtitle}</span>}
        </span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-zinc-500">
          {count}
        </span>
      </div>
      <div className="max-h-[420px] overflow-auto">{children}</div>
    </div>
  );
}

function VatTable({
  rows,
  totalLabel,
  accent,
}: {
  rows: VatRow[];
  totalLabel: string;
  accent: string;
}) {
  const fmtN = (n: number) => (n ? Math.round(n).toLocaleString("en-US") : "0");
  return (
    <table className="w-full text-sm">
      <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
        <tr>
          <th className="px-3 py-2">Огноо</th>
          <th className="px-3 py-2">Нэхэмжлэл / ДДТД</th>
          <th className="px-3 py-2 text-right">НӨАТ-гүй</th>
          <th className="px-3 py-2 text-right">НӨАТ</th>
          <th className="px-3 py-2 text-right">Нийт</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100">
        {rows.length === 0 ? (
          <EmptyRow cols={5} />
        ) : (
          rows.map((v) => (
            <tr key={v.id} className="hover:bg-zinc-50">
              <td className="whitespace-nowrap px-3 py-1.5 text-zinc-500">{v.date?.slice(0, 10) || "—"}</td>
              <td className="px-3 py-1.5">
                {v.invoice_no && (
                  <span className="mr-1 rounded border border-zinc-200 px-1 text-xs text-zinc-500">
                    {v.invoice_no}
                  </span>
                )}
                <span className="font-mono text-xs text-zinc-400">{(v.ddtd || "").slice(0, 16)}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-zinc-600">
                {fmtN(Number(v.amount))}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-zinc-400">
                {fmtN(Number(v.vat_amount))}
              </td>
              <td className={`whitespace-nowrap px-3 py-1.5 text-right font-medium tabular-nums ${accent}`}>
                {fmtN(Number(v.total_amount))}
              </td>
            </tr>
          ))
        )}
      </tbody>
      {rows.length > 0 && (
        <tfoot className="border-t border-zinc-200 bg-zinc-50 font-semibold">
          <tr>
            <td colSpan={4} className="px-3 py-2 text-right text-zinc-500">
              Нийт {rows.length}:
            </td>
            <td className={`px-3 py-2 text-right tabular-nums ${accent}`}>{totalLabel}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-3 py-8 text-center text-sm text-zinc-400">
        Бичлэг байхгүй
      </td>
    </tr>
  );
}
