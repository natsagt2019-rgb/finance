import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { VAT_RATE } from "@/lib/company";

type SearchParams = { from?: string; to?: string; q?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ROW_LIMIT = 10000;

function fmt(n: number): string {
  if (!n) return "0";
  return Math.round(n).toLocaleString("en-US");
}

type Group = {
  key: string;
  code: string;
  name: string;
  count: number;
  gross: number; // invoices.amount нийлбэр (нийт дүн)
  net: number; // НӨАТ-гүй дүн (НӨАТ-тай нэхэмжлэлд amount/1.1, бусдад amount)
  vat: number; // НӨАТ (gross − net)
};

export default async function SalesByCustomerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });
  const year = today.slice(0, 4);
  const dFrom = sp.from && ISO.test(sp.from) ? sp.from : `${year}-01-01`;
  const dTo = sp.to && ISO.test(sp.to) ? sp.to : today;
  const search = (sp.q ?? "").trim();

  // Нэхэмжлэх (борлуулалт) + харилцагчийн код
  const [{ data: invRows, error }, { data: partnerRows }] = await Promise.all([
    supabase
      .from("invoices")
      .select("amount, partner_id, partner_name, has_vat")
      .eq("is_active", true)
      .gte("inv_date", dFrom)
      .lte("inv_date", dTo)
      .limit(ROW_LIMIT),
    supabase.from("partners").select("id, code, name").limit(ROW_LIMIT),
  ]);

  const partnerById = new Map<
    number,
    { code: string | null; name: string }
  >();
  for (const p of (partnerRows as
    | { id: number; code: string | null; name: string }[]
    | null) ?? []) {
    partnerById.set(p.id, { code: p.code, name: p.name });
  }

  // Харилцагчаар бүлэглэх. НӨАТ-ыг нэхэмжлэх тус бүрийн has_vat-аар тооцно
  // (НӨАТ-гүй/чөлөөлөгдөх борлуулалтад худал НӨАТ зохиохгүй).
  const groups = new Map<string, Group>();
  for (const r of (invRows as
    | {
        amount: number | null;
        partner_id: number | null;
        partner_name: string | null;
        has_vat: boolean | null;
      }[]
    | null) ?? []) {
    const p = r.partner_id != null ? partnerById.get(r.partner_id) : undefined;
    const name = p?.name || r.partner_name || "(тодорхойгүй)";
    const code = p?.code || "";
    const key = r.partner_id != null ? `id:${r.partner_id}` : `nm:${name}`;
    const gross = Number(r.amount) || 0;
    const net = r.has_vat ? Math.round(gross / (1 + VAT_RATE)) : gross;
    const g =
      groups.get(key) ?? { key, code, name, count: 0, gross: 0, net: 0, vat: 0 };
    g.count += 1;
    g.gross += gross;
    g.net += net;
    g.vat += gross - net;
    groups.set(key, g);
  }

  let list = [...groups.values()];
  if (search) {
    const term = search.toLowerCase();
    list = list.filter(
      (g) =>
        g.name.toLowerCase().includes(term) ||
        g.code.toLowerCase().includes(term),
    );
  }
  list.sort((a, b) => b.gross - a.gross);

  const totalGross = list.reduce((s, g) => s + g.gross, 0);
  const totalNet = list.reduce((s, g) => s + g.net, 0);
  const totalVat = list.reduce((s, g) => s + g.vat, 0);
  const totalCount = list.reduce((s, g) => s + g.count, 0);

  const inputCls =
    "rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Борлуулалтын тайлан <span className="text-zinc-400">/харилцагчаар/</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Харилцагч бүрийн борлуулалт ({dFrom} → {dTo}). Эх сурвалж: нэхэмжлэх.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <input type="date" name="from" defaultValue={dFrom} className={inputCls} />
            <input type="date" name="to" defaultValue={dTo} className={inputCls} />
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Харилцагч / код"
              className={`${inputCls} w-44`}
            />
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Шүүх
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      {/* Хэвлэхэд гарах гарчиг */}
      <div className="mb-3 hidden text-center print:block">
        <h2 className="text-lg font-bold text-zinc-900">
          Борлуулалтын тайлан /харилцагчаар/
        </h2>
        <p className="text-sm text-zinc-600">
          {dFrom} → {dTo}
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Алдаа: {error.message}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          Энэ хугацаанд борлуулалт олдсонгүй.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-right">№</th>
                <th className="px-4 py-2 text-left">Код</th>
                <th className="px-4 py-2 text-left">Харилцагч</th>
                <th className="px-4 py-2 text-right">Тоо</th>
                <th className="px-4 py-2 text-right">НӨАТ-гүй дүн</th>
                <th className="px-4 py-2 text-right">НӨАТ (10%)</th>
                <th className="px-4 py-2 text-right">Нийт дүн</th>
                <th className="px-4 py-2 text-right">Эзлэх %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.map((g, i) => {
                const total = g.gross;
                const net = g.net;
                const vat = g.vat;
                const pct = totalGross ? (g.gross / totalGross) * 100 : 0;
                return (
                  <tr key={g.key}>
                    <td className="px-3 py-1.5 text-right tabular-nums text-zinc-400">
                      {i + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-1.5 font-mono text-xs text-zinc-400">
                      {g.code || "—"}
                    </td>
                    <td className="px-4 py-1.5 text-zinc-700">{g.name}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums text-zinc-500">
                      {g.count}
                    </td>
                    <td className="px-4 py-1.5 text-right tabular-nums text-zinc-700">
                      {fmt(net)}
                    </td>
                    <td className="px-4 py-1.5 text-right tabular-nums text-zinc-500">
                      {fmt(vat)}
                    </td>
                    <td className="px-4 py-1.5 text-right tabular-nums font-medium text-zinc-900">
                      {fmt(total)}
                    </td>
                    <td className="px-4 py-1.5 text-right tabular-nums text-zinc-500">
                      {pct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold">
                <td className="px-3 py-2" />
                <td className="px-4 py-2" />
                <td className="px-4 py-2 text-zinc-900">
                  НИЙТ ({list.length} харилцагч)
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{totalCount}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmt(totalNet)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmt(totalVat)}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {fmt(totalGross)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-zinc-400 print:hidden">
        НӨАТ-ыг нэхэмжлэх бүрийн «НӨАТ-тай эсэх»-ээс хамаарч задална (НӨАТ-гүй/
        чөлөөлөгдөх борлуулалтад НӨАТ тооцохгүй). Өртөг/ашиг тооцоход барааны
        өртгийн мэдээлэл шаардлагатай тул энэ хувилбарт ороогүй.
      </p>
    </div>
  );
}
