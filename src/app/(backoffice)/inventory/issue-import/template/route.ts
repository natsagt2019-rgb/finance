import * as xlsx from "xlsx";

import { createClient } from "@/lib/supabase/server";
import { computeFifo, type MoveLite } from "@/lib/inventory-calc";
import { ITEM_SELECT, type ItemRow } from "../../types";

// Бараа материалын ЗАРЛАГЫГ бөөнөөр оруулах Excel загвар.
//   1-р хуудас — оруулах мөрүүд (нэг мөр = нэг барааны зарлага).
//   2-р хуудас — барааны лавлах (SKU/нэр/нэгж/одоогийн үлдэгдэл).
export async function GET() {
  const supabase = await createClient();

  // Бараа + одоогийн үлдэгдэл (лавлах хуудсанд харуулна).
  const items: ItemRow[] = [];
  for (let off = 0; off < 100000; off += 1000) {
    const { data } = await supabase
      .from("inv_items")
      .select(ITEM_SELECT)
      .eq("is_active", true)
      .order("name")
      .range(off, off + 999);
    const page = (data as ItemRow[] | null) ?? [];
    items.push(...page);
    if (page.length < 1000) break;
  }

  // Үлдэгдэл (бараа бүрийн нийт тоо хэмжээ).
  const balByItem = new Map<number, number>();
  if (items.length) {
    const ids = items.map((i) => i.id);
    const moves: MoveLite[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      const grp = ids.slice(i, i + 200);
      const { data } = await supabase
        .from("inv_moves")
        .select("id, item_id, date, type, qty, unit_cost")
        .in("item_id", grp)
        .limit(50000);
      for (const m of (data as (MoveLite & { item_id: number })[] | null) ?? []) {
        (moves as (MoveLite & { item_id: number })[]).push(m);
      }
    }
    const byItem = new Map<number, MoveLite[]>();
    for (const m of moves as (MoveLite & { item_id: number })[]) {
      (byItem.get(m.item_id) ?? byItem.set(m.item_id, []).get(m.item_id)!).push(m);
    }
    for (const [id, ms] of byItem) balByItem.set(id, computeFifo(ms).qtyRemaining);
  }

  // 1-р хуудас: оруулах загвар.
  const header = ["Код / SKU", "Барааны нэр", "Тоо хэмжээ", "Огноо (заавал биш)", "Тэмдэглэл"];
  const example = [
    items[0]?.sku ?? "T-001",
    items[0]?.name ?? "Жишээ бараа",
    10,
    "",
    "Үйлдвэрлэлд зарцуулав",
  ];
  const ws = xlsx.utils.aoa_to_sheet([header, example]);
  ws["!cols"] = [{ wch: 16 }, { wch: 32 }, { wch: 12 }, { wch: 18 }, { wch: 28 }];
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Зарлага");

  // 2-р хуудас: барааны лавлах.
  const refWs = xlsx.utils.aoa_to_sheet([
    ["Код / SKU", "Барааны нэр", "Нэгж", "Одоогийн үлдэгдэл"],
    ...items.map((i) => [i.sku ?? "", i.name, i.unit, Math.round((balByItem.get(i.id) ?? 0) * 1000) / 1000]),
  ]);
  refWs["!cols"] = [{ wch: 16 }, { wch: 34 }, { wch: 8 }, { wch: 16 }];
  xlsx.utils.book_append_sheet(wb, refWs, "Барааны лавлах");

  const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="bm-zarlaga-zagvar.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
