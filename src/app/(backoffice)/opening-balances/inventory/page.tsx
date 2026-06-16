import { createClient } from "@/lib/supabase/server";
import { computeFifo, categoryLabel, type MoveLite } from "@/lib/inventory-calc";
import { OpeningTabs } from "../opening-tabs";
import { SyncButton } from "../sync-button";
import {
  OPENING_SOURCES,
  OPENING_YEARS,
  fmtMoney,
  grandOpeningBalance,
  openDateFor,
  resolveYear,
} from "../shared";
import { syncInventoryOpening } from "./actions";

type SearchParams = { year?: string };

export default async function OpeningInventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const year = resolveYear(sp.year);
  const openDate = openDateFor(year);

  const [{ data: itemRows }, { data: moveRows }, { count: syncedCount }, balance] =
    await Promise.all([
      supabase
        .from("inv_items")
        .select("id, name, category_code")
        .eq("is_active", true)
        .limit(10000),
      supabase
        .from("inv_moves")
        .select("item_id, date, type, qty, unit_cost")
        .lte("date", openDate)
        .limit(100000),
      supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("is_opening", true)
        .eq("txn_date", openDate)
        .eq("source", OPENING_SOURCES.inventory),
      grandOpeningBalance(openDate),
    ]);

  const items =
    (itemRows as { id: number; name: string; category_code: string }[] | null) ?? [];

  const movesByItem = new Map<number, MoveLite[]>();
  for (const m of (moveRows as
    | { item_id: number; date: string; type: MoveLite["type"]; qty: number; unit_cost: number }[]
    | null) ?? []) {
    const arr = movesByItem.get(m.item_id) ?? [];
    arr.push({
      id: arr.length + 1,
      date: m.date,
      type: m.type,
      qty: Number(m.qty) || 0,
      unit_cost: Number(m.unit_cost) || 0,
    });
    movesByItem.set(m.item_id, arr);
  }

  type Row = { name: string; category: string; qty: number; value: number };
  const rows: Row[] = [];
  let totValue = 0;
  for (const it of items) {
    const moves = movesByItem.get(it.id) ?? [];
    const { qtyRemaining, valueRemaining } = computeFifo(moves);
    if (qtyRemaining < 1e-6 && valueRemaining < 0.005) continue;
    rows.push({
      name: it.name,
      category: categoryLabel(it.category_code),
      qty: qtyRemaining,
      value: valueRemaining,
    });
    totValue += valueRemaining;
  }
  rows.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  const hasData = rows.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">
        Барааны / хангамжийн эхний үлдэгдэл
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        «Бараа материал» модулийн {openDate} огноо хүртэлх FIFO үлдэгдлийг (тоо
        хэмжээ × өртөг) тооцож, бараа материалын данс руу Дт болгон журналд тусгана.
      </p>

      <div className="mt-5">
        <OpeningTabs year={year} years={OPENING_YEARS} balance={balance} />
      </div>

      {!hasData ? (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          {openDate} огноогоор үлдэгдэлтэй бараа олдсонгүй. «Бараа материал» цэсэд
          орлого бүртгэх эсвэл схемээ deploy хийнэ үү.
        </div>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Ангилал</th>
                  <th className="px-3 py-2">Бараа</th>
                  <th className="px-3 py-2 text-right">Үлдэгдэл (тоо)</th>
                  <th className="px-3 py-2 text-right">Өртөг (Дт)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 text-xs text-zinc-500">{r.category}</td>
                    <td className="px-3 py-1.5 text-zinc-700">{r.name}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-zinc-500">
                      {r.qty.toLocaleString("en-US")}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-zinc-700">
                      {fmtMoney(r.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold text-zinc-800">
                  <td className="px-3 py-2" colSpan={3}>
                    НИЙТ ӨРТӨГ
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(totValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4">
            <SyncButton
              action={syncInventoryOpening.bind(null, year)}
              label="Журналд тусгах"
            />
            <p className="mt-2 text-xs text-zinc-400">
              {syncedCount
                ? `Одоо ${openDate} огноогоор журналд тусгасан байна. Дахин дарвал шинэчилнэ.`
                : `${openDate} огноогоор хараахан тусгаагүй.`}{" "}
              Ангилал → данс холболтыг «Бараа материал» → тохиргооноос авна.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
