import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { VAT_SELECT, type VatRow, type VatType } from "./types";
import { TypeToggle } from "./type-toggle";
import { BulkTypeBar } from "./bulk-type-bar";

const ROW_LIMIT = 300; // жагсаалтад харуулах дээд хэмжээ (нэгтгэл view-ээс бүрэн)

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

const MN_MONTHS = [
  "",
  "1-р сар",
  "2-р сар",
  "3-р сар",
  "4-р сар",
  "5-р сар",
  "6-р сар",
  "7-р сар",
  "8-р сар",
  "9-р сар",
  "10-р сар",
  "11-р сар",
  "12-р сар",
];

type SearchParams = {
  type?: string;
  month?: string;
  q?: string;
};

// vat_monthly_summary view-ийн мөр (server-side GROUP BY).
type SummaryRow = {
  type: VatType;
  month: number | null;
  cnt: number;
  vat_sum: number;
  total_sum: number;
};

export default async function VatPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const selType: VatType | "" =
    sp.type === "out" || sp.type === "in" ? sp.type : "";
  const selMonth = sp.month && /^\d+$/.test(sp.month) ? Number(sp.month) : null;
  const search = (sp.q ?? "").trim();

  // ── Нэгтгэл: server-side GROUP BY view (max-rows cap-аас зайлсхийнэ) ──────
  const { data: sumData } = await supabase
    .from("vat_monthly_summary")
    .select("type, month, cnt, vat_sum, total_sum");
  const summary = (sumData as SummaryRow[] | null) ?? [];

  const sumOf = (rs: SummaryRow[], col: "vat_sum" | "total_sum") =>
    rs.reduce((s, r) => s + Number(r[col] ?? 0), 0);

  // Stat картууд сарын шүүлтийг хүндэтгэнэ (төрөл/хайлтыг үл хэрэгснэ).
  const statRows = selMonth
    ? summary.filter((r) => r.month === selMonth)
    : summary;
  const outVat = sumOf(statRows.filter((r) => r.type === "out"), "vat_sum");
  const inVat = sumOf(statRows.filter((r) => r.type === "in"), "vat_sum");
  const outTotal = sumOf(statRows.filter((r) => r.type === "out"), "total_sum");
  const inTotal = sumOf(statRows.filter((r) => r.type === "in"), "total_sum");
  const netVat = outVat - inVat;

  // ── Сарын нэгтгэл (бүх сар) ──────────────────────────────────────────────
  type MonthAgg = { oVat: number; oCnt: number; iVat: number; iCnt: number };
  const byMonth = new Map<number, MonthAgg>();
  for (const r of summary) {
    if (r.month == null) continue;
    const m = byMonth.get(r.month) ?? { oVat: 0, oCnt: 0, iVat: 0, iCnt: 0 };
    if (r.type === "out") {
      m.oVat += Number(r.vat_sum ?? 0);
      m.oCnt += Number(r.cnt ?? 0);
    } else {
      m.iVat += Number(r.vat_sum ?? 0);
      m.iCnt += Number(r.cnt ?? 0);
    }
    byMonth.set(r.month, m);
  }
  const monthsList = [...byMonth.keys()].sort((a, b) => a - b);
  const totOutVat = sumOf(summary.filter((r) => r.type === "out"), "vat_sum");
  const totInVat = sumOf(summary.filter((r) => r.type === "in"), "vat_sum");
  const totOutCnt = summary
    .filter((r) => r.type === "out")
    .reduce((s, r) => s + Number(r.cnt ?? 0), 0);
  const totInCnt = summary
    .filter((r) => r.type === "in")
    .reduce((s, r) => s + Number(r.cnt ?? 0), 0);

  // ── Баримтын жагсаалт (vat_active — хаалтаар орлуулагдсан толгойг хасна) ───
  let query = supabase.from("vat_active").select(VAT_SELECT, { count: "exact" });
  if (selType) query = query.eq("type", selType);
  if (selMonth) query = query.eq("month", selMonth);
  if (search) {
    // Үргэлж нэр / ТТД / ДДТД-аар хайна.
    const term = `%${search}%`;
    const parts = [
      `partner_name.ilike.${term}`,
      `partner_register.ilike.${term}`,
      `ddtd.ilike.${term}`,
    ];
    // Хэрэв тоо бол НЭМЭЛТээр дүн/НӨАТ/суурь дээр ±0.1% мужаар хайна.
    const cleaned = search.replace(/[,₮\s]/g, "");
    const asNum = Number(cleaned);
    if (cleaned !== "" && Number.isFinite(asNum) && asNum !== 0) {
      const lo = (asNum * 0.999).toFixed(2);
      const hi = (asNum * 1.001).toFixed(2);
      parts.push(`and(total_amount.gte.${lo},total_amount.lte.${hi})`);
      parts.push(`and(vat_amount.gte.${lo},vat_amount.lte.${hi})`);
      parts.push(`and(amount.gte.${lo},amount.lte.${hi})`);
    }
    query = query.or(parts.join(","));
  }
  const {
    data: tableData,
    error,
    count,
  } = await query.order("date", { ascending: false }).limit(ROW_LIMIT);
  const records = (tableData as VatRow[] | null) ?? [];
  const totalCount = count ?? records.length; // шүүлтэд тохирох жинхэнэ тоо

  return (
    <div>
      {/* Толгой + үйлдэл */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            НӨАТ бүртгэл (eBarimt)
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Борлуулалт/худалдан авалтын НӨАТ — eBarimt баримтын бүртгэл, сарын
            нэгтгэл.
          </p>
        </div>
        <Link
          href="/vat/import"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
        >
          ↥ Excel оруулах
        </Link>
      </div>

      {/* Stat картууд */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Борлуулалтын НӨАТ
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-blue-900">
            {fmt(outVat)}₮
          </p>
          <p className="mt-1 text-xs text-blue-500">Нийт дүн: {fmt(outTotal)}₮</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
            Худалдан авалтын НӨАТ
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-amber-900">
            {fmt(inVat)}₮
          </p>
          <p className="mt-1 text-xs text-amber-600">Нийт дүн: {fmt(inTotal)}₮</p>
        </div>
        <div
          className={`rounded-2xl border p-5 ${
            netVat >= 0
              ? "border-rose-100 bg-rose-50"
              : "border-emerald-100 bg-emerald-50"
          }`}
        >
          <p
            className={`text-xs font-medium uppercase tracking-wide ${
              netVat >= 0 ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            Төлбөл зохих НӨАТ
          </p>
          <p
            className={`mt-2 text-2xl font-bold tabular-nums ${
              netVat >= 0 ? "text-rose-900" : "text-emerald-900"
            }`}
          >
            {fmt(netVat)}₮
          </p>
          <p
            className={`mt-1 text-xs ${
              netVat >= 0 ? "text-rose-500" : "text-emerald-600"
            }`}
          >
            Борлуулалт − Суутгал
          </p>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-purple-600">
            Нийт баримт
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-purple-900">
            {fmt(totalCount)}
          </p>
          <p className="mt-1 text-xs text-purple-500">Хайлтын үр дүн</p>
        </div>
      </div>

      {/* Сарын нэгтгэл */}
      {monthsList.length > 0 && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700">
            📅 Сарын НӨАТ нэгтгэл
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2 text-center">Сар</th>
                  <th className="px-4 py-2 text-right">Борл. баримт</th>
                  <th className="px-4 py-2 text-right">Борлуулалтын НӨАТ</th>
                  <th className="px-4 py-2 text-right">Худ.авалт баримт</th>
                  <th className="px-4 py-2 text-right">Суутгах НӨАТ</th>
                  <th className="px-4 py-2 text-right font-bold">Цэвэр НӨАТ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {monthsList.map((m) => {
                  const d = byMonth.get(m)!;
                  const net = d.oVat - d.iVat;
                  return (
                    <tr key={m} className="hover:bg-zinc-50">
                      <td className="px-4 py-2 text-center font-semibold text-zinc-700">
                        {m < 13 ? MN_MONTHS[m] : `${m}-р сар`}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-zinc-400">
                        {d.oCnt}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums text-blue-600">
                        {fmt(d.oVat)}₮
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-zinc-400">
                        {d.iCnt}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums text-amber-600">
                        {fmt(d.iVat)}₮
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-bold tabular-nums ${
                          net >= 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {fmt(net)}₮
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-zinc-100 font-bold">
                <tr>
                  <td className="px-4 py-2 text-zinc-700">Нийт</td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-600">
                    {totOutCnt}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-blue-700">
                    {fmt(totOutVat)}₮
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-600">
                    {totInCnt}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                    {fmt(totInVat)}₮
                  </td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums ${
                      totOutVat - totInVat >= 0
                        ? "text-rose-700"
                        : "text-emerald-700"
                    }`}
                  >
                    {fmt(totOutVat - totInVat)}₮
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Шүүлт */}
      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">
            Төрөл
          </label>
          <select
            name="type"
            defaultValue={selType}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          >
            <option value="">— Бүгд —</option>
            <option value="out">Борлуулалт (out)</option>
            <option value="in">Худалдан авалт (in)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600">
            Сар
          </label>
          <select
            name="month"
            defaultValue={selMonth ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          >
            <option value="">— Бүгд —</option>
            {monthsList.map((m) => (
              <option key={m} value={m}>
                {m}-р сар
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto sm:min-w-[240px] sm:flex-1">
          <label className="mb-1 block text-xs font-semibold text-zinc-600">
            Хайх (харилцагч / ТТД / ДДТД / дүн)
          </label>
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Нэр, регистр, ДДТД, эсвэл дүн (67000)..."
            className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Хайх
        </button>
        <Link
          href="/vat"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          ✕
        </Link>
      </form>

      {/* Бөөн ангилал засах — зөвхөн хайлт идэвхтэй үед (санамсаргүй массын засваргүй) */}
      {search && records.length > 0 ? (
        <div className="mt-4">
          <BulkTypeBar ids={records.map((r) => r.id)} />
        </div>
      ) : null}

      {/* Баримтын жагсаалт */}
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <span className="text-sm font-semibold text-zinc-700">
            🧾 eBarimt бүртгэл
          </span>
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
            {fmt(totalCount)} баримт
            {totalCount > records.length
              ? ` (${fmt(records.length)} харуулав)`
              : ""}
          </span>
        </div>
        {error ? (
          <div className="px-6 py-10 text-center text-sm text-red-600">
            Алдаа: {error.message}
            <p className="mt-2 text-zinc-500">
              vat_records хүснэгт үүссэн эсэхийг шалгана уу (scripts/vat-schema.sql).
            </p>
          </div>
        ) : records.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            Бүртгэл байхгүй байна.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Огноо</th>
                  <th className="px-3 py-2 text-center">Сар</th>
                  <th className="px-3 py-2">Төрөл</th>
                  <th className="px-3 py-2">ДДТД</th>
                  <th className="px-3 py-2">Харилцагч</th>
                  <th className="px-3 py-2">ТТД</th>
                  <th className="px-3 py-2 text-right">Нийт дүн</th>
                  <th className="px-3 py-2 text-right">НӨАТ</th>
                  <th className="px-3 py-2">Татварын төрөл</th>
                  <th className="px-3 py-2">Эх сурвалж</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600">
                      {r.date}
                    </td>
                    <td className="px-3 py-2 text-center text-zinc-400">
                      {r.month ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <TypeToggle id={r.id} type={r.type} />
                    </td>
                    <td
                      className="max-w-[160px] truncate px-3 py-2 font-mono text-xs text-zinc-400"
                      title={r.ddtd ?? ""}
                    >
                      {r.ddtd ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {r.partner_id ? (
                        <Link
                          href={`/partners/${r.partner_id}/edit`}
                          className="text-zinc-700 underline-offset-2 hover:underline"
                        >
                          {r.partner_name ?? "—"}
                        </Link>
                      ) : (
                        <span className="text-zinc-500">
                          {r.partner_name ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-500">
                      {r.partner_register ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-zinc-700">
                      {fmt(r.total_amount)}₮
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-blue-600">
                      {fmt(r.vat_amount)}₮
                    </td>
                    <td className="px-3 py-2">
                      {r.tax_type === "Энгийн" ? (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          Энгийн
                        </span>
                      ) : r.tax_type === "Чөлөөлөгдөх" ? (
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                          Чөлөөлөгдөх
                        </span>
                      ) : (
                        <span className="text-zinc-400">{r.tax_type ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-500">{r.source ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
