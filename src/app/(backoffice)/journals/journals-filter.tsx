"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Журналын жагсаалтын хайлт + хугацааны шүүлт. URL searchParams-аар ажиллана.
export function JournalsFilter({
  q: q0,
  from: from0,
  to: to0,
}: {
  q: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(q0);
  const [from, setFrom] = useState(from0);
  const [to, setTo] = useState(to0);

  function apply() {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const qs = p.toString();
    router.push(qs ? `/journals?${qs}` : "/journals");
  }

  function clear() {
    setQ("");
    setFrom("");
    setTo("");
    router.push("/journals");
  }

  const inputCls =
    "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-900";

  return (
    <div className="no-print flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-500">Хайх (утга / дугаар / лавлах)</label>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder="Жишээ: цалин, GL-000139…"
          className={`${inputCls} w-64`}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-500">Эхлэх огноо</label>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-500">Дуусах огноо</label>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
      </div>
      <button
        type="button"
        onClick={apply}
        className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Хайх
      </button>
      {(q0 || from0 || to0) && (
        <button
          type="button"
          onClick={clear}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Цэвэрлэх
        </button>
      )}
    </div>
  );
}
