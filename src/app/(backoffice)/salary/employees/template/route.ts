import * as xlsx from "xlsx";

// Ажилтныг бөөнөөр оруулах Excel загвар. Эхний хуудас — оруулах мөрүүд
// (нэг мөр = нэг ажилтан), хоёрдугаар хуудас — баганын тайлбар.
export async function GET() {
  const header = [
    "Овог",
    "Нэр",
    "Компани",
    "Хэлтэс",
    "Албан тушаал",
    "Ажилд орсон огноо",
    "Туршлага (жил)",
    "Үндсэн цалин",
    "Утасны нэмэгдэл",
    "ДД / Регистр",
    "Дансны дугаар",
    "Төлөв",
  ];
  const example = [
    "Нацагдорж",
    "Болд",
    "ТҮМЭН РЕСУРС",
    "Санхүүгийн хэлтэс",
    "Харилцагчийн менежер",
    "2023-01-15",
    3,
    2400000,
    100000,
    "УБ12345678",
    "5012345678",
    "Идэвхтэй",
  ];

  const ws = xlsx.utils.aoa_to_sheet([header, example]);
  ws["!cols"] = [
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 22 }, { wch: 16 },
    { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
  ];
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Ажилтнууд");

  // Тайлбар хуудас — баганыг хэрхэн бөглөхийг заана.
  const refRows: string[][] = [
    ["Багана", "Тайлбар"],
    ["Овог", "Заавал биш"],
    ["Нэр", "ЗААВАЛ — хоосон бол тухайн мөр алгасагдана"],
    ["Компани", "ТҮМЭН РЕСУРС эсвэл ТҮМЭН ТЭЭХ (хоосон байж болно)"],
    ["Хэлтэс", "Хэлтэс/тасгийн нэр (заавал биш)"],
    ["Албан тушаал", "Заавал биш"],
    ["Ажилд орсон огноо", "YYYY-MM-DD (ж: 2023-01-15)"],
    ["Туршлага (жил)", "Тоо — ЭА хоног тооцоход. Хоосон бол огнооноос бодно"],
    ["Үндсэн цалин", "Тоо (₮)"],
    ["Утасны нэмэгдэл", "Тоо (₮)"],
    ["ДД / Регистр", "Давхардал шалгах түлхүүр (заавал биш)"],
    ["Дансны дугаар", "Заавал биш"],
    ["Төлөв", "«Идэвхтэй» эсвэл «Идэвхгүй» (хоосон бол Идэвхтэй)"],
  ];
  const refWs = xlsx.utils.aoa_to_sheet(refRows);
  refWs["!cols"] = [{ wch: 20 }, { wch: 50 }];
  xlsx.utils.book_append_sheet(wb, refWs, "Тайлбар");

  const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="ajiltan-zagvar.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
