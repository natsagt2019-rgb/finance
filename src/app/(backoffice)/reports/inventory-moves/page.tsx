import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { fmt, fmtQty } from "@/lib/inventory-calc";
import {
  ITEM_SELECT, MOVE_SELECT, MOVE_TYPE_LABELS,
  type ItemRow, type MoveRow, type MoveType,
} from "../../inventory/types";

export const metadata = { title: "Бараа материалын хөдөлгөөний журнал" };

type SearchParams = { type?: string; from?: string; to?: string };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

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

const ALL_TYPES = Object.keys(MOVE_TYPE_LABELS) as MoveType[];

export default async function InventoryMovesReportPage({
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
  const type = ALL_TYPES.includes(sp.type as MoveType) ? (sp.type as MoveType) : "";

  const [items, moves, accs, parts] = await Promise.all([
    fetchAll<ItemRow>((f, t) =>
      supabase.from("inv_items").select(ITEM_SELECT).range(f, t)),
    fetchAll<MoveRow>((f, t) =>
      supabase.from("inv_moves").select(MOVE_SELECT)
        .gte("date", from).lte("date", to)
        .order("date", { ascending: true }).order("id", { ascending: true }).range(f, t)),
    fetchAll<{ id: number; code: string; name: string }>((f, t) =>
      supabase.from("accounts").select("id, code, name").range(f, t)),
    fetchAll<{ id: number; name: string }>((f, t) =>
      supabase.from("partners").select("id, name").range(f, t)),
  ]);

  const itemOf = new Map(items.map((i) => [i.id, i]));
  const accOf = new Map(accs.map((a) => [a.id, a]));
  const partOf = new Map(parts.map((p) => [p.id, p.name]));

  const filtered = type ? moves.filter((m) => m.type === type) : moves;

  // Төрлөөр бүлэглэж дэд дүн.
  const groups = new Map<MoveType, MoveRow[]>();
  for (const m of filtered) {
    const arr = groups.get(m.type) ?? [];
    arr.push(m);
    groups.set(m.type, arr);
  }
  const orderedTypes = ALL_TYPES.filter((t) => groups.has(t));

  const grandQty = filtered.reduce((s, m) => s + Number(m.qty), 0);
  const grandCost = filtered.reduce((s, m) => s + Number(m.total_cost), 0);
  const grandVat = filtered.reduce((s, m) => s + Number(m.vat_amount), 0);

  const n = (v: number) => (v ? fmt(v) : "—");
  const q = (v: number) => (v ? fmtQty(v) : "—");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">📦 Хөдөлгөөний журнал</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Бараа материалын орлого, зарлага болон бусад хөдөлгөөний дэлгэрэнгүй журнал.
          </p>
        </div>
        <PrintButton />
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3 print:hidden">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Төрөл
          <select name="type" defaultValue={type} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="">Бүгд</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>{MOVE_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Эхлэх
          <input type="date" name="from" defaultValue={from} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Дуусах
          <input type="date" name="to" defaultValue={to} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">Харах</button>
      </form>

      <p className="mt-3 text-sm text-zinc-500">{from} → {to} · {filtered.length} хөдөлгөөн</p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Огноо</th>
              <th className="px-2 py-2 text-left">Баримт</th>
              <th className="px-2 py-2 text-left">Бараа</th>
              <th className="px-2 py-2 text-left">Харилцагч</th>
              <th className="px-2 py-2 text-right">Тоо</th>
              <th className="px-2 py-2 text-right">Нэгж өртөг</th>
              <th className="px-2 py-2 text-right">Нийт өртөг</th>
              <th className="px-2 py-2 text-right">НӨАТ</th>
              <th className="px-2 py-2 text-left">Харьцах данс</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-zinc-400">Энэ хугацаанд хөдөлгөөн алга.</td></tr>
            ) : null}
            {orderedTypes.map((t) => {
              const rows = groups.get(t)!;
              const sq = rows.reduce((s, m) => s + Number(m.qty), 0);
              const sc = rows.reduce((s, m) => s + Number(m.total_cost), 0);
              const sv = rows.reduce((s, m) => s + Number(m.vat_amount), 0);
              return (
                <TypeBlock key={t} label={MOVE_TYPE_LABELS[t]} rows={rows} sq={sq} sc={sc} sv={sv}
                  itemOf={itemOf} accOf={accOf} partOf={partOf} n={n} q={q} showGroup={!type} />
              );
            })}
            <tr className="border-t-2 border-zinc-300 bg-zinc-900 font-semibold text-white">
              <td colSpan={4} className="px-3 py-2">НИЙТ ДҮН</td>
              <td className="px-2 py-2 text-right tabular-nums">{q(grandQty)}</td>
              <td></td>
              <td className="px-2 py-2 text-right tabular-nums">{n(grandCost)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{n(grandVat)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TypeBlock({
  label, rows, sq, sc, sv, itemOf, accOf, partOf, n, q, showGroup,
}: {
  label: string;
  rows: MoveRow[];
  sq: number; sc: number; sv: number;
  itemOf: Map<number, ItemRow>;
  accOf: Map<number, { code: string; name: string }>;
  partOf: Map<number, string>;
  n: (v: number) => string;
  q: (v: number) => string;
  showGroup: boolean;
}) {
  return (
    <>
      {showGroup ? (
        <tr className="bg-zinc-100">
          <td colSpan={9} className="px-3 py-1.5 font-semibold text-zinc-800">{label} ({rows.length})</td>
        </tr>
      ) : null}
      {rows.map((m) => {
        const it = itemOf.get(m.item_id);
        const acc = m.counter_account_id != null ? accOf.get(m.counter_account_id) : undefined;
        return (
          <tr key={m.id} className="hover:bg-zinc-50">
            <td className="whitespace-nowrap px-3 py-1.5 text-zinc-600">{m.date.slice(0, 10)}</td>
            <td className="px-2 py-1.5 text-zinc-500">{m.doc_no ?? ""}</td>
            <td className="px-2 py-1.5 text-zinc-700">
              <span className="font-mono text-xs text-zinc-400">{it?.sku ?? ""}</span> {it?.name ?? `#${m.item_id}`}
            </td>
            <td className="px-2 py-1.5 text-zinc-600">{m.partner_id != null ? partOf.get(m.partner_id) ?? "" : ""}</td>
            <td className="px-2 py-1.5 text-right tabular-nums">{q(Number(m.qty))}</td>
            <td className="px-2 py-1.5 text-right tabular-nums text-zinc-500">{n(Number(m.unit_cost))}</td>
            <td className="px-2 py-1.5 text-right tabular-nums">{n(Number(m.total_cost))}</td>
            <td className="px-2 py-1.5 text-right tabular-nums text-zinc-500">{n(Number(m.vat_amount))}</td>
            <td className="px-2 py-1.5 text-zinc-500">{acc ? `${acc.code} ${acc.name.slice(0, 18)}` : ""}</td>
          </tr>
        );
      })}
      <tr className="bg-zinc-50 text-xs font-semibold text-zinc-600">
        <td colSpan={4} className="px-3 py-1.5 text-right">{label} — дүн:</td>
        <td className="px-2 py-1.5 text-right tabular-nums">{q(sq)}</td>
        <td></td>
        <td className="px-2 py-1.5 text-right tabular-nums">{n(sc)}</td>
        <td className="px-2 py-1.5 text-right tabular-nums">{n(sv)}</td>
        <td></td>
      </tr>
    </>
  );
}
