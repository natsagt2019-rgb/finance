import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import {
  INVOICE_SELECT,
  isOverdue,
  type InvoiceRow,
  type InvoiceStatus,
} from "./types";
import { RowActions } from "./row-actions";

const ROW_LIMIT = 2000;

type SearchParams = {
  status?: string;
  month?: string;
  q?: string;
};

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtDate(d: string | null): string {
  return d ? d.slice(5) : "—"; // MM-DD
}

const STATUS_BADGE: Record<InvoiceStatus, { label: string; cls: string }> = {
  open: { label: "Нээлттэй", cls: "bg-zinc-100 text-zinc-600" },
  partial: { label: "Хэсэгчлэн", cls: "bg-amber-100 text-amber-700" },
  paid: { label: "Төлөгдсөн", cls: "bg-green-100 text-green-700" },
};

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const selStatus: InvoiceStatus | "" =
    sp.status === "open" || sp.status === "partial" || sp.status === "paid"
      ? sp.status
      : "";
  const selMonth =
    sp.month && MONTHS.includes(Number(sp.month)) ? Number(sp.month) : 0;
  const search = (sp.q ?? "").trim();

  // Бүх идэвхтэй нэхэмжлэлийг татаж аваад JS дотор шүүж/нэгтгэнэ
  // (харилцагчийн хуудасны загвартай адил).
  const { data: rows, error } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("is_active", true)
    .order("inv_date", { ascending: false })
    .order("invoice_no", { ascending: false })
    .limit(ROW_LIMIT);

  const all = (rows as InvoiceRow[] | null) ?? [];

  // Өнөөдрийн огноо (МУ цагийн бүс, YYYY-MM-DD)
  const today = new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });

  // Сар + хайлтаар шүүсэн олонлог (төлвийн tab-аас үл хамаарна).
  // Карт болон tab-ийн тоонууд энэ олонлогоос тооцоологдоно.
  const term = search.toLowerCase();
  const scoped = all.filter((r) => {
    if (selMonth) {
      const m = Number(r.inv_date.slice(5, 7));
      if (m !== selMonth) return false;
    }
    if (term) {
      const hay = `${r.invoice_no ?? ""} ${r.partner_name ?? ""} ${
        r.description ?? ""
      }`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });

  // Нэгтгэлийн картууд
  let totalAmt = 0;
  let totalPaid = 0;
  const cnt = { open: 0, partial: 0, paid: 0 };
  for (const r of scoped) {
    totalAmt += Number(r.amount) || 0;
    totalPaid += Number(r.paid_amount) || 0;
    cnt[r.status] += 1;
  }
  const totalRemaining = totalAmt - totalPaid;
  const collectPct = totalAmt > 0 ? (totalPaid / totalAmt) * 100 : 0;
  const paidFullyCount = cnt.paid;
  const openCount = cnt.open + cnt.partial;

  // Төлвийн tab-аар шүүсэн харагдах мөрүүд
  const shown = selStatus
    ? scoped.filter((r) => r.status === selStatus)
    : scoped;

  const footAmt = shown.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const footPaid = shown.reduce((s, r) => s + (Number(r.paid_amount) || 0), 0);

  const buildHref = (over: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const status = over.status ?? selStatus;
    const month = over.month ?? (selMonth ? String(selMonth) : "");
    const q = over.q ?? search;
    if (status) params.set("status", status);
    if (month) params.set("month", month);
    if (q) params.set("q", q);
    const qs = params.toString();
    return qs ? `/invoices?${qs}` : "/invoices";
  };

  const tabCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${
      active
        ? "bg-zinc-900 text-white"
        : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Нэхэмжлэхийн тайлан
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Худалдан авагчид гаргасан нэхэмжлэх, төлбөрийн төлөв, авлагын үлдэгдэл.
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + Нэхэмжлэх нэмэх
        </Link>
      </div>

      {/* Нэгтгэлийн картууд */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Нийт нэхэмжилсэн
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-blue-900">
            {fmtMoney(totalAmt)}₮
          </p>
          <p className="mt-1 text-xs text-blue-500">{scoped.length} нэхэмжлэл</p>
        </div>
        <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-green-600">
            Цугласан
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-green-900">
            {fmtMoney(totalPaid)}₮
          </p>
          <p className="mt-1 text-xs text-green-600">
            {paidFullyCount} бүрэн төлөгдсөн
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
            Үлдэгдэл авлага
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-amber-900">
            {fmtMoney(totalRemaining)}₮
          </p>
          <p className="mt-1 text-xs text-amber-600">{openCount} нэхэмжлэл</p>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-purple-600">
            Цуглуулалтын хувь
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-purple-900">
            {collectPct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Шүүлт: төлөв tab + сар + хайлт */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href={buildHref({ status: "" })} className={tabCls(!selStatus)}>
            Бүгд ({scoped.length})
          </Link>
          <Link
            href={buildHref({ status: "open" })}
            className={tabCls(selStatus === "open")}
          >
            Нээлттэй ({cnt.open})
          </Link>
          <Link
            href={buildHref({ status: "partial" })}
            className={tabCls(selStatus === "partial")}
          >
            Хэсэгчлэн ({cnt.partial})
          </Link>
          <Link
            href={buildHref({ status: "paid" })}
            className={tabCls(selStatus === "paid")}
          >
            Төлөгдсөн ({cnt.paid})
          </Link>
        </div>

        <form method="get" className="ml-auto flex items-center gap-2">
          {selStatus && <input type="hidden" name="status" value={selStatus} />}
          <select
            name="month"
            defaultValue={selMonth ? String(selMonth) : ""}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          >
            <option value="">Бүх сар</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}-р сар
              </option>
            ))}
          </select>
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Нэхэмж # эсвэл харилцагч…"
            className="w-64 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Хайх
          </button>
          {(search || selMonth) && (
            <Link
              href={buildHref({ status: selStatus, month: "", q: "" })}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Цэвэрлэх
            </Link>
          )}
        </form>
      </div>

      {/* Хүснэгт */}
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white">
        {error ? (
          <div className="px-6 py-10 text-center text-sm text-red-600">
            Алдаа: {error.message}
            <p className="mt-2 text-zinc-500">
              invoices хүснэгт үүссэн эсэхийг шалгана уу (schema.sql).
            </p>
          </div>
        ) : shown.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-zinc-500">
            Нэхэмжлэх олдсонгүй.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Нэхэмж №</th>
                  <th className="px-4 py-2">Огноо</th>
                  <th className="px-4 py-2">Харилцагч</th>
                  <th className="px-4 py-2">Хариуцагч</th>
                  <th className="px-4 py-2">Тайлбар</th>
                  <th className="px-4 py-2">Хугацаа</th>
                  <th className="px-4 py-2 text-right">Нийт дүн</th>
                  <th className="px-4 py-2 text-right">Төлсөн</th>
                  <th className="px-4 py-2 text-right">Үлдэгдэл</th>
                  <th className="px-4 py-2">Төлөв</th>
                  <th className="px-4 py-2 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {shown.map((r) => {
                  const amount = Number(r.amount) || 0;
                  const paid = Number(r.paid_amount) || 0;
                  const remaining = amount - paid;
                  const overdue = isOverdue(r.due_date, r.status, today);
                  const badge = STATUS_BADGE[r.status];
                  const pct =
                    amount > 0
                      ? Math.min(100, Math.round((paid / amount) * 100))
                      : 0;
                  return (
                    <tr
                      key={r.id}
                      className={overdue ? "bg-red-50" : "hover:bg-zinc-50"}
                    >
                      <td className="whitespace-nowrap px-4 py-2 font-medium text-zinc-800">
                        {r.invoice_no || `#${r.id}`}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                        {r.inv_date}
                      </td>
                      <td className="px-4 py-2 text-zinc-800">
                        {r.partner_name || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                        {r.responsible || "—"}
                      </td>
                      <td
                        className="max-w-[18rem] truncate px-4 py-2 text-zinc-500"
                        title={r.description ?? ""}
                      >
                        {r.description || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                        {overdue ? (
                          <span className="font-medium text-red-600">
                            {fmtDate(r.due_date)} ⚠
                          </span>
                        ) : (
                          fmtDate(r.due_date)
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-zinc-800">
                        {fmtMoney(amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-green-700">
                        {paid ? fmtMoney(paid) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums font-medium text-red-700">
                        {remaining ? fmtMoney(remaining) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            overdue && r.status !== "paid"
                              ? "bg-red-100 text-red-700"
                              : badge.cls
                          }`}
                        >
                          {overdue && r.status !== "paid"
                            ? "Хэтэрсэн"
                            : badge.label}
                        </span>
                        {r.status === "partial" && (
                          <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-zinc-200">
                            <div
                              className="h-full bg-amber-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        <RowActions
                          id={r.id}
                          label={r.invoice_no || `#${r.id}`}
                          isPaid={r.status === "paid"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm font-semibold">
                <tr>
                  <td colSpan={6} className="px-4 py-2 text-right text-zinc-500">
                    Нийт {shown.length} нэхэмжлэл:
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-800">
                    {fmtMoney(footAmt)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-green-700">
                    {fmtMoney(footPaid)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-red-700">
                    {fmtMoney(footAmt - footPaid)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
