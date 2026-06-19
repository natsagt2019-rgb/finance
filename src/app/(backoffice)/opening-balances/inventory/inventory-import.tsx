"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importInventoryExcel } from "./actions";

export function InventoryImport({ year }: { year: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    start(async () => {
      const res = await importInventoryExcel(year, fd);
      if (res.ok) {
        setMsg({
          ok: true,
          text: `✓ ${res.items} шинэ бараа, ${res.moves} нээлтийн нөөц бичлээ. Доорх жагсаалт шинэчлэгдэнэ — «Журналд тусгах» дарж эхний үлдэгдлийг бичнэ.`,
        });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-500">Excel-ээр бөөнөөр оруулах:</span>
        <a
          href="/opening-balances/inventory/template"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          ↓ Excel загвар татах
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          {pending ? "Уншиж байна…" : "↥ Excel-ээс импорт"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={onFile}
          className="hidden"
        />
      </div>
      {msg && (
        <div
          className={`mt-3 rounded-lg px-4 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}
