import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { fmt } from "@/lib/inventory-calc";
import { MOVE_SELECT, type MoveRow } from "../../inventory/types";

export const metadata = { title: "Худалдан авалт, борлуулалтын тайлан" };

type SearchParams = { from?: string; to?: string };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

type SaleRow = { sale_date: string; partner_name: string | null; net_amount: number; vat_amount: number; total_amount: number };

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const PAGE = 1000;
  const rows: T[] = [];
  for (let offset = 0; offset < 500000; offset += PAGE) {
    const { data, error } = await build(offset, offset + PAGE - 1);
    if (error) break;
    const page = (data as T[] | null) ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

export default async function InventoryTradePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });
  const year = today.slice(0, 4);
  const from = sp.from && ISO.test(sp.from) ? sp.from : `${year}-01-01`;
  const to = sp.to && ISO.test(sp.to) ? sp.to : today;

  const [moves, parts, sales] = await Promise.all([
    fetchAll<MoveRow>((f, t) =>
      supabase.from("inv_moves").select(MOVE_SELECT)
        .eq("type", "receipt").gte("date", from).lte("date", to).range(f, t)),
    fetchAll<{ id: number; name: string }>((f, t) => supabase.from("partners").select("id, name").range(f, t)),
    fetchAll<SaleRow>((f, t) =>
      supabase.from("sales").select("sale_date, partner_name, net_amount, vat_amount, total_amount")
        .eq("status", "posted").gte("sale_date", from).lte("sale_date", to).range(f, t)),
  ]);

  const partOf = new Map(parts.map((p) => [p.id, p.name]));

  // Харилцагчаар: худалдан авалт (receipt өртөг + НӨАТ) ба борлуулалт (sales).
  type Agg = { buy: number; buyVat: number; sellNet: number; sellVat: number };
  const agg = new Map<string, Agg>();
  const get = (name: string) => {
    let a = agg.get(name);
    if (!a) { a = { buy: 0, buyVat: 0, sellNet: 0, sellVat: 0 }; agg.set(name, a); }
    return a;
  };
  for (const m of moves) {
    const name = m.partner_id != null ? partOf.get(m.partner_id) ?? "— тодорхойгүй —" : "— тодорхойгүй —";
    const a = get(name);
    a.buy += Number(m.total_cost);
    a.buyVat += Number(m.vat_amount);
  }
  for (const s of sales) {
    const a = get((s.partner_name ?? "").trim() || "— тодорхойгүй —");
    a.sellNet += Number(s.net_amount);
    a.sellVat += Number(s.vat_amount);
  }

  const rows = [...agg.entries()].map(([name, a]) => ({ name, ...a }))
    .sort((x, y) => (y.buy + y.sellNet) - (x.buy + x.sellNet));

  const grand = rows.reduce((g, r) => ({
    buy: g.buy + r.buy, buyVat: g.buyVat + r.buyVat, sellNet: g.sellNet + r.sellNet, sellVat: g.sellVat + r.sellVat,
  }), { buy: 0, buyVat: 0, sellNet: 0, sellVat: 0 });

  const n = (v: number) => (v ? fmt(v) : "—");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">📦 Худалдан авалт, борлуулалтын тайлан</h1>
          <p className="mt-1 text-sm text-zinc-500">Харилцагч бүрээр: бараа материалын худалдан авалт (орлого) ба борлуулалт.</p>
        </div>
        <PrintButton />
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3 print:hidden">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Эхлэх
          <input type="date" name="from" defaultValue={from} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Дуусах
          <input type="date" name="to" defaultValue={to} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">Харах</button>
      </form>

      <p className="mt-3 text-sm text-zinc-500">{from} → {to} · {rows.length} харилцагч</p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th rowSpan={2} className="px-3 py-2 text-left">Харилцагч</th>
              <th colSpan={2} className="px-2 py-2 text-center border-l">Худалдан авалт</th>
              <th colSpan={2} className="px-2 py-2 text-center border-l">Борлуулалт</th>
            </tr>
            <tr>
              <th className="px-2 py-1 text-right border-l">Өртөг</th>
              <th className="px-2 py-1 text-right">НӨАТ</th>
              <th className="px-2 py-1 text-right border-l">Цэвэр</th>
              <th className="px-2 py-1 text-right">НӨАТ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-zinc-400">Энэ хугацаанд гүйлгээ алга.</td></tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.name} className="hover:bg-zinc-50">
                <td className="px-3 py-1.5 text-zinc-700">{r.name}</td>
                <td className="px-2 py-1.5 text-right tabular-nums border-l text-green-700">{n(r.buy)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-zinc-500">{n(r.buyVat)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums border-l text-blue-700">{n(r.sellNet)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-zinc-500">{n(r.sellVat)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-zinc-300 bg-zinc-900 font-semibold text-white">
              <td className="px-3 py-2">НИЙТ ДҮН</td>
              <td className="px-2 py-2 text-right tabular-nums border-l">{n(grand.buy)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{n(grand.buyVat)}</td>
              <td className="px-2 py-2 text-right tabular-nums border-l">{n(grand.sellNet)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{n(grand.sellVat)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
