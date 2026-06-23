import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { fmtQty } from "@/lib/inventory-calc";

export const metadata = { title: "Дуусах хугацааны тайлан" };

type Batch = { id: number; date: string; item_id: number; qty: number; lot_no: string | null; expiry_date: string | null };
type ItemRow = { id: number; sku: string | null; name: string; unit: string };

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

function daysTo(today: string, d: string): number {
  return Math.floor((new Date(d + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000);
}

export default async function InventoryExpiryPage() {
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });

  const [batches, items] = await Promise.all([
    fetchAll<Batch>((f, t) => supabase.from("inv_moves").select("id, date, item_id, qty, lot_no, expiry_date").not("expiry_date", "is", null).in("type", ["receipt", "return_in"]).order("expiry_date", { ascending: true }).range(f, t)),
    fetchAll<ItemRow>((f, t) => supabase.from("inv_items").select("id, sku, name, unit").range(f, t)),
  ]);
  const itemOf = new Map(items.map((i) => [i.id, i]));

  const expired = batches.filter((b) => b.expiry_date && daysTo(today, b.expiry_date) < 0).length;
  const soon = batches.filter((b) => b.expiry_date && daysTo(today, b.expiry_date) >= 0 && daysTo(today, b.expiry_date) <= 30).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">⏳ Дуусах хугацааны тайлан</h1>
          <p className="mt-1 text-sm text-zinc-500">Цуврал/лотоор орлогод авсан барааны дуусах хугацаа ({today} байдлаар).</p>
        </div>
        <PrintButton />
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm print:hidden">
        <span className="rounded-lg bg-red-50 px-3 py-1.5 font-medium text-red-700">Хугацаа дууссан: {expired}</span>
        <span className="rounded-lg bg-amber-50 px-3 py-1.5 font-medium text-amber-700">30 хоногт дуусах: {soon}</span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Дуусах огноо</th>
              <th className="px-2 py-2 text-left">Бараа</th>
              <th className="px-2 py-2 text-left">Цуврал/лот</th>
              <th className="px-2 py-2 text-left">Орсон огноо</th>
              <th className="px-2 py-2 text-right">Тоо</th>
              <th className="px-2 py-2 text-right">Үлдсэн хоног</th>
              <th className="px-2 py-2 text-left">Төлөв</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {batches.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-400">Дуусах хугацаатай орлого бүртгээгүй байна.</td></tr>
            ) : null}
            {batches.map((b) => {
              const it = itemOf.get(b.item_id);
              const d = b.expiry_date ? daysTo(today, b.expiry_date) : 0;
              const status = d < 0 ? { t: "Дууссан", c: "bg-red-50 text-red-700" } : d <= 30 ? { t: "Удахгүй", c: "bg-amber-50 text-amber-700" } : { t: "Хэвийн", c: "bg-green-50 text-green-700" };
              return (
                <tr key={b.id} className="hover:bg-zinc-50">
                  <td className="whitespace-nowrap px-3 py-1.5 font-medium text-zinc-700">{b.expiry_date?.slice(0, 10)}</td>
                  <td className="px-2 py-1.5 text-zinc-700"><span className="font-mono text-xs text-zinc-400">{it?.sku ?? ""}</span> {it?.name ?? `#${b.item_id}`}</td>
                  <td className="px-2 py-1.5 text-zinc-500">{b.lot_no ?? ""}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-zinc-500">{b.date.slice(0, 10)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtQty(Number(b.qty))} {it?.unit ?? ""}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${d < 0 ? "text-red-700 font-medium" : "text-zinc-600"}`}>{d}</td>
                  <td className="px-2 py-1.5"><span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${status.c}`}>{status.t}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
