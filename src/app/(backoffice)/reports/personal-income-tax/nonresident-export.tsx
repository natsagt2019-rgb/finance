"use client";

import { useState } from "react";

import type { PitReportRow } from "@/lib/pit-report";

// e-Tax резидент бус (гадаад) суутгагчийн Resource файлын толгой (report 34).
const HEADER = [
  "Татвар төлөгчийн дугаар",
  "Овог",
  "Нэр",
  "Байнга оршин суугч татвар төлөгчөөр бүртгэгдсэн улсын нэр",
  "Орлогын төрөл /сонголтоор/",
  "Орлогын дүн /төгрөг/",
  "Суутгавал зохих татвар (8*20%)",
  "Хувь",
  "Суутгасан татвар (8*11%)",
  "Хөнгөлөх татвар",
  "Суутгасан албан татвар",
  "Оршин суугч татвар төлөгчийн сертификат",
];

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Регистрийн угтвараас улсын код (CN → 86 Хятад). Бусад бол хоосон (гараар).
function countryCode(register: string): string {
  return /^CN/i.test(register.trim()) ? "86" : "";
}

export function NonResidentExportButton({
  rows,
  year,
  periodLabel,
}: {
  rows: PitReportRow[];
  year: number;
  periodLabel: string;
}) {
  const [busy, setBusy] = useState(false);
  const exportRows = rows.filter((r) => r.gross > 0);

  async function exportExcel() {
    if (busy || exportRows.length === 0) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const body = exportRows.map((r) => {
        const idNo = r.tin?.trim() || r.register || "";
        const last = r.lastName?.trim() || r.name || "";
        const first = r.firstName?.trim() || "";
        const income = round2(r.gross);
        const tax = round2(r.pit); // = нийт × 20% (salary_records-д хадгалсан)
        return [
          idNo, // A ТТД/регистр
          last, // B Овог
          first, // C Нэр
          countryCode(r.register || ""), // D Улсын код (CN→86)
          1, // E Орлогын төрөл
          income, // F Орлогын дүн
          tax, // G Суутгавал зохих (20%)
          20, // H Хувь
          tax, // I Суутгасан татвар
          0, // J Хөнгөлөх татвар
          tax, // K Суутгасан албан татвар
          0, // L Сертификат
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([HEADER, ...body]);
      // A баганыг текстээр (регистр/ТТД).
      const range = XLSX.utils.decode_range(ws["!ref"] as string);
      for (let R = 1; R <= range.e.r; R++) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
        if (cell) {
          cell.t = "s";
          cell.v = String(cell.v);
        }
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const tag = periodLabel.replace(/\s+/g, "-").replace(/[\\/:*?"<>|]/g, "");
      a.href = url;
      a.download = `XM_ResidentBus_${year}_${tag}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={exportExcel}
      disabled={busy || exportRows.length === 0}
      title="e-Tax резидент бус (гадаад) суутгагчийн файл — 20%"
      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
    >
      {busy ? "Бэлдэж байна…" : "↧ e-Tax гадаад (20%)"}
    </button>
  );
}
