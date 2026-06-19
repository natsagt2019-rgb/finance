import * as xlsx from "xlsx";
import { createClient } from "@/lib/supabase/server";

// Үндсэн хөрөнгийн картыг бөөнөөр оруулах Excel загвар. Эхний хуудас — оруулах
// мөрүүд (нэг мөр = нэг хөрөнгө), хоёрдугаар хуудас — байгаа ангиллын лавлах.
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("asset_categories")
    .select("name, account_code")
    .eq("is_active", true)
    .order("name")
    .limit(2000);
  const cats = (data as { name: string; account_code: string | null }[] | null) ?? [];

  const header = [
    "Нэр",
    "Ангилал",
    "Орсон огноо",
    "Анхны өртөг",
    "Хуримтлагдсан элэгдэл",
    "Эхний үлдэгдлийн огноо",
    "Ашиглалт (жил)",
    "Үлдэгдэл өртөг",
    "Байршил",
    "Хариуцагч",
  ];
  const example = [
    "Toyota Land Cruiser 200",
    cats[0]?.name ?? "Тээврийн хэрэгсэл",
    "2023-01-15",
    120000000,
    18000000,
    "2025-12-31",
    10,
    0,
    "Төв оффис",
    "",
  ];

  const ws = xlsx.utils.aoa_to_sheet([header, example]);
  ws["!cols"] = [
    { wch: 28 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 18 },
    { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
  ];
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Хөрөнгө");

  // Лавлах хуудас — ангиллын нэрсийг яг хуулж бичнэ.
  const refRows: (string | null)[][] = [
    ["Ангиллын нэр (яг хуулж бичнэ)", "Хөрөнгийн данс"],
    ...cats.map((c) => [c.name, c.account_code ?? ""]),
  ];
  const refWs = xlsx.utils.aoa_to_sheet(refRows);
  refWs["!cols"] = [{ wch: 30 }, { wch: 16 }];
  xlsx.utils.book_append_sheet(wb, refWs, "Ангиллууд");

  const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="hurungu-zagvar.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
