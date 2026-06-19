import * as xlsx from "xlsx";
import { CATEGORIES } from "@/lib/inventory-calc";

// Барааны нээлтийн нөөцийг бөөнөөр оруулах Excel загвар. Нэг мөр = нэг бараа
// (нэр, ангилал, нэгж, эхний тоо, нэгж өртөг). Хоёрдугаар хуудас — ангилал лавлах.
export function GET() {
  const header = [
    "Нэр",
    "Ангилал",
    "Нэгж",
    "SKU",
    "Эхний тоо",
    "Нэгж өртөг",
    "Огноо",
  ];
  const example = ["Дизель түлш", "Шатахуун, тосолгоо", "л", "", 1500, 3200, "2025-12-31"];

  const ws = xlsx.utils.aoa_to_sheet([header, example]);
  ws["!cols"] = [
    { wch: 26 }, { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
  ];
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Бараа");

  const refRows: string[][] = [
    ["Ангиллын нэр (яг хуулж бичнэ)", "Код"],
    ...CATEGORIES.map((c) => [c.label, c.code]),
  ];
  const refWs = xlsx.utils.aoa_to_sheet(refRows);
  refWs["!cols"] = [{ wch: 26 }, { wch: 12 }];
  xlsx.utils.book_append_sheet(wb, refWs, "Ангиллууд");

  const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="baraa-zagvar.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
