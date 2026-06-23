import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { computeFifo, fmt, fmtQty, type MoveLite } from "@/lib/inventory-calc";
import { ITEM_SELECT, type ItemRow } from "../../inventory/types";

export const metadata = { title: "Үлдэгдэл байршлаар" };

const MOVE_SEL = "id, date, type, qty, unit_cost, item_id, location_id";
type MRow = { id: number; date: string; type: MoveLite["type"]; qty: number; unit_cost: number; item_id: number; location_id: number | null };

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

export default async function InventoryByLocationPage() {
  const supabase = await createClient();

  const [items, moves, locs] = await Promise.all([
    fetchAll<ItemRow>((f, t) => supabase.from("inv_items").select(ITEM_SELECT).eq("is_active", true).range(f, t)),
    fetchAll<MRow>((f, t) => supabase.from("inv_moves").select(MOVE_SEL).order("date", { ascending: true }).order("id", { ascending: true }).range(f, t)),
    fetchAll<{ id: number; name: string }>((f, t) => supabase.from("inv_locations").select("id, name").range(f, t)),
  ]);

  const itemOf = new Map(items.map((i) => [i.id, i]));
  const locOf = new Map(locs.map((l) => [l.id, l.name]));

  // (location_id|item_id) → moves.
  const byKey = new Map<string, MRow[]>();
  for (const m of moves) {
    const k = `${m.location_id ?? 0}|${m.item_id}`;
    const arr = byKey.get(k) ?? [];
    arr.push(m);
    byKey.set(k, arr);
  }

  // location → [{item, qty, value}]
  type Line = { item: ItemRow | undefined; qty: number; value: number };
  const byLoc = new Map<number, Line[]>();
  for (const [k, ms] of byKey) {
    const [locStr, itemStr] = k.split("|");
    const f = computeFifo(ms.map((m) => ({ id: m.id, date: m.date.slice(0, 10), type: m.type, qty: m.qty, unit_cost: m.unit_cost })));
    if (f.qtyRemaining === 0 && f.valueRemaining === 0) continue;
    const locId = Number(locStr);
    const arr = byLoc.get(locId) ?? [];
    arr.push({ item: itemOf.get(Number(itemStr)), qty: f.qtyRemaining, value: f.valueRemaining });
    byLoc.set(locId, arr);
  }

  const locIds = [...byLoc.keys()].sort((a, b) => (locOf.get(a) ?? "Я").localeCompare(locOf.get(b) ?? "Я"));
  const grand = [...byLoc.values()].flat().reduce((s, l) => s + l.value, 0);
  const n = (v: number) => (v ? fmt(v) : "—");
  const q = (v: number) => (v ? fmtQty(v) : "—");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">📍 Үлдэгдэл байршлаар</h1>
          <p className="mt-1 text-sm text-zinc-500">Бараа материалын үлдэгдлийг агуулах/байршил бүрээр (FIFO өртгөөр).</p>
        </div>
        <PrintButton />
      </div>

      <p className="mt-3 text-sm text-zinc-500">{locIds.length} байршил · нийт өртөг {fmt(grand)}₮</p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Бараа</th>
              <th className="px-2 py-2 text-left">Нэгж</th>
              <th className="px-2 py-2 text-right">Үлдэгдэл</th>
              <th className="px-2 py-2 text-right">Өртөг (₮)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {locIds.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-zinc-400">Үлдэгдэлтэй байршил алга.</td></tr>
            ) : null}
            {locIds.map((locId) => {
              const lines = byLoc.get(locId)!.sort((a, b) => (a.item?.name ?? "").localeCompare(b.item?.name ?? ""));
              const sub = lines.reduce((s, l) => s + l.value, 0);
              const locName = locId === 0 ? "Байршил оноогоогүй" : locOf.get(locId) ?? `#${locId}`;
              return (
                <LocBlock key={locId} name={locName} count={lines.length} lines={lines} sub={sub} n={n} q={q} />
              );
            })}
            <tr className="border-t-2 border-zinc-300 bg-zinc-900 font-semibold text-white">
              <td colSpan={3} className="px-3 py-2">НИЙТ ДҮН</td>
              <td className="px-2 py-2 text-right tabular-nums">{n(grand)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LocBlock({
  name, count, lines, sub, n, q,
}: {
  name: string; count: number;
  lines: { item: ItemRow | undefined; qty: number; value: number }[];
  sub: number; n: (v: number) => string; q: (v: number) => string;
}) {
  return (
    <>
      <tr className="bg-zinc-100">
        <td colSpan={4} className="px-3 py-1.5 font-semibold text-zinc-800">📍 {name} ({count} бараа)</td>
      </tr>
      {lines.map((l, i) => (
        <tr key={i} className="hover:bg-zinc-50">
          <td className="px-3 py-1.5 text-zinc-700"><span className="font-mono text-xs text-zinc-400">{l.item?.sku ?? ""}</span> {l.item?.name ?? "—"}</td>
          <td className="px-2 py-1.5 text-zinc-500">{l.item?.unit ?? ""}</td>
          <td className="px-2 py-1.5 text-right tabular-nums">{q(l.qty)}</td>
          <td className="px-2 py-1.5 text-right tabular-nums font-medium">{n(l.value)}</td>
        </tr>
      ))}
      <tr className="bg-zinc-50 text-xs font-semibold text-zinc-600">
        <td colSpan={3} className="px-3 py-1.5 text-right">{name} — дүн:</td>
        <td className="px-2 py-1.5 text-right tabular-nums">{n(sub)}</td>
      </tr>
    </>
  );
}
