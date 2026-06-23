"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPrice, deletePrice } from "./actions";

export type ItemOpt = { id: number; sku: string | null; name: string; unit: string };
export type PartnerOpt = { id: number; name: string };
export type PriceRow = {
  id: number; item_id: number; partner_id: number | null;
  sale_price: number; cost_price: number; valid_from: string;
  item_name: string; partner_name: string | null;
};

function fmt(n: number) {
  return n ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
}

export function PricesClient({
  items, partners, prices, today,
}: {
  items: ItemOpt[]; partners: PartnerOpt[]; prices: PriceRow[]; today: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const itemVal = String(fd.get("item_label") ?? "");
    const item = items.find((i) => `${i.sku ?? ""} ${i.name}`.trim() === itemVal.trim() || i.name === itemVal.trim());
    if (!item) { setMsg("Бараа сонгоно уу (жагсаалтаас)."); return; }
    fd.set("item_id", String(item.id));
    const pv = String(fd.get("partner_label") ?? "").trim();
    if (pv) {
      const p = partners.find((x) => x.name === pv);
      if (p) fd.set("partner_id", String(p.id));
    }
    setMsg(null);
    start(async () => {
      const res = await createPrice(fd);
      if (res.ok) { (e.target as HTMLFormElement).reset(); router.refresh(); setMsg("✓ Үнэ нэмэгдлээ."); }
      else setMsg(res.error);
    });
  }

  function remove(id: number) {
    if (!window.confirm("Энэ үнийг устгах уу?")) return;
    start(async () => { await deletePrice(id); router.refresh(); });
  }

  const inp = "rounded-lg border border-zinc-300 px-3 py-2 text-sm";

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Бараа *
          <input list="price-items" name="item_label" required placeholder="код/нэр" className={`${inp} w-56`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Харилцагч (заавал биш)
          <input list="price-partners" name="partner_label" placeholder="ерөнхий үнэ бол хоосон" className={`${inp} w-48`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Зарах үнэ
          <input name="sale_price" inputMode="numeric" placeholder="0" className={`${inp} w-28 text-right`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Өртгийн үнэ
          <input name="cost_price" inputMode="numeric" placeholder="0" className={`${inp} w-28 text-right`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Мөрдөх огноо
          <input type="date" name="valid_from" defaultValue={today} className={inp} />
        </label>
        <button type="submit" disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
          {pending ? "Хадгалж байна…" : "Нэмэх"}
        </button>
        {msg && <span className={`text-xs ${msg.startsWith("✓") ? "text-green-700" : "text-red-600"}`}>{msg}</span>}
      </form>

      <datalist id="price-items">
        {items.map((i) => <option key={i.id} value={`${i.sku ?? ""} ${i.name}`.trim()} />)}
      </datalist>
      <datalist id="price-partners">
        {partners.map((p) => <option key={p.id} value={p.name} />)}
      </datalist>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Огноо</th>
              <th className="px-3 py-2 text-left">Бараа</th>
              <th className="px-3 py-2 text-left">Харилцагч</th>
              <th className="px-3 py-2 text-right">Зарах үнэ</th>
              <th className="px-3 py-2 text-right">Өртгийн үнэ</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {prices.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-zinc-400">Үнэ бүртгээгүй байна.</td></tr>
            ) : null}
            {prices.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50">
                <td className="whitespace-nowrap px-3 py-1.5 text-zinc-600">{p.valid_from?.slice(0, 10)}</td>
                <td className="px-3 py-1.5 text-zinc-700">{p.item_name}</td>
                <td className="px-3 py-1.5 text-zinc-500">{p.partner_name ?? <span className="text-zinc-400">Ерөнхий</span>}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmt(Number(p.sale_price))}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-zinc-500">{fmt(Number(p.cost_price))}</td>
                <td className="px-3 py-1.5 text-right">
                  <button type="button" onClick={() => remove(p.id)} className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50">Устгах</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
