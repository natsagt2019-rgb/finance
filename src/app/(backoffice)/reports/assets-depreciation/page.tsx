import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { computeAsset, resolveUsefulLife, revisionInput } from "@/lib/asset-calc";
import {
  ASSET_SELECT,
  CATEGORY_SELECT,
  type AssetRow,
  type CategoryRow,
} from "../../assets/types";

export const metadata = { title: "Үндсэн хөрөнгө — элэгдлийн тайлан" };

const fmt = (n: number) => Math.round(Number(n) || 0).toLocaleString("en-US");

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const PAGE = 1000; const rows: T[] = [];
  for (let off = 0; off < 200000; off += PAGE) {
    const { data, error } = await build(off, off + PAGE - 1);
    if (error) break;
    const page = (data as T[] | null) ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

export default async function AssetsDepreciationReport({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : 2026;
  const mn = Number(sp.month);
  const month = mn >= 1 && mn <= 12 ? mn : 6;

  const supabase = await createClient();
  const [assets, cats] = await Promise.all([
    fetchAll<AssetRow>((f, t) => supabase.from("assets").select(ASSET_SELECT).eq("is_active", true).eq("status", "active").order("name", { ascending: true }).range(f, t)),
    fetchAll<CategoryRow>((f, t) => supabase.from("asset_categories").select(CATEGORY_SELECT).eq("is_active", true).range(f, t)),
  ]);
  const catById = new Map(cats.map((c) => [c.id, c]));

  const rows = assets.map((a) => {
    const cat = a.category_id ? catById.get(a.category_id) : null;
    const life = resolveUsefulLife(a.useful_life_years, cat?.useful_life_years);
    const c = computeAsset(
      { cost: Number(a.cost) || 0, salvageValue: Number(a.salvage_value) || 0, usefulLifeYears: life, acquiredDate: a.acquired_date, openingDate: a.opening_date, openingAccumDepreciation: Number(a.opening_accum_depreciation) || 0, ...revisionInput(a) },
      year, month,
    );
    return { a, cat, c };
  });

  const tot = rows.reduce((s, { c }) => ({ cost: s.cost + c.netBookValue + c.accumulatedDepreciation, monthly: s.monthly + c.monthlyDepreciation, accum: s.accum + c.accumulatedDepreciation, nbv: s.nbv + c.netBookValue }), { cost: 0, monthly: 0, accum: 0, nbv: 0 });
  const grossOf = (a: AssetRow) => Number(a.revision_cost ?? a.cost) || 0;
  const totCost = rows.reduce((s, { a }) => s + grossOf(a), 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">📉 Үндсэн хөрөнгө — элэгдлийн тайлан</h1>
          <p className="mt-1 text-sm text-zinc-500">{year} оны {month}-р сарын байдлаар — хөрөнгө тус бүрийн сарын элэгдэл, хуримтлагдсан, үлдэгдэл өртөг.</p>
        </div>
        <PrintButton />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Хөрөнгө</th>
              <th className="px-3 py-2 text-left">Ангилал</th>
              <th className="px-3 py-2 text-right">Анхны өртөг</th>
              <th className="px-3 py-2 text-right">Сарын элэгдэл</th>
              <th className="px-3 py-2 text-right">Хуримтлагдсан</th>
              <th className="px-3 py-2 text-right">Үлдэгдэл өртөг</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map(({ a, cat, c }) => (
              <tr key={a.id} className="hover:bg-zinc-50">
                <td className="px-3 py-2 text-zinc-700">
                  {a.name}{a.code && <span className="ml-1 font-mono text-xs text-zinc-400">{a.code}</span>}
                </td>
                <td className="px-3 py-2 text-zinc-500">{cat?.name || "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700">{fmt(grossOf(a))}</td>
                <td className="px-3 py-2 text-right tabular-nums text-amber-700">{c.monthlyDepreciation > 0 ? fmt(c.monthlyDepreciation) : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-600">{fmt(c.accumulatedDepreciation)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-green-700">{fmt(c.netBookValue)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-zinc-300 bg-zinc-900 font-semibold text-white">
              <td colSpan={2} className="px-3 py-2">НИЙТ ({rows.length} хөрөнгө)</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(totCost)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(tot.monthly)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(tot.accum)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(tot.nbv)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
