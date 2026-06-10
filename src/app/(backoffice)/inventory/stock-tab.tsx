import {
  CATEGORIES,
  computeFifo,
  fmt,
  fmtQty,
  type MoveLite,
} from "@/lib/inventory-calc";
import { StockToolbar, type StockExportRow } from "./stock-toolbar";
import type { ItemRow, MoveRow } from "./types";

type StockLine = {
  item: ItemRow;
  qty: number;
  value: number;
  unitCost: number;
};

export function StockTab({
  items,
  moves,
  fileLabel,
}: {
  items: ItemRow[];
  moves: MoveRow[];
  fileLabel: string;
}) {
  const byItem = new Map<number, MoveLite[]>();
  for (const m of moves) {
    const arr = byItem.get(m.item_id) ?? [];
    arr.push({ id: m.id, date: m.date, type: m.type, qty: m.qty, unit_cost: m.unit_cost });
    byItem.set(m.item_id, arr);
  }

  const lines: StockLine[] = items.map((item) => {
    const f = computeFifo(byItem.get(item.id) ?? []);
    return {
      item,
      qty: f.qtyRemaining,
      value: f.valueRemaining,
      unitCost: f.qtyRemaining > 0 ? f.valueRemaining / f.qtyRemaining : 0,
    };
  });

  const grandTotal = lines.reduce((s, l) => s + l.value, 0);

  // Excel export мөрүүд (ангиллын дарааллаар).
  const exportRows: StockExportRow[] = CATEGORIES.flatMap((cat) =>
    lines
      .filter((l) => l.item.category_code === cat.code)
      .map((l) => ({
        category: cat.label,
        name: l.item.name,
        unit: l.item.unit,
        qty: Math.round(l.qty * 1000) / 1000,
        unitCost: Math.round(l.unitCost),
        value: Math.round(l.value),
      })),
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Нийт үлдэгдлийн өртөг:{" "}
          <span className="font-semibold text-zinc-900">{fmt(grandTotal)}₮</span>
        </p>
        <div className="no-print">
          <StockToolbar rows={exportRows} fileLabel={fileLabel} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-2">Бараа</th>
              <th className="px-4 py-2">Нэгж</th>
              <th className="px-4 py-2 text-right">Үлдэгдэл</th>
              <th className="px-4 py-2 text-right">Дундаж өртөг</th>
              <th className="px-4 py-2 text-right">Нийт өртөг</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {CATEGORIES.map((cat) => {
              const catLines = lines.filter((l) => l.item.category_code === cat.code);
              if (catLines.length === 0) return null;
              const catValue = catLines.reduce((s, l) => s + l.value, 0);
              return (
                <CategoryGroup key={cat.code} label={cat.label} lines={catLines} value={catValue} />
              );
            })}
            {lines.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                  Бараа бүртгэгдээгүй байна.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm font-semibold">
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right text-zinc-500">
                Нийт дүн:
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-zinc-900">
                {fmt(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function CategoryGroup({
  label,
  lines,
  value,
}: {
  label: string;
  lines: StockLine[];
  value: number;
}) {
  return (
    <>
      <tr className="bg-zinc-50/60">
        <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </td>
        <td className="px-4 py-1.5 text-right text-xs font-semibold tabular-nums text-zinc-500">
          {fmt(value)}
        </td>
      </tr>
      {lines.map((l) => (
        <tr key={l.item.id} className="hover:bg-zinc-50">
          <td className="px-4 py-2 font-medium text-zinc-800">
            {l.item.name}
            {l.item.sku && <span className="ml-1 text-xs text-zinc-400">{l.item.sku}</span>}
          </td>
          <td className="px-4 py-2 text-zinc-500">{l.item.unit}</td>
          <td className="px-4 py-2 text-right tabular-nums text-zinc-800">
            {fmtQty(l.qty)}
          </td>
          <td className="px-4 py-2 text-right tabular-nums text-zinc-500">
            {fmt(l.unitCost)}
          </td>
          <td className="px-4 py-2 text-right tabular-nums text-zinc-900">
            {fmt(l.value)}
          </td>
        </tr>
      ))}
    </>
  );
}
