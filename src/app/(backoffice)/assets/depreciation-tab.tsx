"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { computeAsset, resolveUsefulLife, revisionInput } from "@/lib/asset-calc";
import { saveDepreciation, deleteDepreciation, type DepreciationInputRow } from "./actions";
import type { AssetRow, CategoryRow } from "./types";

function fmt(n: number): string {
  return Math.round(Number(n) || 0).toLocaleString("en-US");
}

const MONTH_NAMES = [
  "1-р", "2-р", "3-р", "4-р", "5-р", "6-р",
  "7-р", "8-р", "9-р", "10-р", "11-р", "12-р",
];

export function DepreciationTab({
  assets,
  categories,
  year,
  month,
}: {
  assets: AssetRow[];
  categories: CategoryRow[];
  year: number;
  month: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Тооцоо харуулсан эсэх («Элэгдэл тооцох» дарсны дараа утгууд харагдана).
  const [shown, setShown] = useState(false);
  // Сонгосон хөрөнгүүд (анхдагчаар бүгд сонгосон).
  const [selected, setSelected] = useState<Set<number>>(() => new Set(assets.map((a) => a.id)));

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const rows = useMemo(() => {
    return assets.map((a) => {
      const cat = a.category_id ? catById.get(a.category_id) : null;
      const life = resolveUsefulLife(a.useful_life_years, cat?.useful_life_years);
      const c = computeAsset(
        {
          cost: Number(a.cost) || 0,
          salvageValue: Number(a.salvage_value) || 0,
          usefulLifeYears: life,
          acquiredDate: a.acquired_date,
          openingDate: a.opening_date,
          openingAccumDepreciation: Number(a.opening_accum_depreciation) || 0,
          ...revisionInput(a),
        },
        year,
        month,
      );
      return { asset: a, category: cat ?? null, life, c };
    });
  }, [assets, catById, year, month]);

  // Нийт дүн — зөвхөн сонгосон хөрөнгүүдээр.
  const totals = rows.reduce(
    (s, { asset, c }) =>
      selected.has(asset.id)
        ? {
            cost: s.cost + (Number(asset.cost) || 0),
            monthly: s.monthly + c.monthlyDepreciation,
            accum: s.accum + c.accumulatedDepreciation,
            net: s.net + c.netBookValue,
          }
        : s,
    { cost: 0, monthly: 0, accum: 0, net: 0 },
  );

  const allSelected = assets.length > 0 && selected.size === assets.length;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(assets.map((a) => a.id)));
  }

  function handleCompute() {
    setMsg(null);
    setErr(null);
    if (selected.size === 0) { setErr("Эхлээд хөрөнгөө сонгоно уу."); return; }
    setShown(true);
  }

  function handleSave() {
    setMsg(null);
    setErr(null);
    const payload: DepreciationInputRow[] = rows
      .filter(({ asset }) => selected.has(asset.id))
      .map(({ asset, category, life }) => ({
        asset_id: asset.id,
        asset_name: asset.name,
        category_name: category?.name ?? null,
        company: asset.company,
        cost: Number(asset.cost) || 0,
        salvage_value: Number(asset.salvage_value) || 0,
        useful_life_years: life,
        acquired_date: asset.acquired_date,
        opening_date: asset.opening_date,
        opening_accum_depreciation: Number(asset.opening_accum_depreciation) || 0,
        revision_date: asset.revision_date,
        revision_cost: asset.revision_cost,
        revision_accum: asset.revision_accum,
        revision_life_months: asset.revision_life_months,
      }));
    if (payload.length === 0) { setErr("Хадгалах хөрөнгө сонгоогүй байна."); return; }
    startTransition(async () => {
      const res = await saveDepreciation(year, month, payload);
      if (!res.ok) { setErr(res.error); return; }
      setMsg(`✓ ${res.id} хөрөнгийн ${MONTH_NAMES[month - 1]} сарын элэгдэл хадгалагдаж, GL журнал бичигдлээ.`);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`${year} оны ${MONTH_NAMES[month - 1]} сарын элэгдлийг устгах уу?\nСнапшот болон GL журнал бүхэлдээ цуцлагдана.`)) return;
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await deleteDepreciation(year, month);
      if (!res.ok) { setErr(res.error); return; }
      setMsg(`✓ ${MONTH_NAMES[month - 1]} сарын элэгдэл устгагдлаа (${res.id} мөр).`);
      setShown(false);
      router.refresh();
    });
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">
        Хөрөнгө бүртгэгдээгүй байна. Эхлээд «Хөрөнгийн бүртгэл» табаас хөрөнгө нэмнэ үү.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {year} оны {MONTH_NAMES[month - 1]} сарын элэгдэл — шулуун шугам.
          <span className="ml-2 text-zinc-400">Сонгосон: {selected.size} / {assets.length}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {msg && <span className="text-sm text-green-700">{msg}</span>}
          {err && <span className="text-sm text-red-700">{err}</span>}
          <button
            type="button"
            onClick={handleCompute}
            disabled={isPending}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Элэгдэл тооцох
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !shown || selected.size === 0}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
          >
            {isPending ? "Хадгалж байна…" : "Хадгалах"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Устгах
          </button>
        </div>
      </div>

      {!shown && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Хөрөнгөө сонгоод <b>«Элэгдэл тооцох»</b> дарна уу. Тооцоо харагдсаны дараа <b>«Хадгалах»</b> идэвхжинэ.
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Бүгдийг сонгох" />
              </th>
              <th className="px-3 py-2">Хөрөнгө</th>
              <th className="px-3 py-2">Ангилал</th>
              <th className="px-3 py-2 text-right">Анхны өртөг</th>
              <th className="px-3 py-2 text-right">Хугацаа</th>
              <th className="px-3 py-2 text-right">Сарын элэгдэл</th>
              <th className="px-3 py-2 text-right">Хуримтлагдсан</th>
              <th className="px-3 py-2 text-right">Үлдэгдэл өртөг</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map(({ asset: a, category, life, c }) => {
              const on = selected.has(a.id);
              return (
                <tr key={a.id} className={on ? "bg-zinc-50/60 hover:bg-zinc-50" : "opacity-60 hover:bg-zinc-50"}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={on} onChange={() => toggle(a.id)} aria-label={a.name} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="font-medium text-zinc-800">{a.name}</div>
                    <div className="text-xs text-zinc-400">{a.company || "—"}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-500">{category?.name || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{fmt(a.cost)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{life} жил</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                    {shown ? (c.monthlyDepreciation > 0 ? fmt(c.monthlyDepreciation) : "—") : "•"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-600">
                    {shown ? fmt(c.accumulatedDepreciation) : "•"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-green-700">
                    {shown ? fmt(c.netBookValue) : "•"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm font-semibold">
            <tr>
              <td colSpan={3} className="px-3 py-2 text-right text-zinc-500">
                Сонгосон {selected.size} хөрөнгө:
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-900">{fmt(totals.cost)}</td>
              <td />
              <td className="px-3 py-2 text-right tabular-nums text-amber-700">{shown ? fmt(totals.monthly) : "•"}</td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-700">{shown ? fmt(totals.accum) : "•"}</td>
              <td className="px-3 py-2 text-right tabular-nums text-green-700">{shown ? fmt(totals.net) : "•"}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        Сонгосон хөрөнгийг «Элэгдэл тооцох» → «Хадгалах» дарж тухайн сарын снапшот ба GL журнал (Дт 720300 / Кт 160900) бичнэ.
        Дахин хадгалахад тухайн сарын журнал шинэчлэгдэнэ (засах). «Устгах» нь сарын элэгдлийг бүхэлд нь цуцална.
      </p>
    </div>
  );
}
