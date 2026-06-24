"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { importAssets } from "./actions";

// Export-д бэлдсэн нэг мөр (унших боломжтой утгуудаар).
export type AssetExportRow = {
  name: string;
  code: string;
  barcode: string;
  category: string;
  company: string;
  acquired: string;
  cost: number;
  salvage: number;
  life: number;
  location: string;
  responsible: string;
  status: string;
};

const HEADER = [
  "Нэр", "Карт / код", "Баар код", "Ангилал", "Компани", "Орсон огноо",
  "Анхны өртөг", "Үлдэгдэл өртөг", "Ашиглах хугацаа (жил)", "Байршил", "Эд хариуцагч", "Төлөв",
];

export function AssetsListToolbar({ rows }: { rows: AssetExportRow[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  async function exportExcel() {
    if (busy) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const body = rows.map((r) => [
        r.name, r.code, r.barcode, r.category, r.company, r.acquired,
        r.cost, r.salvage, r.life, r.location, r.responsible, r.status,
      ]);
      const ws = XLSX.utils.aoa_to_sheet([HEADER, ...body]);
      ws["!cols"] = [
        { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 14 },
        { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Хөрөнгө");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Үндсэн_хөрөнгө_бүртгэл.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setMsg(null);
    start(async () => {
      const res = await importAssets(fd);
      if (res.ok) {
        setMsg({ ok: true, text: `✓ ${res.inserted} хөрөнгө нэмлээ${res.skipped ? ` (${res.skipped} давхардсан нэр алгассан)` : ""}.` });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="no-print">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={exportExcel}
          disabled={busy || rows.length === 0}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {busy ? "Бэлдэж байна…" : "↧ Excel татах"}
        </button>
        <a
          href="/assets/template"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          ↓ Excel загвар
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          {pending ? "Уншиж байна…" : "↥ Excel-ээс оруулах"}
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onFile} className="hidden" />
      </div>
      {msg && (
        <div className={`mt-3 rounded-lg px-4 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
