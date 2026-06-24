"use client";

import { useState } from "react";

export type CashExportRow = {
  docNo: string;
  date: string;
  desc: string;
  partner: string;
  income: number;
  expense: number;
  balance: number;
  incomeMnt: number;
  expenseMnt: number;
  balanceMnt: number;
};

export function CashTxnToolbar({
  rows,
  fileLabel,
  regName,
  period,
  ccy,
  isForeign,
  opening,
  closing,
  openingMnt,
  closingMnt,
}: {
  rows: CashExportRow[];
  fileLabel: string;
  regName: string;
  period: string;
  ccy: string;
  isForeign: boolean;
  opening: number;
  closing: number;
  openingMnt: number;
  closingMnt: number;
}) {
  const [busy, setBusy] = useState(false);

  async function exportExcel() {
    if (busy) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");

      // Толгой — гадаад валют бол төгрөгийн дүйцэл багана нэмнэ.
      const header = isForeign
        ? ["Баримт", "Огноо", "Гүйлгээний утга", "Харилцагч",
           `Орлого (${ccy})`, "Орлого (₮)", `Зарлага (${ccy})`, "Зарлага (₮)",
           `Үлдэгдэл (${ccy})`, "Үлдэгдэл (₮)"]
        : ["Баримт", "Огноо", "Гүйлгээний утга", "Харилцагч", "Орлого", "Зарлага", "Үлдэгдэл"];

      const body: (string | number)[][] = [];
      // Эхний үлдэгдэл мөр.
      body.push(
        isForeign
          ? ["", "", "Эхний үлдэгдэл", "", "", "", "", "", opening, openingMnt]
          : ["", "", "Эхний үлдэгдэл", "", "", "", opening],
      );
      for (const r of rows) {
        body.push(
          isForeign
            ? [r.docNo, r.date, r.desc, r.partner,
               r.income || "", r.incomeMnt || "", r.expense || "", r.expenseMnt || "",
               r.balance, r.balanceMnt]
            : [r.docNo, r.date, r.desc, r.partner, r.income || "", r.expense || "", r.balance],
        );
      }
      // Эцсийн үлдэгдэл мөр.
      const totalIn = rows.reduce((s, r) => s + r.income, 0);
      const totalOut = rows.reduce((s, r) => s + r.expense, 0);
      const totalInMnt = rows.reduce((s, r) => s + r.incomeMnt, 0);
      const totalOutMnt = rows.reduce((s, r) => s + r.expenseMnt, 0);
      body.push(
        isForeign
          ? ["", "", "Дансны дүн", "", totalIn, totalInMnt, totalOut, totalOutMnt, closing, closingMnt]
          : ["", "", "Дансны дүн", "", totalIn, totalOut, closing],
      );

      const ws = XLSX.utils.aoa_to_sheet([
        [`Кассын гүйлгээний тайлан — ${regName}`],
        [period],
        [],
        header,
        ...body,
      ]);
      ws["!cols"] = isForeign
        ? [{ wch: 12 }, { wch: 11 }, { wch: 28 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }]
        : [{ wch: 12 }, { wch: 11 }, { wch: 30 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Касс");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Кассын_тайлан_${fileLabel}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 no-print">
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
