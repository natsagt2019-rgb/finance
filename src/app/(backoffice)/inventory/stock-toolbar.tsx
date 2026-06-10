"use client";

import { useState } from "react";

export type StockExportRow = {
  category: string;
  name: string;
  unit: string;
  qty: number;
  unitCost: number;
  value: number;
};

export function StockToolbar({
  rows,
  fileLabel,
}: {
  rows: StockExportRow[];
  fileLabel: string;
}) {
  const [busy, setBusy] = useState(false);

  async function exportExcel() {
    if (busy) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const header = ["Ангилал", "Бараа", "Нэгж", "Үлдэгдэл", "Дундаж өртөг", "Нийт өртөг"];
      const body = rows.map((r) => [r.category, r.name, r.unit, r.qty, r.unitCost, r.value]);
      const totalValue = rows.reduce((s, r) => s + r.value, 0);
      body.push(["Нийт дүн", "", "", "", "", totalValue]);

      const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
      ws["!cols"] = [
        { wch: 20 },
        { wch: 28 },
        { wch: 8 },
        { wch: 12 },
        { wch: 14 },
        { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Үлдэгдэл");

      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `БМ_үлдэгдэл_${fileLabel}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={exportExcel}
        disabled={busy || rows.length === 0}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        {busy ? "Бэлдэж байна…" : "↧ Excel татах"}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        🖨 Хэвлэх
      </button>
    </div>
  );
}
