"use client";

import { useState } from "react";

import type { EmployeeRow, SalaryRow } from "./types";

// Нийгмийн даатгалын З-НД-8 маягтын толгой (даатгуулагч бүрийн шимтгэл).
const HEADER = [
  "№",
  "Эцэг/эхийн нэр",
  "Нэр",
  "Регистрийн дугаар",
  "Даатгуулагчийн төрөл",
  "Ажил, мэргэжлийн ангилал",
  "Хөдөлмөрийн хөлс, түүнтэй адилтгах орлого",
  "Нийт дүн",
  "Ажил олгогч",
  "Даатгуулагч",
];

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Тухайн сарын ND-8-ыг татна (даатгуулагчийн төрөл анхдагч 01001 — цалинтай).
export function Nd8ExportButton({
  monthRecords,
  employees,
  year,
  month,
}: {
  monthRecords: SalaryRow[];
  employees: EmployeeRow[];
  year: number;
  month: number;
}) {
  const [busy, setBusy] = useState(false);
  const empById = new Map(employees.map((e) => [e.id, e]));
  const rows = monthRecords.filter((r) => (Number(r.gross) || 0) > 0);

  async function exportExcel() {
    if (busy || rows.length === 0) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const body = rows.map((r, i) => {
        const e = r.employee_id != null ? empById.get(r.employee_id) : undefined;
        const employer = round2(Number(r.employer_sh) || 0);
        const employee = round2(Number(r.sh_insurance) || 0);
        return [
          i + 1, // №
          e?.last_name ?? "", // Эцэг/эхийн нэр
          e?.first_name ?? r.employee_name ?? "", // Нэр
          e?.register ?? "", // Регистр
          "01001", // Даатгуулагчийн төрөл
          e?.occupation_code ?? "", // Ажил, мэргэжлийн ангилал
          round2(Number(r.gross) || 0), // Хөдөлмөрийн хөлс
          round2(employer + employee), // Нийт дүн
          employer, // Ажил олгогч
          employee, // Даатгуулагч
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([HEADER, ...body]);
      // Регистр багана (index 3) текстээр.
      const range = XLSX.utils.decode_range(ws["!ref"] as string);
      for (let R = 1; R <= range.e.r; R++) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: 3 })];
        if (cell) {
          cell.t = "s";
          cell.v = String(cell.v);
        }
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "ND-8");

      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ND-8_${year}-${String(month).padStart(2, "0")}.xlsx`;
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
      disabled={busy || rows.length === 0}
      title={`${month}-р сарын З-НД-8 татах`}
      className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
    >
      {busy ? "…" : "↧ND-8"}
    </button>
  );
}
