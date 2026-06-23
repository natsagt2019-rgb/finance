"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAssetFromInventory } from "./actions";

export type ItemOpt = { id: number; sku: string | null; name: string; unit: string };
export type CatOpt = { id: number; name: string };

export function ToAssetClient({
  items, categories, today,
}: {
  items: ItemOpt[]; categories: CatOpt[]; today: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [itemId, setItemId] = useState(items[0]?.id ?? 0);
  const [qty, setQty] = useState("1");
  const [name, setName] = useState("");
  const [catId, setCatId] = useState("");
  const [date, setDate] = useState(today);

  function run() {
    setMsg(null);
    start(async () => {
      const res = await createAssetFromInventory({
        date, item_id: itemId, qty: Number(qty) || 0, asset_name: name,
        category_id: catId ? Number(catId) : null, acquired_date: date,
      });
      if (res.ok) { setName(""); setQty("1"); router.refresh(); setMsg({ ok: true, t: "✓ Үндсэн хөрөнгө үүсгэгдлээ." }); }
      else setMsg({ ok: false, t: res.error });
    });
  }

  const inp = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
  const lbl = "mb-1 block text-xs font-medium text-zinc-600";

  return (
    <div className="max-w-xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={lbl}>Бараа (зарцуулах)</label>
          <select value={itemId} onChange={(e) => setItemId(Number(e.target.value))} className={inp}>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} {i.sku ? `(${i.sku})` : ""} — {i.unit}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Тоо хэмжээ</label>
          <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" className={`${inp} text-right`} />
        </div>
        <div>
          <label className={lbl}>Огноо</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
        </div>
        <div className="sm:col-span-2">
          <label className={lbl}>Хөрөнгийн нэр</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ж: Тавилгын иж бүрдэл" className={inp} />
        </div>
        <div className="sm:col-span-2">
          <label className={lbl}>Хөрөнгийн ангилал</label>
          <select value={catId} onChange={(e) => setCatId(e.target.value)} className={inp}>
            <option value="">— сонгох —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      {msg && <div className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.t}</div>}
      <button type="button" onClick={run} disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
        {pending ? "Шилжүүлж байна…" : "🏗 Үндсэн хөрөнгө болгох"}
      </button>
    </div>
  );
}
