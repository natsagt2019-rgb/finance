import * as xlsx from "xlsx";
import { createClient } from "@/lib/supabase/server";

const TYPE_LABEL: Record<string, string> = {
  asset: "Хөрөнгө",
  liability: "Өр төлбөр",
  equity: "Өмч",
  income: "Орлого",
  expense: "Зардал",
};

// Эхний үлдэгдлийн Excel загвар (бүх идэвхтэй данс + хоосон дүн багана).
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accounts")
    .select("code, name, type")
    .eq("is_active", true)
    .order("code")
    .limit(5000);

  const accs = (data as { code: string; name: string; type: string }[] | null) ?? [];
  const rows: (string | number | null)[][] = [
    ["Код", "Дансны нэр", "Шинж", "Эхний үлдэгдэл"],
    ...accs.map((a) => [a.code, a.name, TYPE_LABEL[a.type] ?? a.type, null]),
  ];

  const ws = xlsx.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 10 }, { wch: 40 }, { wch: 12 }, { wch: 18 }];
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Эхний үлдэгдэл");
  const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="ehnii-uldegdel-zagvar.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
