"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTransfer } from "./actions";

export type ItemOpt = { id: number; sku: string | null; name: string; unit: string };
export type LocOpt = { id: number; name: string };

export function TransferClient({
  items, locations, today,
}: {
  items: ItemOpt[]; locations: LocOpt[]; today: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [itemId, setItemId] = useState(items[0]?.id ?? 0);
  const [fromLoc, setFromLoc] = useState("");
  const [toLoc, setToLoc] = useState("");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(today);

  function run() {
    setMsg(null);
    start(async () => {
      const res = await createTransfer({
        date, item_id: itemId, from_location: Number(fromLoc), to_location: Number(toLoc), qty: Number(qty) || 0,
      });
      if (res.ok) { setQty(""); router.refresh(); setMsg({ ok: true, t: "✓ Шилжүүлэг хийгдлээ." }); }
      else setMsg({ ok: false, t: res.error });
    });
  }

  const inp = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
  const lbl = "mb-1 block text-xs font-medium text-zinc-600";

  if (locations.length < 2) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Шилжүүлэг хийхэд дор хаяж 2 байршил хэрэгтэй. «Байршил (агуулах)» хуудаснаас нэмнэ үү.
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={lbl}>Бараа</label>
          <select value={itemId} onChange={(e) => setItemId(Number(e.target.value))} className={inp}>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} {i.sku ? `(${i.sku})` : ""} — {i.unit}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Гарах байршил</label>
          <select value={fromLoc} onChange={(e) => setFromLoc(e.target.value)} className={inp}>
            <option value="">— сонгох —</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Ирэх байршил</label>
          <select value={toLoc} onChange={(e) => setToLoc(e.target.value)} className={inp}>
            <option value="">— сонгох —</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Тоо хэмжээ</label>
          <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" placeholder="0" className={`${inp} text-right`} />
        </div>
        <div>
          <label className={lbl}>Огноо</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
        </div>
      </div>
      {msg && <div className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.t}</div>}
      <button type="button" onClick={run} disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
        {pending ? "Шилжүүлж байна…" : "⇄ Шилжүүлэх"}
      </button>
    </div>
  );
}
