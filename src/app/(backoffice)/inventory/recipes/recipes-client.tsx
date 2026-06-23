"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fmtQty } from "@/lib/inventory-calc";
import { addRecipeLine, deleteRecipeLine, createConversion } from "./actions";

export type ItemOpt = { id: number; sku: string | null; name: string; unit: string };
export type RecipeLine = { id: number; product_item_id: number; component_item_id: number; qty: number };

export function RecipesClient({
  items, recipes, today,
}: {
  items: ItemOpt[]; recipes: RecipeLine[]; today: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [product, setProduct] = useState<number>(items[0]?.id ?? 0);
  const [outQty, setOutQty] = useState("");

  const itemOf = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const lines = recipes.filter((r) => r.product_item_id === product);
  const label = (id: number) => { const it = itemOf.get(id); return it ? `${it.sku ? it.sku + " " : ""}${it.name}` : `#${id}`; };

  function addLine(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("product_item_id", String(product));
    setMsg(null);
    start(async () => {
      const res = await addRecipeLine(fd);
      if (res.ok) { (e.target as HTMLFormElement).reset(); router.refresh(); }
      else setMsg(res.error);
    });
  }
  function removeLine(id: number) {
    start(async () => { await deleteRecipeLine(id); router.refresh(); });
  }
  function runConversion() {
    const qty = Number(outQty) || 0;
    if (qty <= 0) { setMsg("Гаргах тоо оруулна уу."); return; }
    setMsg(null);
    start(async () => {
      const res = await createConversion({ date: today, product_item_id: product, output_qty: qty });
      if (res.ok) { setOutQty(""); router.refresh(); setMsg(`✓ Хөрвүүлэлт хийгдлээ (${qty} ${itemOf.get(product)?.unit ?? ""}).`); }
      else setMsg(res.error);
    });
  }

  const inp = "rounded-lg border border-zinc-300 px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <label className="text-xs text-zinc-500">Бүтээгдэхүүн сонгох
          <select value={product} onChange={(e) => setProduct(Number(e.target.value))} className={`${inp} ml-2 w-72`}>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} {i.sku ? `(${i.sku})` : ""}</option>)}
          </select>
        </label>
        {msg && <span className={`ml-3 text-xs ${msg.startsWith("✓") ? "text-green-700" : "text-red-600"}`}>{msg}</span>}
      </div>

      {/* Орц (BOM) */}
      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700">Орц (1 нэгж бүтээгдэхүүнд)</div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr><th className="px-3 py-2 text-left">Түүхий эд</th><th className="px-3 py-2 text-right">Тоо</th><th className="px-3 py-2 text-left">Нэгж</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {lines.length === 0 ? <tr><td colSpan={4} className="px-3 py-4 text-center text-zinc-400">Орц тодорхойлоогүй.</td></tr> : null}
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-1.5 text-zinc-700">{label(l.component_item_id)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtQty(Number(l.qty))}</td>
                <td className="px-3 py-1.5 text-zinc-500">{itemOf.get(l.component_item_id)?.unit ?? ""}</td>
                <td className="px-3 py-1.5 text-right"><button type="button" onClick={() => removeLine(l.id)} className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50">Хас</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={addLine} className="flex flex-wrap items-end gap-3 border-t border-zinc-100 p-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-500">Түүхий эд
            <select name="component_item_id" required className={`${inp} w-64`}>
              {items.filter((i) => i.id !== product).map((i) => <option key={i.id} value={i.id}>{i.name} {i.sku ? `(${i.sku})` : ""}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">Тоо (1 бүтээгдэхүүнд)
            <input name="qty" inputMode="numeric" placeholder="0" className={`${inp} w-28 text-right`} />
          </label>
          <button type="submit" disabled={pending} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">Орц нэмэх</button>
        </form>
      </div>

      {/* Хөрвүүлэлт хийх */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="text-sm font-semibold text-zinc-700">Хөрвүүлэлт хийх:</div>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Гаргах тоо
          <input value={outQty} onChange={(e) => setOutQty(e.target.value)} inputMode="numeric" placeholder="0" className={`${inp} w-32 text-right`} />
        </label>
        <button type="button" onClick={runConversion} disabled={pending || lines.length === 0}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
          {pending ? "Хийж байна…" : "⚗ Хөрвүүлэх"}
        </button>
        <span className="text-xs text-zinc-400">Түүхий эдийг FIFO-оор зарцуулж, бүтээгдэхүүнийг нийт өртгөөр орлогод авна.</span>
      </div>
    </div>
  );
}
