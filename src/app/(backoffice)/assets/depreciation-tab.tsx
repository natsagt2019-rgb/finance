"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { computeAsset, resolveUsefulLife } from "@/lib/asset-calc";
import { saveDepreciation, type DepreciationInputRow } from "./actions";
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

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  // Зөвхөн орсон огноотой, идэвхтэй хөрөнгийг элэгдэлд оруулна.
  const computed = useMemo(() => {
    return assets.map((a) => {
      const cat = a.category_id ? catById.get(a.category_id) : null;
      const life = resolveUsefulLife(a.useful_life_years, cat?.useful_life_years);
      const c = computeAsset(
        {
          cost: Number(a.cost) || 0,
          salvageValue: Number(a.salvage_value) || 0,
          usefulLifeYears: life,
          acquiredDate: a.acquired_date,
        },
        year,
        month,
      );
      return { asset: a, category: cat ?? null, life, c };
    });
  }, [assets, catById, year, month]);

  const totals = computed.reduce(
    (s, { asset, c }) => ({
      cost: s.cost + (Number(asset.cost) || 0),
      monthly: s.monthly + c.monthlyDepreciation,
      accum: s.accum + c.accumulatedDepreciation,
      net: s.net + c.netBookValue,
    }),
    { cost: 0, monthly: 0, accum: 0, net: 0 },
  );

  function handleSave() {
    setMsg(null);
    const payload: DepreciationInputRow[] = computed.map(({ asset, category, life }) => ({
      asset_id: asset.id,
      asset_name: asset.name,
      category_name: category?.name ?? null,
      company: asset.company,
      cost: Number(asset.cost) || 0,
      salvage_value: Number(asset.salvage_value) || 0,
      useful_life_years: life,
      acquired_date: asset.acquired_date,
    }));
    startTransition(async () => {
      const res = await saveDepreciation(year, month, payload);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg(`${res.id} мөр хадгалагдлаа.`);
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
        </p>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-zinc-600">{msg}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
            <tr>
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
            {computed.map(({ asset: a, category, life, c }) => (
              <tr key={a.id} className="hover:bg-zinc-50">
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="font-medium text-zinc-800">{a.name}</div>
                  <div className="text-xs text-zinc-400">{a.company || "—"}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                  {category?.name || "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-800">
                  {fmt(a.cost)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-400">
                  {life} жил
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                  {c.monthlyDepreciation > 0 ? fmt(c.monthlyDepreciation) : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-600">
                  {fmt(c.accumulatedDepreciation)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-green-700">
                  {fmt(c.netBookValue)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm font-semibold">
            <tr>
              <td colSpan={2} className="px-3 py-2 text-right text-zinc-500">
                Нийт {computed.length} хөрөнгө:
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-900">
                {fmt(totals.cost)}
              </td>
              <td />
              <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                {fmt(totals.monthly)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                {fmt(totals.accum)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-green-700">
                {fmt(totals.net)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        Элэгдэл орсон сараас эхэлж, өртөг (үлдэгдэл өртөг хассан) дуустал тооцогдоно.
        «Хадгалах» дарвал тухайн сарын снапшот <code>asset_depreciation</code>-д бичигдэнэ.
      </p>
    </div>
  );
}
