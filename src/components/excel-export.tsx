"use client";

import { useState } from "react";

// Ерөнхий Excel (.xlsx) экспорт товч. aoa = мөр бүр нүднүүдийн массив.
export function ExcelExportButton({
  aoa,
  filename,
  sheet = "Sheet1",
  label = "⤓ Excel",
}: {
  aoa: (string | number)[][];
  filename: string;
  sheet?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy || aoa.length === 0) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 31));
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
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
      onClick={run}
      disabled={busy}
      className="rounded-lg border border-green-300 bg-white px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50 print:hidden"
    >
      {busy ? "…" : label}
    </button>
  );
}
