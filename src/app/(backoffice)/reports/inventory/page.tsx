import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import {
  CATEGORIES,
  categoryLabel,
  computeFifo,
  isInbound,
  fmt,
  fmtQty,
  type MoveLite,
} from "@/lib/inventory-calc";
import { ITEM_SELECT, MOVE_SELECT, type ItemRow, type MoveRow } from "../../inventory/types";

export const metadata = { title: "Бараа материалын тайлан" };

type SearchParams = { company?: string; from?: string; to?: string };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

// PostgREST max-rows (≈1000)-ийг тойрч бүх мөрийг хуудаслаж татна.
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

type Line = {
  item: ItemRow;
  openQty: number; openVal: number;
  inQty: number; inVal: number;
  outQty: number; outVal: number;
  closeQty: number; closeVal: number;
};

export default async function InventoryReportPage({
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
  const company = (sp.company ?? "").trim();

  const [allItems, allMoves] = await Promise.all([
    fetchAll<ItemRow>((f, t) =>
      supabase.from("inv_items").select(ITEM_SELECT).eq("is_active", true)
        .order("category_code", { ascending: true }).order("name", { ascending: true }).range(f, t)),
    fetchAll<MoveRow>((f, t) =>
      supabase.from("inv_moves").select(MOVE_SELECT)
        .order("date", { ascending: true }).order("id", { ascending: true }).range(f, t)),
  ]);

  const items = company ? allItems.filter((i) => i.company === company) : allItems;

  // Бараа бүрээр хөдөлгөөнийг бүлэглэнэ.
  const byItem = new Map<number, MoveRow[]>();
  for (const m of allMoves) {
    const arr = byItem.get(m.item_id) ?? [];
    arr.push(m);
    byItem.set(m.item_id, arr);
  }
  const lite = (m: MoveRow): MoveLite => ({ id: m.id, date: m.date.slice(0, 10), type: m.type, qty: m.qty, unit_cost: m.unit_cost });

  const lines: Line[] = items.map((item) => {
    const ms = byItem.get(item.id) ?? [];
    const before = ms.filter((m) => m.date.slice(0, 10) < from);
    const upto = ms.filter((m) => m.date.slice(0, 10) <= to);
    const inP = ms.filter((m) => { const d = m.date.slice(0, 10); return d >= from && d <= to; });
    const open = computeFifo(before.map(lite));
    const close = computeFifo(upto.map(lite));
    let inQty = 0, inVal = 0, outQty = 0, outVal = 0;
    for (const m of inP) {
      if (isInbound(m.type)) { inQty += Number(m.qty); inVal += Number(m.total_cost); }
      else { outQty += Number(m.qty); outVal += Number(m.total_cost); }
    }
    return {
      item,
      openQty: open.qtyRemaining, openVal: open.valueRemaining,
      inQty, inVal, outQty, outVal,
      closeQty: close.qtyRemaining, closeVal: close.valueRemaining,
    };
  }).filter((l) => l.openQty !== 0 || l.inQty !== 0 || l.outQty !== 0 || l.closeQty !== 0);

  const grand = lines.reduce((g, l) => ({
    openVal: g.openVal + l.openVal, inVal: g.inVal + l.inVal, outVal: g.outVal + l.outVal, closeVal: g.closeVal + l.closeVal,
  }), { openVal: 0, inVal: 0, outVal: 0, closeVal: 0 });

  const num = (n: number) => (n ? fmt(n) : "—");
  const qty = (n: number) => (n ? fmtQty(n) : "—");
  const cats = CATEGORIES.filter((cat) => lines.some((l) => l.item.category_code === cat.code));
  const otherCats = [...new Set(lines.map((l) => l.item.category_code).filter((c) => !CATEGORIES.some((x) => x.code === c)))];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">📦 Бараа материалын тайлан</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Хугацааны хөдөлгөөн: эхний үлдэгдэл + орлого − зарлага (ББӨ) = эцсийн үлдэгдэл. FIFO өртгөөр.
          </p>
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

      <p className="mt-3 text-sm text-zinc-500">{from} → {to} · MNT · {lines.length} бараа</p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th rowSpan={2} className="px-3 py-2 text-left">Бараа</th>
              <th rowSpan={2} className="px-2 py-2 text-left">Нэгж</th>
              <th colSpan={2} className="px-2 py-2 text-center border-l">Эхний үлдэгдэл</th>
              <th colSpan={2} className="px-2 py-2 text-center border-l">Орлого</th>
              <th colSpan={2} className="px-2 py-2 text-center border-l">Зарлага (ББӨ)</th>
              <th colSpan={2} className="px-2 py-2 text-center border-l">Эцсийн үлдэгдэл</th>
            </tr>
            <tr>
              {["Тоо", "Өртөг", "Тоо", "Өртөг", "Тоо", "Өртөг", "Тоо", "Өртөг"].map((h, i) => (
                <th key={i} className={`px-2 py-1 text-right ${i % 2 === 0 ? "border-l" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {[...cats.map((c) => c.code), ...otherCats].map((catCode) => {
              const catLines = lines.filter((l) => l.item.category_code === catCode);
              if (catLines.length === 0) return null;
              const sub = catLines.reduce((g, l) => ({
                openVal: g.openVal + l.openVal, inVal: g.inVal + l.inVal, outVal: g.outVal + l.outVal, closeVal: g.closeVal + l.closeVal,
              }), { openVal: 0, inVal: 0, outVal: 0, closeVal: 0 });
              return (
                <CategoryBlock key={catCode} code={catCode} catLines={catLines} sub={sub} num={num} qty={qty} />
              );
            })}
            <tr className="border-t-2 border-zinc-300 bg-zinc-900 font-semibold text-white">
              <td colSpan={3} className="px-3 py-2">НИЙТ ДҮН</td>
              <td className="px-2 py-2 text-right tabular-nums">{num(grand.openVal)}</td>
              <td className="px-2 py-2"></td>
              <td className="px-2 py-2 text-right tabular-nums">{num(grand.inVal)}</td>
              <td className="px-2 py-2"></td>
              <td className="px-2 py-2 text-right tabular-nums">{num(grand.outVal)}</td>
              <td className="px-2 py-2"></td>
              <td className="px-2 py-2 text-right tabular-nums">{num(grand.closeVal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryBlock({
  code, catLines, sub, num, qty,
}: {
  code: string;
  catLines: Line[];
  sub: { openVal: number; inVal: number; outVal: number; closeVal: number };
  num: (n: number) => string;
  qty: (n: number) => string;
}) {
  return (
    <>
      <tr className="bg-zinc-100">
        <td colSpan={10} className="px-3 py-1.5 font-semibold text-zinc-800">
          {code} — {categoryLabel(code)}
        </td>
      </tr>
      {catLines.map((l) => (
        <tr key={l.item.id} className="hover:bg-zinc-50">
          <td className="px-3 py-1.5 text-zinc-700">
            <span className="font-mono text-xs text-zinc-400">{l.item.sku ?? ""}</span> {l.item.name}
          </td>
          <td className="px-2 py-1.5 text-zinc-500">{l.item.unit}</td>
          <td className="px-2 py-1.5 text-right tabular-nums border-l">{qty(l.openQty)}</td>
          <td className="px-2 py-1.5 text-right tabular-nums text-zinc-600">{num(l.openVal)}</td>
          <td className="px-2 py-1.5 text-right tabular-nums border-l text-green-700">{qty(l.inQty)}</td>
          <td className="px-2 py-1.5 text-right tabular-nums text-green-700">{num(l.inVal)}</td>
          <td className="px-2 py-1.5 text-right tabular-nums border-l text-red-700">{qty(l.outQty)}</td>
          <td className="px-2 py-1.5 text-right tabular-nums text-red-700">{num(l.outVal)}</td>
          <td className="px-2 py-1.5 text-right tabular-nums border-l font-medium">{qty(l.closeQty)}</td>
          <td className="px-2 py-1.5 text-right tabular-nums font-medium">{num(l.closeVal)}</td>
        </tr>
      ))}
      <tr className="bg-zinc-50 text-xs font-semibold text-zinc-600">
        <td colSpan={3} className="px-3 py-1.5 text-right">{categoryLabel(code)} — дүн:</td>
        <td className="px-2 py-1.5 text-right tabular-nums">{num(sub.openVal)}</td>
        <td></td>
        <td className="px-2 py-1.5 text-right tabular-nums">{num(sub.inVal)}</td>
        <td></td>
        <td className="px-2 py-1.5 text-right tabular-nums">{num(sub.outVal)}</td>
        <td></td>
        <td className="px-2 py-1.5 text-right tabular-nums">{num(sub.closeVal)}</td>
      </tr>
    </>
  );
}
