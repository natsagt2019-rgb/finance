import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { computeAsset, resolveUsefulLife, revisionInput } from "@/lib/asset-calc";
import { ASSET_SELECT, CATEGORY_SELECT, type AssetRow, type CategoryRow } from "../../assets/types";

export const metadata = { title: "Үндсэн хөрөнгө — хасалт/борлуулалтын тайлан" };

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

function ym(date: string | null): [number, number] {
  const m = /^(\d{4})-(\d{2})/.exec(date ?? "");
  return m ? [Number(m[1]), Number(m[2])] : [2026, 12];
}

export default async function AssetsDisposalsReport() {
  const supabase = await createClient();
  const [assets, cats] = await Promise.all([
    fetchAll<AssetRow>((f, t) => supabase.from("assets").select(ASSET_SELECT).eq("is_active", true).eq("status", "disposed").order("disposed_date", { ascending: false }).range(f, t)),
    fetchAll<CategoryRow>((f, t) => supabase.from("asset_categories").select(CATEGORY_SELECT).eq("is_active", true).range(f, t)),
  ]);
  const catById = new Map(cats.map((c) => [c.id, c]));

  const rows = assets.map((a) => {
    const cat = a.category_id ? catById.get(a.category_id) : null;
    const life = resolveUsefulLife(a.useful_life_years, cat?.useful_life_years);
    const [y, m] = ym(a.disposed_date);
    const c = computeAsset(
      { cost: Number(a.cost) || 0, salvageValue: Number(a.salvage_value) || 0, usefulLifeYears: life, acquiredDate: a.acquired_date, openingDate: a.opening_date, openingAccumDepreciation: Number(a.opening_accum_depreciation) || 0, ...revisionInput(a) },
      y, m,
    );
    const isSale = a.disposal_type === "sale";
    const proceeds = Number(a.disposal_proceeds) || 0;
    const gainLoss = isSale ? Math.round((proceeds - c.netBookValue) * 100) / 100 : -c.netBookValue;
    return { a, cat, nbv: c.netBookValue, accum: c.accumulatedDepreciation, proceeds, vat: Number(a.disposal_vat) || 0, gainLoss, isSale };
  });

  const tot = rows.reduce((s, r) => ({ cost: s.cost + (Number(r.a.cost) || 0), nbv: s.nbv + r.nbv, proceeds: s.proceeds + r.proceeds, gl: s.gl + r.gainLoss }), { cost: 0, nbv: 0, proceeds: 0, gl: 0 });
  const sales = rows.filter((r) => r.isSale).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">❌ Үндсэн хөрөнгө — хасалт / борлуулалтын тайлан</h1>
          <p className="mt-1 text-sm text-zinc-500">Ашиглалтаас хассан хөрөнгө. Нийт {rows.length} (борлуулсан {sales}, актласан {rows.length - sales}).</p>
        </div>
        <PrintButton />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Огноо</th>
              <th className="px-3 py-2 text-left">Хөрөнгө</th>
              <th className="px-3 py-2 text-left">Төрөл</th>
              <th className="px-3 py-2 text-right">Анхны өртөг</th>
              <th className="px-3 py-2 text-right">Үлдэгдэл өртөг</th>
              <th className="px-3 py-2 text-right">Орлого</th>
              <th className="px-3 py-2 text-right">Олз / гарз</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-400">Хасагдсан хөрөнгө байхгүй байна.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.a.id} className="hover:bg-zinc-50">
                <td className="px-3 py-2 tabular-nums text-zinc-600">{r.a.disposed_date || "—"}</td>
                <td className="px-3 py-2 text-zinc-700">{r.a.name}{r.a.code && <span className="ml-1 font-mono text-xs text-zinc-400">{r.a.code}</span>}</td>
                <td className="px-3 py-2 text-zinc-500">{r.isSale ? "Борлуулалт" : "Хасалт"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700">{fmt(Number(r.a.cost))}</td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-600">{fmt(r.nbv)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700">{r.isSale ? fmt(r.proceeds) : "—"}</td>
                <td className={`px-3 py-2 text-right tabular-nums font-medium ${r.gainLoss >= 0 ? "text-green-700" : "text-red-700"}`}>{r.gainLoss >= 0 ? "+" : "−"}{fmt(Math.abs(r.gainLoss))}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-zinc-300 bg-zinc-900 font-semibold text-white">
              <td colSpan={3} className="px-3 py-2">НИЙТ ({rows.length})</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(tot.cost)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(tot.nbv)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(tot.proceeds)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{tot.gl >= 0 ? "+" : "−"}{fmt(Math.abs(tot.gl))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
