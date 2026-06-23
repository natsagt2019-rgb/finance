import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { CATEGORIES, categoryLabel, computeFifo, fmt, fmtQty, type MoveLite } from "@/lib/inventory-calc";
import { ITEM_SELECT, MOVE_SELECT, type ItemRow, type MoveRow } from "../../inventory/types";

export const metadata = { title: "Бараа материалын товчоо тайлан" };

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

type InvSettings = { category_accounts: Record<string, number | null> | null };
type Acc = { id: number; code: string; name: string };

export default async function InventorySummaryPage() {
  const supabase = await createClient();

  const [items, moves, { data: setData }, accs] = await Promise.all([
    fetchAll<ItemRow>((f, t) => supabase.from("inv_items").select(ITEM_SELECT).eq("is_active", true).range(f, t)),
    fetchAll<MoveRow>((f, t) => supabase.from("inv_moves").select(MOVE_SELECT).order("date", { ascending: true }).order("id", { ascending: true }).range(f, t)),
    supabase.from("inv_settings").select("category_accounts").eq("id", 1).maybeSingle(),
    fetchAll<Acc>((f, t) => supabase.from("accounts").select("id, code, name").range(f, t)),
  ]);

  const accOf = new Map(accs.map((a) => [a.id, a]));
  const catAcc = ((setData as InvSettings | null)?.category_accounts) ?? {};

  const byItem = new Map<number, MoveLite[]>();
  for (const m of moves) {
    const arr = byItem.get(m.item_id) ?? [];
    arr.push({ id: m.id, date: m.date.slice(0, 10), type: m.type, qty: m.qty, unit_cost: m.unit_cost });
    byItem.set(m.item_id, arr);
  }

  // Ангилал → {барааны тоо, нийт тоо хэмжээ, нийт өртөг}.
  type Agg = { items: number; qty: number; value: number };
  const agg = new Map<string, Agg>();
  for (const item of items) {
    const f = computeFifo(byItem.get(item.id) ?? []);
    const a = agg.get(item.category_code) ?? { items: 0, qty: 0, value: 0 };
    if (f.qtyRemaining !== 0 || f.valueRemaining !== 0) {
      a.items += 1;
      a.qty += f.qtyRemaining;
      a.value += f.valueRemaining;
    }
    agg.set(item.category_code, a);
  }

  const knownCodes = CATEGORIES.map((c) => c.code);
  const otherCodes = [...agg.keys()].filter((c) => !knownCodes.includes(c));
  const order = [...knownCodes, ...otherCodes].filter((c) => agg.has(c));

  const grand = [...agg.values()].reduce((g, a) => ({ items: g.items + a.items, qty: g.qty + a.qty, value: g.value + a.value }), { items: 0, qty: 0, value: 0 });

  const n = (v: number) => (v ? fmt(v) : "—");
  const q = (v: number) => (v ? fmtQty(v) : "—");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">📦 Бараа материалын товчоо тайлан</h1>
          <p className="mt-1 text-sm text-zinc-500">Ангиллаар нэгтгэсэн одоогийн үлдэгдэл (тоо, өртөг) ба харгалзах GL данс. FIFO өртгөөр.</p>
        </div>
        <PrintButton />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Ангилал</th>
              <th className="px-3 py-2 text-left">GL данс</th>
              <th className="px-3 py-2 text-right">Барааны тоо</th>
              <th className="px-3 py-2 text-right">Нийт тоо хэмжээ</th>
              <th className="px-3 py-2 text-right">Нийт өртөг (₮)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {order.map((code) => {
              const a = agg.get(code)!;
              const acc = catAcc[code] != null ? accOf.get(Number(catAcc[code])) : undefined;
              return (
                <tr key={code} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 text-zinc-700"><span className="font-mono text-xs text-zinc-400">{code}</span> {categoryLabel(code)}</td>
                  <td className="px-3 py-2 text-zinc-500">{acc ? `${acc.code} ${acc.name.slice(0, 22)}` : "— тохируулаагүй —"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-600">{a.items || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{q(a.qty)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{n(a.value)}</td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-zinc-300 bg-zinc-900 font-semibold text-white">
              <td colSpan={2} className="px-3 py-2">НИЙТ ДҮН</td>
              <td className="px-3 py-2 text-right tabular-nums">{grand.items}</td>
              <td className="px-3 py-2 text-right tabular-nums">{q(grand.qty)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{n(grand.value)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
