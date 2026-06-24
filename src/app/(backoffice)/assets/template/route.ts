import * as xlsx from "xlsx";
import { createClient } from "@/lib/supabase/server";

// Үндсэн хөрөнгийг бөөнөөр оруулах Excel загвар. Эхний хуудас — оруулах мөрүүд
// (нэг мөр = нэг хөрөнгө), нэмэлт хуудсууд — ангилал ба байршлын лавлах.
export async function GET() {
  const supabase = await createClient();
  const [{ data: catData }, { data: locData }] = await Promise.all([
    supabase.from("asset_categories").select("name, account_code").eq("is_active", true).order("name").limit(2000),
    supabase.from("asset_locations").select("code, name").eq("is_active", true).order("code").limit(2000),
  ]);
  const cats = (catData as { name: string; account_code: string | null }[] | null) ?? [];
  const locs = (locData as { code: string | null; name: string }[] | null) ?? [];

  const header = [
    "Нэр",
    "Карт / код",
    "Баар код",
    "Ангилал",
    "Компани",
    "Орсон огноо",
    "Анхны өртөг",
    "Үлдэгдэл өртөг",
    "Ашиглах хугацаа (жил)",
    "Байршил",
    "Эд хариуцагч",
  ];
  const example = [
    "Toyota Land Cruiser 200",
    "ҮХ-0001",
    "8801234567890",
    cats[0]?.name ?? "Тээврийн хэрэгсэл",
    "",
    "2024-03-15",
    120000000,
    0,
    10,
    locs[0]?.name ?? "Ашиглалт",
    "Б. Бат",
  ];

  const ws = xlsx.utils.aoa_to_sheet([header, example]);
  ws["!cols"] = [
    { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 14 },
    { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
  ];
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Хөрөнгө");

  const catWs = xlsx.utils.aoa_to_sheet([
    ["Ангиллын нэр (яг хуулж бичнэ)", "Хөрөнгийн данс"],
    ...cats.map((c) => [c.name, c.account_code ?? ""]),
  ]);
  catWs["!cols"] = [{ wch: 32 }, { wch: 16 }];
  xlsx.utils.book_append_sheet(wb, catWs, "Ангиллууд");

  const locWs = xlsx.utils.aoa_to_sheet([
    ["Байршлын нэр (яг хуулж бичнэ)", "Код"],
    ...locs.map((l) => [l.name, l.code ?? ""]),
  ]);
  locWs["!cols"] = [{ wch: 28 }, { wch: 10 }];
  xlsx.utils.book_append_sheet(wb, locWs, "Байршлууд");

  const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="hurungu-burtgel-zagvar.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
