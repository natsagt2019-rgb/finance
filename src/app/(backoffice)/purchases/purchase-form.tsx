"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPurchase } from "./actions";

export type AccOpt = { code: string; name: string };

export function PurchaseForm({ accounts }: { accounts: AccOpt[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [net, setNet] = useState("");
  const [vat, setVat] = useState(true);

  const netNum = Number(String(net).replace(/[, ]/g, "")) || 0;
  const vatAmt = vat ? Math.round(netNum * 0.1 * 100) / 100 : 0;
  const total = netNum + vatAmt;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("vat_pct", vat ? "1" : "0");
    start(async () => {
      const res = await createPurchase(fd);
      if (res.ok) {
        setMsg({ ok: true, text: "✓ Худалдан авалт бүртгэгдэж, өглөг журналд бичигдлээ." });
        (e.target as HTMLFormElement).reset();
        setNet("");
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  const inputCls = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";
  const lbl = "mb-1 block text-xs font-medium text-zinc-600";

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-800">Шинэ худалдан авалт</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={lbl}>Огноо</label>
          <input type="date" name="pur_date" required className={inputCls} />
        </div>
        <div>
          <label className={lbl}>Баримт №</label>
          <input name="doc_no" placeholder="HA-001" className={inputCls} />
        </div>
        <div>
          <label className={lbl}>Нийлүүлэгч</label>
          <input name="partner_name" placeholder="Нийлүүлэгчийн нэр" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={lbl}>Зардал / Бараа / ҮХ данс (Дт)</label>
          <input list="pur-acc" name="expense_code" required placeholder="код эсвэл нэр" className={inputCls} />
          <datalist id="pur-acc">
            {accounts.map((a) => (
              <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
            ))}
          </datalist>
        </div>
        <div>
          <label className={lbl}>Дүн (НӨАТ-гүй)</label>
          <input name="net_amount" value={net} onChange={(e) => setNet(e.target.value)} inputMode="numeric" placeholder="0" className={`${inputCls} text-right tabular-nums`} />
        </div>
        <div className="sm:col-span-3">
          <label className={lbl}>Тайлбар</label>
          <input name="description" placeholder="Гүйлгээний утга" className={inputCls} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5 text-zinc-700">
          <input type="checkbox" checked={vat} onChange={(e) => setVat(e.target.checked)} />
          НӨАТ-тай (10%)
        </label>
        <span className="text-zinc-500">НӨАТ: <b className="tabular-nums">{Math.round(vatAmt).toLocaleString()}</b></span>
        <span className="text-zinc-500">Нийт: <b className="tabular-nums text-zinc-900">{Math.round(total).toLocaleString()}</b></span>
        <button type="submit" disabled={pending} className="ml-auto rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
          {pending ? "Хадгалж байна…" : "Бүртгэх"}
        </button>
      </div>

      {msg && (
        <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}
      <p className="mt-2 text-xs text-zinc-400">
        Бичилт: Дт сонгосон данс (цэвэр) + Дт 120201 НӨАТ / Кт 310100 өглөг. → /payables, харилцагчийн тооцоонд тусна.
      </p>
    </form>
  );
}
