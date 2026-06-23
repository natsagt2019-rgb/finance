import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { CATEGORIES, categoryLabel, computeFifo, fmt, fmtQty, type MoveLite } from "@/lib/inventory-calc";
import { ITEM_SELECT, MOVE_SELECT, type ItemRow, type MoveRow } from "../../inventory/types";

export const metadata = { title: "Барааны өртгийн тайлан" };

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

export default async function InventoryCostPage() {
  const supabase = await createClient();

  const [items, moves] = await Promise.all([
    fetchAll<ItemRow>((f, t) => supabase.from("inv_items").select(ITEM_SELECT).eq("is_active", true).range(f, t)),
    fetchAll<MoveRow>((f, t) => supabase.from("inv_moves").select(MOVE_SELECT).order("date", { ascending: true }).order("id", { ascending: true }).range(f, t)),
  ]);

  const byItem = new Map<number, MoveLite[]>();
  for (const m of moves) {
    const arr = byItem.get(m.item_id) ?? [];
    arr.push({ id: m.id, date: m.date.slice(0, 10), type: m.type, qty: m.qty, unit_cost: m.unit_cost });
    byItem.set(m.item_id, arr);
  }

  type Row = { item: ItemRow; qty: number; unitCost: number; value: number };
  const rows: Row[] = [];
  for (const item of items) {
    const f = computeFifo(byItem.get(item.id) ?? []);
    if (f.qtyRemaining === 0 && f.valueRemaining === 0) continue;
    rows.push({
      item, qty: f.qtyRemaining, value: f.valueRemaining,
      unitCost: f.qtyRemaining > 0 ? f.valueRemaining / f.qtyRemaining : 0,
    });
  }

  const knownCodes = CATEGORIES.map((c) => c.code);
  const allCodes = [...knownCodes, ...new Set(rows.map((r) => r.item.category_code).filter((c) => !knownCodes.includes(c)))]
    .filter((c) => rows.some((r) => r.item.category_code === c));
  const grandValue = rows.reduce((s, r) => s + r.value, 0);

  const n = (v: number) => (v ? fmt(v) : "—");
  const q = (v: number) => (v ? fmtQty(v) : "—");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">📦 Барааны өртгийн тайлан</h1>
          <p className="mt-1 text-sm text-zinc-500">Бараа бүрийн одоогийн үлдэгдэл, нэгж өртөг (FIFO дундаж), нийт өртөг.</p>
        </div>
        <PrintButton />
      </div>

      <p className="mt-3 text-sm text-zinc-500">{rows.length} бараа · нийт өртөг {fmt(grandValue)}₮</p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Бараа</th>
              <th className="px-2 py-2 text-left">Нэгж</th>
              <th className="px-2 py-2 text-right">Үлдэгдэл</th>
              <th className="px-2 py-2 text-right">Нэгж өртөг</th>
              <th className="px-2 py-2 text-right">Нийт өртөг (₮)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {allCodes.map((code) => {
              const catRows = rows.filter((r) => r.item.category_code === code);
              if (catRows.length === 0) return null;
              const subVal = catRows.reduce((s, r) => s + r.value, 0);
              return (
                <CatBlock key={code} code={code} catRows={catRows} subVal={subVal} n={n} q={q} />
              );
            })}
            <tr className="border-t-2 border-zinc-300 bg-zinc-900 font-semibold text-white">
              <td colSpan={4} className="px-3 py-2">НИЙТ ДҮН</td>
              <td className="px-2 py-2 text-right tabular-nums">{n(grandValue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatBlock({
  code, catRows, subVal, n, q,
}: {
  code: string;
  catRows: { item: ItemRow; qty: number; unitCost: number; value: number }[];
  subVal: number; n: (v: number) => string; q: (v: number) => string;
}) {
  return (
    <>
      <tr className="bg-zinc-100">
        <td colSpan={5} className="px-3 py-1.5 font-semibold text-zinc-800">{code} — {categoryLabel(code)}</td>
      </tr>
      {catRows.map((r) => (
        <tr key={r.item.id} className="hover:bg-zinc-50">
          <td className="px-3 py-1.5 text-zinc-700"><span className="font-mono text-xs text-zinc-400">{r.item.sku ?? ""}</span> {r.item.name}</td>
          <td className="px-2 py-1.5 text-zinc-500">{r.item.unit}</td>
          <td className="px-2 py-1.5 text-right tabular-nums">{q(r.qty)}</td>
          <td className="px-2 py-1.5 text-right tabular-nums text-zinc-500">{n(r.unitCost)}</td>
          <td className="px-2 py-1.5 text-right tabular-nums font-medium">{n(r.value)}</td>
        </tr>
      ))}
      <tr className="bg-zinc-50 text-xs font-semibold text-zinc-600">
        <td colSpan={4} className="px-3 py-1.5 text-right">{categoryLabel(code)} — дүн:</td>
        <td className="px-2 py-1.5 text-right tabular-nums">{n(subVal)}</td>
      </tr>
    </>
  );
}
