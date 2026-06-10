"use client";

import { useState } from "react";

// Excel-д гаргах нэг мөрийн өгөгдөл (page.tsx-ээс бэлдэж дамжуулна)
export type ExportRow = {
  invoice_no: string;
  inv_date: string;
  partner: string;
  responsible: string;
  description: string;
  due_date: string;
  amount: number;
  paid: number;
  remaining: number;
  status: string;
};

export function InvoiceToolbar({
  rows,
  fileLabel,
}: {
  rows: ExportRow[];
  fileLabel: string;
}) {
  const [busy, setBusy] = useState(false);

  async function exportExcel() {
    if (busy) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const header = [
        "Нэхэмж №",
        "Огноо",
        "Харилцагч",
        "Хариуцагч",
        "Тайлбар",
        "Хугацаа",
        "Нийт дүн",
        "Төлсөн",
        "Үлдэгдэл",
        "Төлөв",
      ];
      const body = rows.map((r) => [
        r.invoice_no,
        r.inv_date,
        r.partner,
        r.responsible,
        r.description,
        r.due_date,
        r.amount,
        r.paid,
        r.remaining,
        r.status,
      ]);
      // Нийт мөр
      const totAmount = rows.reduce((s, r) => s + r.amount, 0);
      const totPaid = rows.reduce((s, r) => s + r.paid, 0);
      const totRem = rows.reduce((s, r) => s + r.remaining, 0);
      body.push([
        "",
        "",
        "",
        "",
        `Нийт ${rows.length} нэхэмжлэл`,
        "",
        totAmount,
        totPaid,
        totRem,
        "",
      ]);

      const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
      ws["!cols"] = [
        { wch: 10 },
        { wch: 12 },
        { wch: 28 },
        { wch: 14 },
        { wch: 40 },
        { wch: 10 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Нэхэмжлэх");

      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Нэхэмжлэх_${fileLabel}.xlsx`;
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
        disabled={busy}
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
