import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { fmt, fmtQty } from "@/lib/inventory-calc";

export const metadata = { title: "Хөрвүүлэлтийн товчоо тайлан" };

type SearchParams = { from?: string; to?: string };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

type Conv = { id: number; date: string; product_item_id: number; output_qty: number; total_cost: number; doc_no: string | null; journal_id: number | null };

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

export default async function InventoryConversionsPage({
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

  const [convs, items] = await Promise.all([
    fetchAll<Conv>((f, t) => supabase.from("inv_conversions").select("id, date, product_item_id, output_qty, total_cost, doc_no, journal_id").gte("date", from).lte("date", to).order("date", { ascending: true }).order("id", { ascending: true }).range(f, t)),
    fetchAll<{ id: number; sku: string | null; name: string; unit: string }>((f, t) => supabase.from("inv_items").select("id, sku, name, unit").range(f, t)),
  ]);
  const itemOf = new Map(items.map((i) => [i.id, i]));

  const grandQty = convs.reduce((s, c) => s + Number(c.output_qty), 0);
  const grandCost = convs.reduce((s, c) => s + Number(c.total_cost), 0);
  const n = (v: number) => (v ? fmt(v) : "—");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">⚗ Хөрвүүлэлтийн товчоо тайлан</h1>
          <p className="mt-1 text-sm text-zinc-500">Түүхий эдээс бүтээгдэхүүн гаргасан хөрвүүлэлтийн баримтууд.</p>
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

      <p className="mt-3 text-sm text-zinc-500">{from} → {to} · {convs.length} хөрвүүлэлт</p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Огноо</th>
              <th className="px-2 py-2 text-left">Баримт</th>
              <th className="px-2 py-2 text-left">Бүтээгдэхүүн</th>
              <th className="px-2 py-2 text-right">Гарсан тоо</th>
              <th className="px-2 py-2 text-right">Нэгж өртөг</th>
              <th className="px-2 py-2 text-right">Нийт өртөг (₮)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {convs.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-zinc-400">Энэ хугацаанд хөрвүүлэлт алга.</td></tr>
            ) : null}
            {convs.map((c) => {
              const it = itemOf.get(c.product_item_id);
              const unitCost = Number(c.output_qty) > 0 ? Number(c.total_cost) / Number(c.output_qty) : 0;
              return (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <td className="whitespace-nowrap px-3 py-1.5 text-zinc-600">{c.date.slice(0, 10)}</td>
                  <td className="px-2 py-1.5 text-zinc-500">{c.doc_no ?? ""}</td>
                  <td className="px-2 py-1.5 text-zinc-700"><span className="font-mono text-xs text-zinc-400">{it?.sku ?? ""}</span> {it?.name ?? `#${c.product_item_id}`}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtQty(Number(c.output_qty))} {it?.unit ?? ""}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-zinc-500">{n(unitCost)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-medium">{n(Number(c.total_cost))}</td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-zinc-300 bg-zinc-900 font-semibold text-white">
              <td colSpan={3} className="px-3 py-2">НИЙТ ДҮН</td>
              <td className="px-2 py-2 text-right tabular-nums">{fmtQty(grandQty)}</td>
              <td></td>
              <td className="px-2 py-2 text-right tabular-nums">{n(grandCost)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
