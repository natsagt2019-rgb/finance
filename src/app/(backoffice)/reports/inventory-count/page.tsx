import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { fmtQty } from "@/lib/inventory-calc";
import { ITEM_SELECT, type ItemRow } from "../../inventory/types";

export const metadata = { title: "Тооллогын тооцооны хуудас" };

type SearchParams = { from?: string; to?: string };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

type CountRow = {
  id: number; date: string; item_id: number;
  book_qty: number; counted_qty: number; diff: number;
  resolution: string; company: string | null; move_id: number | null;
};

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

export default async function InventoryCountPage({
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

  const [counts, items] = await Promise.all([
    fetchAll<CountRow>((f, t) =>
      supabase.from("inv_counts").select("id, date, item_id, book_qty, counted_qty, diff, resolution, company, move_id")
        .gte("date", from).lte("date", to)
        .order("date", { ascending: true }).order("id", { ascending: true }).range(f, t)),
    fetchAll<ItemRow>((f, t) => supabase.from("inv_items").select(ITEM_SELECT).range(f, t)),
  ]);

  const itemOf = new Map(items.map((i) => [i.id, i]));

  const shortages = counts.filter((c) => Number(c.diff) < 0);
  const surpluses = counts.filter((c) => Number(c.diff) > 0);
  const shortQty = shortages.reduce((s, c) => s + Math.abs(Number(c.diff)), 0);
  const surpQty = surpluses.reduce((s, c) => s + Number(c.diff), 0);

  const q = (v: number) => (v ? fmtQty(v) : "—");
  const resLabel = (r: string) => (r === "staff" ? "Ажилтанд" : "Байгалийн");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">📋 Тооллогын тооцооны хуудас</h1>
          <p className="mt-1 text-sm text-zinc-500">Бүртгэлийн (FIFO) үлдэгдэл vs бодит тоо — зөрүү (дутагдал/илүүдэл).</p>
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

      <div className="mt-3 flex flex-wrap gap-3 text-sm print:hidden">
        <span className="rounded-lg bg-red-50 px-3 py-1.5 font-medium text-red-700">Дутагдал: {shortages.length} бараа · {fmtQty(shortQty)}ш</span>
        <span className="rounded-lg bg-green-50 px-3 py-1.5 font-medium text-green-700">Илүүдэл: {surpluses.length} бараа · {fmtQty(surpQty)}ш</span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Огноо</th>
              <th className="px-2 py-2 text-left">Бараа</th>
              <th className="px-2 py-2 text-left">Нэгж</th>
              <th className="px-2 py-2 text-right">Бүртгэл</th>
              <th className="px-2 py-2 text-right">Бодит</th>
              <th className="px-2 py-2 text-right">Зөрүү</th>
              <th className="px-2 py-2 text-left">Шийдвэрлэлт</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {counts.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-400">Энэ хугацаанд тооллого алга.</td></tr>
            ) : null}
            {counts.map((c) => {
              const it = itemOf.get(c.item_id);
              const d = Number(c.diff);
              return (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <td className="whitespace-nowrap px-3 py-1.5 text-zinc-600">{c.date.slice(0, 10)}</td>
                  <td className="px-2 py-1.5 text-zinc-700"><span className="font-mono text-xs text-zinc-400">{it?.sku ?? ""}</span> {it?.name ?? `#${c.item_id}`}</td>
                  <td className="px-2 py-1.5 text-zinc-500">{it?.unit ?? ""}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-zinc-600">{q(Number(c.book_qty))}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{q(Number(c.counted_qty))}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums font-medium ${d < 0 ? "text-red-700" : d > 0 ? "text-green-700" : "text-zinc-400"}`}>
                    {d === 0 ? "—" : (d > 0 ? "+" : "") + fmtQty(d)}
                  </td>
                  <td className="px-2 py-1.5 text-zinc-500">{d < 0 ? resLabel(c.resolution) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
