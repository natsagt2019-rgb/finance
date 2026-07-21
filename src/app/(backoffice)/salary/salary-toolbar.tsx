"use client";

import { useState } from "react";

export type SummaryExportRow = {
  month: string;
  cnt: number;
  gross: number;
  sh: number;
  employerSh: number;
  pit: number;
  reliefDiff: number;
  advance: number;
  net: number;
};

export function SalaryToolbar({
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
        "Сар",
        "Ажилтан",
        "Нийт цалин",
        "ЭМНДШ (ажилтан)",
        "ЭМНДШ (ажил олгогч)",
        "ХХОАТ",
        "Хөнгөлөлтийн зөрүү",
        "Урьдчилгаа",
        "Гарт олгох",
      ];
      const body = rows.map((r) => [
        r.month,
        r.cnt,
        r.gross,
        r.sh,
        r.employerSh,
        r.pit,
        r.reliefDiff,
        r.advance,
        r.net,
      ]);
      const tot = rows.reduce(
        (s, r) => ({
          gross: s.gross + r.gross,
          sh: s.sh + r.sh,
          employerSh: s.employerSh + r.employerSh,
          pit: s.pit + r.pit,
          reliefDiff: s.reliefDiff + r.reliefDiff,
          advance: s.advance + r.advance,
          net: s.net + r.net,
        }),
        { gross: 0, sh: 0, employerSh: 0, pit: 0, reliefDiff: 0, advance: 0, net: 0 },
      );
      body.push([
        "Жилийн дүн",
        "",
        tot.gross,
        tot.sh,
        tot.employerSh,
        tot.pit,
        tot.reliefDiff,
        tot.advance,
        tot.net,
      ]);

      const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
      ws["!cols"] = [
        { wch: 10 },
        { wch: 10 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Цалин нэгтгэл");

      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Цалин_нэгтгэл_${fileLabel}.xlsx`;
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
