"use client";

import { useState } from "react";

import { isForeignRegister } from "@/lib/salary-calc";
import type { PitReportRow } from "@/lib/pit-report";

// e-Tax «ХМ-11» суутгагчийн улирлын Resource файлын 23 баганын толгой (A..W).
const HEADER = [
  "Татвар төлөгчийн дугаар",
  "Овог",
  "Нэр",
  "Хуулийн 7.1.1",
  "Хуулийн 7.1.2, 7.1.3, 7.1.4, 7.1.5, 7.1.7",
  "Хуулийн 7.1.6",
  "Нийт (1+2+3)",
  "ЭМД, НДШ Хувь",
  "ЭМД, НДШ Дүн (Хуулийн 7,1,1-5, 7,1,7)",
  "ЭМД, НДШ Дүн (Хуулийн 7,1,6)",
  "Хуулийн 7.1-д заасан орлогод татвар ногдуулах орлого (4-6-7)",
  "Орлогын төрөл",
  "Орлого",
  "Нийт татвар ногдуулах орлого",
  "Шатлал",
  "Хуулийн 7.1.1, 7.1.5, 7.1.7-д заасан орлогод Ногдуулсан татвар",
  "Орлого хүлээн авсан сарын тоо /ажилласан сар/",
  "Хуулийн 23.1-т заасан хөнгөлөлт сард ногдох",
  "Хуулийн 23.1-т заасан хөнгөлөлт нийт",
  "Хуулийн 7,1-д заасан орлогод ногдуулсан Хөнгөлөлтийн дараах татварын дүн",
  "Хуулийн 7.1.6-д заасан орлогод ногдуулсан дүн",
  "Шууд бус орлогод ногдуулсан албан татвар",
  "Нийт суутгуулсан албан татварын дүн",
];

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function Tt11ExportButton({
  rows,
  year,
  periodLabel,
}: {
  rows: PitReportRow[];
  year: number;
  periodLabel: string;
}) {
  const [busy, setBusy] = useState(false);

  // Зөвхөн тухайн үед орлоготой (нийт цалин > 0) ажилтныг файлд оруулна.
  const exportRows = rows.filter((r) => r.gross > 0);

  async function exportExcel() {
    if (busy || exportRows.length === 0) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");

      const body = exportRows.map((r) => {
        // Тайлангийн утгыг шууд ашиглана — файл тайлантай яг тааруулна.
        // Хөнгөлөлтийн дараах татвар (T) = ногдуулсан ХХОАТ (тайлангийн pit).
        // P = хөнгөлөлт + pit ⇒ P − S = pit баталгаатай (загварын T = P − S дүрэм).
        const relief = round2(r.reliefApplied);
        const taxAfter = round2(r.pit);
        const taxBefore = round2(relief + taxAfter);
        const reliefPerMonth = r.months > 0 ? round2(relief / r.months) : 0;
        // A багана: ТТД байвал ТТД, үгүй бол регистр (гадаад ажилтан).
        const idNo = r.tin?.trim() || r.register || "";
        const last = r.lastName?.trim() || r.name || "";
        const first = r.firstName?.trim() || "";
        // Гадаад ажилтан: ХХОАТ-ыг НДШ хасахгүй нийт цалингаас бодно.
        // Тайлбар: К (татвар ногдуулах) = нийт цалин ⇒ энэ файлд НДШ (I) = 0
        // (тэдний НДШ нь НД-ын тайланд тусдаа орно; К = G − I нийцтэй байлгана).
        const foreign = isForeignRegister(r.register);
        return [
          idNo, // A
          last, // B Овог
          first, // C Нэр
          round2(r.gross), // D 7.1.1
          0, // E
          0, // F 7.1.6
          round2(r.gross), // G Нийт
          foreign ? 0 : 11.5, // H ЭМД,НДШ хувь
          foreign ? 0 : round2(r.shInsurance), // I НДШ дүн
          0, // J НДШ 7.1.6
          round2(r.taxable), // K татвар ногдуулах
          0, // L орлогын төрөл
          0, // M орлого
          round2(r.taxable), // N нийт татвар ногдуулах
          1, // O шатлал
          taxBefore, // P ногдуулсан татвар
          r.months, // Q ажилласан сар
          reliefPerMonth, // R хөнгөлөлт сард
          relief, // S хөнгөлөлт нийт
          taxAfter, // T хөнгөлөлтийн дараах
          0, // U 7.1.6 татвар
          0, // V шууд бус
          taxAfter, // W нийт суутгал
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([HEADER, ...body]);
      // A/B/C баганыг текстээр (ТТД урд тэг, том тоо алдагдахгүй).
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
      // Файлын нэрийн үе — зай→зураас, зөвхөн файлд хориотой тэмдэгтийг хасна
      // (монгол ү/ө үсэг хадгална).
      const tag = periodLabel.replace(/\s+/g, "-").replace(/[\\/:*?"<>|]/g, "");
      a.href = url;
      a.download = `XM_11_${year}_${tag}_Resource.xlsx`;
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
      title="e-Tax резидент суутгагчийн ХМ-11 Resource файл (тайлантай тааруулсан)"
      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
    >
      {busy ? "Бэлдэж байна…" : "↧ e-Tax резидент (XM-11)"}
    </button>
  );
}
