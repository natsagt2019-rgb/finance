import { computeFifo, categoryLabel, fmt, fmtQty, type MoveLite } from "@/lib/inventory-calc";
import { RowActions } from "./row-actions";
import type { ItemRow, MoveRow } from "./types";

export function ItemsTab({ items, moves }: { items: ItemRow[]; moves: MoveRow[] }) {
  // Бараа бүрийн одоогийн үлдэгдэл (FIFO).
  const byItem = new Map<number, MoveLite[]>();
  for (const m of moves) {
    const arr = byItem.get(m.item_id) ?? [];
    arr.push({ id: m.id, date: m.date, type: m.type, qty: m.qty, unit_cost: m.unit_cost });
    byItem.set(m.item_id, arr);
  }
  const stock = new Map<number, { qty: number; value: number }>();
  for (const it of items) {
    const f = computeFifo(byItem.get(it.id) ?? []);
    stock.set(it.id, { qty: f.qtyRemaining, value: f.valueRemaining });
  }

  const totalValue = items.reduce((s, it) => s + (stock.get(it.id)?.value ?? 0), 0);
  const lowCount = items.filter(
    (it) => (stock.get(it.id)?.qty ?? 0) <= Number(it.reorder_point) && Number(it.reorder_point) > 0,
  ).length;

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Барааны нэр төрөл
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-blue-900">
            {items.length}
          </p>
        </div>
        <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-green-600">
            Нийт үлдэгдлийн өртөг
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-green-900">
            {fmt(totalValue)}₮
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
            Нөөц багассан
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-amber-900">
            {lowCount}
          </p>
          <p className="mt-1 text-xs text-amber-600">доод нөөцөөс доош</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white">
        {items.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            Бараа бүртгэгдээгүй байна.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2">№</th>
                  <th className="px-4 py-2">Код</th>
                  <th className="px-4 py-2">Нэр</th>
                  <th className="px-4 py-2">Ангилал</th>
                  <th className="px-4 py-2">Нэгж</th>
                  <th className="px-4 py-2 text-right">Үлдэгдэл</th>
                  <th className="px-4 py-2 text-right">Өртөг</th>
                  <th className="px-4 py-2 text-right">Доод нөөц</th>
                  <th className="no-print px-4 py-2 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((it, i) => {
                  const s = stock.get(it.id) ?? { qty: 0, value: 0 };
                  const low =
                    Number(it.reorder_point) > 0 && s.qty <= Number(it.reorder_point);
                  return (
                    <tr key={it.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-2 text-zinc-400">{i + 1}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                        {it.sku || "—"}
                      </td>
                      <td className="px-4 py-2 font-medium text-zinc-800">{it.name}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                        {categoryLabel(it.category_code)}
                      </td>
                      <td className="px-4 py-2 text-zinc-500">{it.unit}</td>
                      <td
                        className={`whitespace-nowrap px-4 py-2 text-right tabular-nums ${
                          low ? "font-semibold text-amber-700" : "text-zinc-800"
                        }`}
                      >
                        {fmtQty(s.qty)}
                        {low && <span className="ml-1" title="Нөөц багассан">⚠</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-zinc-800">
                        {fmt(s.value)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-zinc-400">
                        {fmtQty(Number(it.reorder_point))}
                      </td>
                      <td className="no-print whitespace-nowrap px-4 py-2 text-right">
                        <RowActions id={it.id} label={it.name} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
