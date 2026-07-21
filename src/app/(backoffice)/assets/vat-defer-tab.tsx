"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { computeVatDefer, vatDeferInput } from "@/lib/vat-defer";
import { saveVatDefer, deleteVatDefer, type VatDeferRow } from "./actions";
import type { AssetRow } from "./types";

function fmt(n: number): string {
  return Math.round(Number(n) || 0).toLocaleString("en-US");
}
const MONTH_NAMES = ["1-р","2-р","3-р","4-р","5-р","6-р","7-р","8-р","9-р","10-р","11-р","12-р"];

export function VatDeferTab({
  assets,
  year,
  month,
}: {
  assets: AssetRow[];
  year: number;
  month: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [shown, setShown] = useState(false);

  // Зөвхөн хойшлогдсон НӨАТ-тай хөрөнгө.
  const deferred = useMemo(() => assets.filter((a) => Number(a.deferred_vat) > 0), [assets]);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(deferred.map((a) => a.id)));

  const rows = useMemo(
    () =>
      deferred.map((a) => ({
        asset: a,
        c: computeVatDefer(vatDeferInput(a), year, month),
      })),
    [deferred, year, month],
  );

  const totals = rows.reduce(
    (s, { asset, c }) =>
      selected.has(asset.id)
        ? {
            vat: s.vat + (Number(asset.deferred_vat) || 0),
            monthly: s.monthly + c.monthly,
            accum: s.accum + c.accumulated,
            rem: s.rem + c.remaining,
          }
        : s,
    { vat: 0, monthly: 0, accum: 0, rem: 0 },
  );

  const allSelected = deferred.length > 0 && selected.size === deferred.length;
  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(deferred.map((a) => a.id)));
  }

  function handleCompute() {
    setMsg(null); setErr(null);
    if (selected.size === 0) { setErr("Эхлээд хөрөнгөө сонгоно уу."); return; }
    setShown(true);
  }

  function handleSave() {
    setMsg(null); setErr(null);
    const payload: VatDeferRow[] = rows
      .filter(({ asset }) => selected.has(asset.id))
      .map(({ asset }) => ({
        asset_id: asset.id,
        deferred_vat: Number(asset.deferred_vat) || 0,
        deferred_vat_months: asset.deferred_vat_months,
        deferred_vat_start: asset.deferred_vat_start,
      }));
    if (payload.length === 0) { setErr("Хадгалах хөрөнгө сонгоогүй."); return; }
    startTransition(async () => {
      const res = await saveVatDefer(year, month, payload);
      if (!res.ok) { setErr(res.error); return; }
      setMsg(`✓ ${MONTH_NAMES[month - 1]} сарын хойшлогдсон НӨАТ хасагдаж, журнал бичигдлээ (Дт 130600 / Кт 180500).`);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`${year} оны ${MONTH_NAMES[month - 1]} сарын хойшлогдсон НӨАТ амортизацийг устгах уу?`)) return;
    setMsg(null); setErr(null);
    startTransition(async () => {
      const res = await deleteVatDefer(year, month);
      if (!res.ok) { setErr(res.error); return; }
      setMsg(`✓ ${MONTH_NAMES[month - 1]} сарын журнал устгагдлаа.`);
      setShown(false);
      router.refresh();
    });
  }

  if (deferred.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">
        Хойшлогдсон НӨАТ-тай хөрөнгө алга. Худалдан авалт бичихдээ «НӨАТ данс → 180500 — Хойшлуулах» сонгосон хөрөнгө энд харагдана.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {year} оны {MONTH_NAMES[month - 1]} сарын хойшлогдсон НӨАТ — тэнцүү хэсгээр хасах (тоног 60 / барилга 120 сар).
          <span className="ml-2 text-zinc-400">Сонгосон: {selected.size} / {deferred.length}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {msg && <span className="text-sm text-green-700">{msg}</span>}
          {err && <span className="text-sm text-red-700">{err}</span>}
          <button type="button" onClick={handleCompute} disabled={isPending}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
            НӨАТ тооцох
          </button>
          <button type="button" onClick={handleSave} disabled={isPending || !shown || selected.size === 0}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40">
            {isPending ? "Хадгалж байна…" : "Хадгалах"}
          </button>
          <button type="button" onClick={handleDelete} disabled={isPending}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
            Устгах
          </button>
        </div>
      </div>

      {!shown && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Хөрөнгөө сонгоод <b>«НӨАТ тооцох»</b> дарна уу. Дараа нь <b>«Хадгалах»</b> дарж GL журнал (Дт 130600 / Кт 180500) бичнэ.
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Бүгд" /></th>
              <th className="px-3 py-2">Хөрөнгө</th>
              <th className="px-3 py-2 text-right">Нийт НӨАТ</th>
              <th className="px-3 py-2 text-right">Хугацаа</th>
              <th className="px-3 py-2">Эхэлсэн</th>
              <th className="px-3 py-2 text-right">Сарын хасалт</th>
              <th className="px-3 py-2 text-right">Хасагдсан</th>
              <th className="px-3 py-2 text-right">Үлдэгдэл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map(({ asset: a, c }) => {
              const on = selected.has(a.id);
              return (
                <tr key={a.id} className={on ? "bg-zinc-50/60 hover:bg-zinc-50" : "opacity-60 hover:bg-zinc-50"}>
                  <td className="px-3 py-2"><input type="checkbox" checked={on} onChange={() => toggle(a.id)} aria-label={a.name} /></td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="font-medium text-zinc-800">{a.name}</div>
                    <div className="text-xs text-zinc-400">{a.company || "—"}</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{fmt(a.deferred_vat)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{a.deferred_vat_months || "—"} сар</td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-500">{a.deferred_vat_start || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-700">{shown ? (c.monthly > 0 ? fmt(c.monthly) : "—") : "•"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-600">{shown ? fmt(c.accumulated) : "•"}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-green-700">{shown ? fmt(c.remaining) : "•"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm font-semibold">
            <tr>
              <td colSpan={2} className="px-3 py-2 text-right text-zinc-500">Сонгосон {selected.size}:</td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-900">{fmt(totals.vat)}</td>
              <td /><td />
              <td className="px-3 py-2 text-right tabular-nums text-amber-700">{shown ? fmt(totals.monthly) : "•"}</td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-700">{shown ? fmt(totals.accum) : "•"}</td>
              <td className="px-3 py-2 text-right tabular-nums text-green-700">{shown ? fmt(totals.rem) : "•"}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        Хойшлогдсон НӨАТ (180500)-ыг эхэлсэн огнооноос хугацаагаар тэнцүү хувааж сар бүр хасна: <b>Дт 130600 НӨАТ авлага / Кт 180500</b>.
        Хасагдсан НӨАТ тухайн сарын НӨАТ тайланд нөхөгдөнө. Дахин хадгалахад тухайн сарын журнал шинэчлэгдэнэ.
      </p>
    </div>
  );
}
