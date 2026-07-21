import * as xlsx from "xlsx";

// Тухайн сарын цалинг бөөнөөр оруулах Excel загвар.
// Нэг мөр = нэг ажилтан. Регистрээр ажилтантай тааруулна.
export async function GET() {
  const header = [
    "ДД / Регистр",
    "Овог",
    "Нэр",
    "Бодогдсон цалин",
    "Нэмэгдэл",
    "Суутгал",
  ];
  const example = ["УБ12345678", "Нацагдорж", "Болд", 2400000, 100000, 0];

  const ws = xlsx.utils.aoa_to_sheet([header, example]);
  ws["!cols"] = [
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
  ];
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Цалин");

  const refRows: string[][] = [
    ["Багана", "Тайлбар"],
    ["ДД / Регистр", "Ажилтантай тааруулах түлхүүр (заавал)"],
    ["Овог", "Мэдээллийн — регистр олдохгүй бол нэрээр тааруулна"],
    ["Нэр", "Мэдээллийн"],
    ["Бодогдсон цалин", "Тоо (₮) — үндсэн бодогдсон цалин. ЭМНДШ/ХХОАТ автоматаар бодогдоно"],
    ["Нэмэгдэл", "Тоо (₮) — шагнал, нэмэгдэл (нийт цалинд нэмэгдэнэ). Хоосон бол 0"],
    ["Суутгал", "Тоо (₮) — бусад суутгал (цэвэр цалингаас хасагдана). Хоосон бол 0"],
  ];
  const refWs = xlsx.utils.aoa_to_sheet(refRows);
  refWs["!cols"] = [{ wch: 18 }, { wch: 60 }];
  xlsx.utils.book_append_sheet(wb, refWs, "Тайлбар");

  const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="tsalin-zagvar.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
