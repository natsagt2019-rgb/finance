"use client";

import { useState } from "react";

export type SummaryExportRow = {
  category: string;
  cnt: number;
  cost: number;
  accum: number;
  net: number;
};

export function AssetsToolbar({
  rows,
  fileLabel,
}: {
  rows: SummaryExportRow[];
  fileLabel: string;
}) {
  const [busy, setBusy] = useState(false);

  async function exportExcel() {
    if (busy) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const header = [
        "Ангилал",
        "Тоо",
        "Анхны өртөг",
        "Хуримтлагдсан элэгдэл",
        "Үлдэгдэл өртөг",
      ];
      const body = rows.map((r) => [r.category, r.cnt, r.cost, r.accum, r.net]);
      const tot = rows.reduce(
        (s, r) => ({
          cnt: s.cnt + r.cnt,
          cost: s.cost + r.cost,
          accum: s.accum + r.accum,
          net: s.net + r.net,
        }),
        { cnt: 0, cost: 0, accum: 0, net: 0 },
      );
      body.push(["Нийт дүн", tot.cnt, tot.cost, tot.accum, tot.net]);

      const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
      ws["!cols"] = [
        { wch: 32 },
        { wch: 8 },
        { wch: 16 },
        { wch: 18 },
        { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Үндсэн хөрөнгө");

      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Үндсэн_хөрөнгө_${fileLabel}.xlsx`;
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
