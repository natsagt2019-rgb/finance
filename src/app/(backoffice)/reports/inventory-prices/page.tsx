import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { fmt } from "@/lib/inventory-calc";

export const metadata = { title: "Барааны үнийн тайлан" };

type SearchParams = { mode?: string };

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

type RawPrice = { id: number; item_id: number; partner_id: number | null; sale_price: number; cost_price: number; valid_from: string };
type ItemRow = { id: number; sku: string | null; name: string; unit: string };

export default async function InventoryPricesReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const mode = sp.mode === "history" ? "history" : "list";
  const supabase = await createClient();

  const [prices, items, partners] = await Promise.all([
    fetchAll<RawPrice>((f, t) => supabase.from("inv_prices").select("id, item_id, partner_id, sale_price, cost_price, valid_from").order("item_id").order("valid_from", { ascending: false }).order("id", { ascending: false }).range(f, t)),
    fetchAll<ItemRow>((f, t) => supabase.from("inv_items").select("id, sku, name, unit").range(f, t)),
    fetchAll<{ id: number; name: string }>((f, t) => supabase.from("partners").select("id, name").range(f, t)),
  ]);

  const itemOf = new Map(items.map((i) => [i.id, i]));
  const partOf = new Map(partners.map((p) => [p.id, p.name]));
  const label = (p: RawPrice) => {
    const it = itemOf.get(p.item_id);
    return it ? `${it.sku ? it.sku + " " : ""}${it.name}` : `#${p.item_id}`;
  };
  const n = (v: number) => (v ? fmt(v) : "—");

  // key = item_id|partner_id; prices are newest-first within each item.
  const byKey = new Map<string, RawPrice[]>();
  for (const p of prices) {
    const k = `${p.item_id}|${p.partner_id ?? ""}`;
    const arr = byKey.get(k) ?? [];
    arr.push(p);
    byKey.set(k, arr);
  }

  const tabCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${active ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-600 hover:bg-zinc-50"}`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">💲 Барааны үнийн тайлан</h1>
          <p className="mt-1 text-sm text-zinc-500">Идэвхтэй үнийн жагсаалт ба үнийн өөрчлөлтийн түүх.</p>
        </div>
        <PrintButton />
      </div>

      <div className="mt-4 flex gap-2 print:hidden">
        <a href="/reports/inventory-prices?mode=list" className={tabCls(mode === "list")}>Үнийн жагсаалт</a>
        <a href="/reports/inventory-prices?mode=history" className={tabCls(mode === "history")}>Үнийн өөрчлөлт</a>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Бараа</th>
              <th className="px-3 py-2 text-left">Харилцагч</th>
              <th className="px-3 py-2 text-left">Огноо</th>
              <th className="px-3 py-2 text-right">Зарах үнэ</th>
              {mode === "history" ? <th className="px-3 py-2 text-right">Өөрчлөлт</th> : null}
              <th className="px-3 py-2 text-right">Өртгийн үнэ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {byKey.size === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-zinc-400">Үнэ бүртгээгүй байна.</td></tr>
            ) : null}
            {[...byKey.values()].map((arr) => {
              const shown = mode === "list" ? [arr[0]] : arr; // list = хамгийн сүүлийн; history = бүгд
              return shown.map((p, i) => {
                const prev = arr[arr.indexOf(p) + 1]; // дараагийн (хуучин) үнэ
                const delta = prev ? Number(p.sale_price) - Number(prev.sale_price) : 0;
                return (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-1.5 text-zinc-700">{i === 0 || mode === "list" ? label(p) : ""}</td>
                    <td className="px-3 py-1.5 text-zinc-500">{p.partner_id != null ? partOf.get(p.partner_id) ?? "" : <span className="text-zinc-400">Ерөнхий</span>}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-zinc-500">{p.valid_from?.slice(0, 10)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium">{n(Number(p.sale_price))}</td>
                    {mode === "history" ? (
                      <td className={`px-3 py-1.5 text-right tabular-nums ${delta > 0 ? "text-green-700" : delta < 0 ? "text-red-700" : "text-zinc-400"}`}>
                        {delta === 0 ? "—" : (delta > 0 ? "+" : "") + fmt(delta)}
                      </td>
                    ) : null}
                    <td className="px-3 py-1.5 text-right tabular-nums text-zinc-500">{n(Number(p.cost_price))}</td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
