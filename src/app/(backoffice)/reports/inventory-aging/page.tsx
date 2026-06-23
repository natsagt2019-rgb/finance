import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { CATEGORIES, categoryLabel, isInbound, fmt } from "@/lib/inventory-calc";
import { ITEM_SELECT, MOVE_SELECT, type ItemRow, type MoveRow } from "../../inventory/types";

export const metadata = { title: "Бараа материалын насжилтын тайлан" };

type SearchParams = { to?: string };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Насжилтын хуваарь (хоног).
const BUCKETS = [
  { label: "0–30", min: 0, max: 30 },
  { label: "31–60", min: 31, max: 60 },
  { label: "61–90", min: 61, max: 90 },
  { label: "91–180", min: 91, max: 180 },
  { label: "181–365", min: 181, max: 365 },
  { label: ">365", min: 366, max: Infinity },
];

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

type DatedLayer = { date: string; qty: number; cost: number };
// FIFO давхаргыг огноотойгоор бодно (насжилтад). Гаргалт урдаас хасна.
function fifoDatedLayers(moves: MoveRow[]): DatedLayer[] {
  const sorted = [...moves].sort((a, b) => (a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1));
  const layers: DatedLayer[] = [];
  for (const m of sorted) {
    const qty = Number(m.qty);
    if (qty <= 0) continue;
    if (isInbound(m.type)) {
      layers.push({ date: m.date.slice(0, 10), qty, cost: Number(m.unit_cost) });
    } else {
      let rem = qty;
      while (rem > 1e-9 && layers.length > 0) {
        const l = layers[0];
        if (l.qty <= rem + 1e-9) { rem -= l.qty; layers.shift(); }
        else { l.qty -= rem; rem = 0; }
      }
    }
  }
  return layers;
}

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000);
}

export default async function InventoryAgingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });
  const to = sp.to && ISO.test(sp.to) ? sp.to : today;

  const [items, moves] = await Promise.all([
    fetchAll<ItemRow>((f, t) => supabase.from("inv_items").select(ITEM_SELECT).eq("is_active", true).range(f, t)),
    fetchAll<MoveRow>((f, t) => supabase.from("inv_moves").select(MOVE_SELECT).lte("date", to).order("date", { ascending: true }).order("id", { ascending: true }).range(f, t)),
  ]);

  const byItem = new Map<number, MoveRow[]>();
  for (const m of moves) {
    const arr = byItem.get(m.item_id) ?? [];
    arr.push(m);
    byItem.set(m.item_id, arr);
  }

  type Row = { item: ItemRow; buckets: number[]; total: number };
  const rows: Row[] = [];
  for (const item of items) {
    const layers = fifoDatedLayers(byItem.get(item.id) ?? []);
    if (layers.length === 0) continue;
    const buckets = new Array(BUCKETS.length).fill(0);
    let total = 0;
    for (const l of layers) {
      const age = daysBetween(l.date, to);
      const val = l.qty * l.cost;
      const bi = BUCKETS.findIndex((b) => age >= b.min && age <= b.max);
      buckets[bi >= 0 ? bi : BUCKETS.length - 1] += val;
      total += val;
    }
    if (total > 0.005) rows.push({ item, buckets, total });
  }

  const knownCodes = CATEGORIES.map((c) => c.code);
  const allCodes = [...knownCodes, ...new Set(rows.map((r) => r.item.category_code).filter((c) => !knownCodes.includes(c)))]
    .filter((c) => rows.some((r) => r.item.category_code === c));

  const grand = new Array(BUCKETS.length).fill(0);
  let grandTotal = 0;
  for (const r of rows) { r.buckets.forEach((v, i) => (grand[i] += v)); grandTotal += r.total; }

  const n = (v: number) => (v ? fmt(v) : "—");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">📦 Бараа материалын насжилтын тайлан</h1>
          <p className="mt-1 text-sm text-zinc-500">Үлдэгдэл нөөцийг орлогын огнооноос хойших хоногоор насжуулсан (FIFO давхаргаар, өртгөөр).</p>
        </div>
        <PrintButton />
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3 print:hidden">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Огнооны байдлаар
          <input type="date" name="to" defaultValue={to} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">Харах</button>
      </form>

      <p className="mt-3 text-sm text-zinc-500">{to} · {rows.length} бараа · хоногоор (₮)</p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Бараа</th>
              {BUCKETS.map((b) => <th key={b.label} className="px-2 py-2 text-right">{b.label}</th>)}
              <th className="px-3 py-2 text-right">Нийт</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {allCodes.map((code) => {
              const catRows = rows.filter((r) => r.item.category_code === code);
              if (catRows.length === 0) return null;
              const sub = new Array(BUCKETS.length).fill(0); let subT = 0;
              for (const r of catRows) { r.buckets.forEach((v, i) => (sub[i] += v)); subT += r.total; }
              return (
                <CatBlock key={code} code={code} catRows={catRows} sub={sub} subT={subT} n={n} />
              );
            })}
            <tr className="border-t-2 border-zinc-300 bg-zinc-900 font-semibold text-white">
              <td className="px-3 py-2">НИЙТ ДҮН</td>
              {grand.map((v, i) => <td key={i} className="px-2 py-2 text-right tabular-nums">{n(v)}</td>)}
              <td className="px-3 py-2 text-right tabular-nums">{n(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatBlock({
  code, catRows, sub, subT, n,
}: {
  code: string;
  catRows: { item: ItemRow; buckets: number[]; total: number }[];
  sub: number[]; subT: number; n: (v: number) => string;
}) {
  return (
    <>
      <tr className="bg-zinc-100">
        <td colSpan={8} className="px-3 py-1.5 font-semibold text-zinc-800">{code} — {categoryLabel(code)}</td>
      </tr>
      {catRows.map((r) => (
        <tr key={r.item.id} className="hover:bg-zinc-50">
          <td className="px-3 py-1.5 text-zinc-700"><span className="font-mono text-xs text-zinc-400">{r.item.sku ?? ""}</span> {r.item.name}</td>
          {r.buckets.map((v, i) => <td key={i} className="px-2 py-1.5 text-right tabular-nums text-zinc-600">{n(v)}</td>)}
          <td className="px-3 py-1.5 text-right tabular-nums font-medium">{n(r.total)}</td>
        </tr>
      ))}
      <tr className="bg-zinc-50 text-xs font-semibold text-zinc-600">
        <td className="px-3 py-1.5 text-right">{categoryLabel(code)} — дүн:</td>
        {sub.map((v, i) => <td key={i} className="px-2 py-1.5 text-right tabular-nums">{n(v)}</td>)}
        <td className="px-3 py-1.5 text-right tabular-nums">{n(subT)}</td>
      </tr>
    </>
  );
}
