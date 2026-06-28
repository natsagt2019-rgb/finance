import * as xlsx from "xlsx";

import { createClient } from "@/lib/supabase/server";
import { ITEM_SELECT, type ItemRow } from "../../types";

// Гаалийн өртөг тооцоонд олон бараа оруулах Excel загвар.
//   1-р хуудас — оруулах мөрүүд (нэг мөр = нэг бараа).
//   2-р хуудас — барааны лавлах (SKU/нэр/нэгж).
export async function GET() {
  const supabase = await createClient();
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

  const header = ["Код / SKU", "Барааны нэр", "Тоо хэмжээ", "FOB нэгж үнэ (валют)"];
  const example = [items[0]?.sku ?? "CN-001", items[0]?.name ?? "Жишээ бараа", 100, 12.5];
  const ws = xlsx.utils.aoa_to_sheet([header, example]);
  ws["!cols"] = [{ wch: 16 }, { wch: 34 }, { wch: 12 }, { wch: 18 }];
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Импорт");

  const refWs = xlsx.utils.aoa_to_sheet([
    ["Код / SKU", "Барааны нэр", "Нэгж"],
    ...items.map((i) => [i.sku ?? "", i.name, i.unit]),
  ]);
  refWs["!cols"] = [{ wch: 16 }, { wch: 34 }, { wch: 8 }];
  xlsx.utils.book_append_sheet(wb, refWs, "Барааны лавлах");

  const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="gaaliin-ortog-zagvar.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
