"use client";

import { useState } from "react";

export type ExportRow = {
  date?: string; // задаргаа
  desc?: string; // задаргаа
  code: string | null; // харьцсан дансны код
  name: string; // харьцсан дансны нэр
  debit: number;
  credit: number;
  balance?: number; // задаргаа — гүйлгээт үлдэгдэл
};

// Ерөнхий дансны тайланг (идэвхтэй горим) Excel (.xlsx)-руу хөрвүүлж татна.
export function GeneralLedgerExport({
  account,
  accountName,
  dFrom,
  dTo,
  view,
  opening,
  closing,
  rows,
}: {
  account: string;
  accountName: string;
  dFrom: string;
  dTo: string;
  view: "summary" | "detail";
  opening: number;
  closing: number;
  rows: ExportRow[];
}) {
  const [busy, setBusy] = useState(false);

  async function exportExcel() {
    if (busy) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const totalDr = rows.reduce((s, r) => s + (r.debit || 0), 0);
      const totalCr = rows.reduce((s, r) => s + (r.credit || 0), 0);
      const oDr = opening >= 0 ? opening : "";
      const oCr = opening < 0 ? -opening : "";
      const cDr = closing >= 0 ? closing : "";
      const cCr = closing < 0 ? -closing : "";

      const title = [`Ерөнхий данс — ${account} ${accountName}`];
      const period = [
        `${dFrom} → ${dTo}`,
        view === "detail" ? "Задаргаа" : "Нэгтгэл (харьцсан дансаар)",
      ];

      let aoa: (string | number)[][];
      if (view === "detail") {
        const header = ["№", "Огноо", "Гүйлгээний утга", "Харьцсан данс", "Дансны нэр", "Дебет", "Кредит", "Үлдэгдэл"];
        const open = ["", "", "Эхний үлдэгдэл", "", "", oDr, oCr, Math.abs(opening)];
        const body = rows.map((r, i) => [
          i + 1,
          r.date ?? "",
          r.desc ?? "",
          r.code ?? "",
          r.name,
          r.debit || "",
          r.credit || "",
          Math.abs(r.balance ?? 0),
        ]);
        const total = ["", "", "Нийт", "", "", totalDr, totalCr, ""];
        const close = ["", "", "Эцсийн үлдэгдэл", "", "", cDr, cCr, Math.abs(closing)];
        aoa = [title, period, [], header, open, ...body, total, close];
      } else {
        const header = ["№", "Харьцсан данс", "Дансны нэр", "Дебет", "Кредит"];
        const open = ["", "Эхний үлдэгдэл", "", oDr, oCr];
        const body = rows.map((r, i) => [i + 1, r.code ?? "", r.name, r.debit || "", r.credit || ""]);
        const total = ["", "Нийт", "", totalDr, totalCr];
        const close = ["", "Эцсийн үлдэгдэл", "", cDr, cCr];
        aoa = [title, period, [], header, open, ...body, total, close];
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ерөнхий данс");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ерөнхий-данс_${account}_${dFrom}_${dTo}${view === "detail" ? "_задаргаа" : ""}.xlsx`;
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
      disabled={busy}
      className="rounded-lg border border-green-300 bg-white px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
    >
      {busy ? "…" : "⤓ Excel"}
    </button>
  );
}
