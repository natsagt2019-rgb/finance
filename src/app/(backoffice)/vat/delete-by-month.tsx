"use client";

import { useState, useTransition } from "react";
import { deleteVatByMonth } from "./actions";

type MonthCount = { month: number; count: number };

export function DeleteByMonth({ months }: { months: MonthCount[] }) {
  const [month, setMonth] = useState<string>("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const selected = months.find((m) => String(m.month) === month);

  function onDelete() {
    if (!month) {
      setMsg({ ok: false, text: "Сар сонгоно уу." });
      return;
    }
    const cnt = selected?.count ?? 0;
    if (
      !confirm(
        `${month}-р сарын ${cnt} НӨАТ баримтыг бүгдийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`,
      )
    )
      return;
    setMsg(null);
    start(async () => {
      const r = await deleteVatByMonth(Number(month));
      if (r.ok) {
        setMsg({ ok: true, text: `${r.count ?? 0} баримт устгалаа.` });
        setMonth("");
        setTimeout(() => window.location.reload(), 700);
      } else {
        setMsg({ ok: false, text: r.error ?? "Алдаа гарлаа." });
      }
    });
  }

  if (months.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={month}
        onChange={(e) => {
          setMonth(e.target.value);
          setMsg(null);
        }}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      >
        <option value="">Сар сонгох…</option>
        {months.map((m) => (
          <option key={m.month} value={m.month}>
            {m.month}-р сар ({m.count})
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending || !month}
        className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        {pending ? "Устгаж байна…" : "🗑 Сараар устгах"}
      </button>
      {msg && (
        <span className={`text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>
          {msg.text}
        </span>
      )}
    </div>
  );
}
