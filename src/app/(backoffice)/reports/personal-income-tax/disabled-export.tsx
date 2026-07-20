"use client";

import { useState } from "react";

import type { PitReportRow } from "@/lib/pit-report";

// e-Tax хөгжлийн бэрхшээлтэй ажилтны Resource файлын толгой (report 33).
// Орлого нь албан татвараас чөлөөлөгдөнө (22.1.2) — татварын багана байхгүй.
const HEADER = [
  "Татвар төлөгчийн дугаар",
  "Овог",
  "Нэр",
  "Хуулийн 7.1.1",
  "Хуулийн 7.1.2, 7.1.3, 7.1.4, 7.1.5, 7.1.7",
  "Хуулийн 7.1.6",
  "Нийт (1+2+3)",
  "ЭМД, НДШ Хувь",
  "ЭМД, НДШ Дүн Хуулийн 7.1.1-7.1.5, 7.1.7",
  "ЭМД, НДШ Дүн Хуулийн 7.1.6",
  "Хуулийн 7.1-д заасан орлогод татвар ногдуулах орлого",
  "Орлогын төрөл",
  "Орлого",
  "Нийт",
  "Шатлал",
];

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function DisabledExportButton({
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
        const gross = round2(r.gross);
        const sh = round2(r.shInsurance);
        // ЭМД,НДШ хувь — бодит суутгалаас (хөгжлийн бэрхшээлтэй ≈ 9.3%).
        const shRate = gross > 0 ? Math.round((sh / gross) * 1000) / 10 : 0;
        const taxable = round2(gross - sh);
        return [
          idNo, // A
          last, // B
          first, // C
          gross, // D 7.1.1
          0, // E
          0, // F 7.1.6
          gross, // G Нийт
          shRate, // H НДШ хувь
          sh, // I НДШ дүн
          0, // J НДШ 7.1.6
          taxable, // K татвар ногдуулах орлого
          0, // L орлогын төрөл
          0, // M орлого
          taxable, // N нийт
          1, // O шатлал
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([HEADER, ...body]);
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
      a.download = `XM_HugjBerh_${year}_${tag}.xlsx`;
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
      title="e-Tax хөгжлийн бэрхшээлтэй ажилтны файл — орлого чөлөөлөгдөнө"
      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
    >
      {busy ? "Бэлдэж байна…" : "↧ e-Tax хөгж.бэрхшээлтэй"}
    </button>
  );
}
