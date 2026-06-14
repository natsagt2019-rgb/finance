import { computeAsset, resolveUsefulLife } from "@/lib/asset-calc";
import { AssetsToolbar, type SummaryExportRow } from "./assets-toolbar";
import type { AssetRow, CategoryRow } from "./types";

function fmt(n: number): string {
  return Math.round(Number(n) || 0).toLocaleString("en-US");
}

const MONTH_NAMES = [
  "1-р", "2-р", "3-р", "4-р", "5-р", "6-р",
  "7-р", "8-р", "9-р", "10-р", "11-р", "12-р",
];

type CatAgg = {
  name: string;
  cnt: number;
  cost: number;
  accum: number;
  net: number;
};

export function SummaryTab({
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
  const catById = new Map(categories.map((c) => [c.id, c]));

  // Ангилал бүрээр нэгтгэнэ (тухайн он/сарын байдлаар).
  const aggMap = new Map<string, CatAgg>();
  const NONE = "— ангилалгүй —";

  for (const a of assets) {
    const cat = a.category_id ? catById.get(a.category_id) : null;
    const key = cat?.name ?? NONE;
    const life = resolveUsefulLife(a.useful_life_years, cat?.useful_life_years);
    const c = computeAsset(
      {
        cost: Number(a.cost) || 0,
        salvageValue: Number(a.salvage_value) || 0,
        usefulLifeYears: life,
        acquiredDate: a.acquired_date,
        openingDate: a.opening_date,
        openingAccumDepreciation: Number(a.opening_accum_depreciation) || 0,
      },
      year,
      month,
    );
    const agg = aggMap.get(key) ?? { name: key, cnt: 0, cost: 0, accum: 0, net: 0 };
    agg.cnt += 1;
    agg.cost += Number(a.cost) || 0;
    agg.accum += c.accumulatedDepreciation;
    agg.net += c.netBookValue;
    aggMap.set(key, agg);
  }

  const shown = Array.from(aggMap.values()).sort((x, y) =>
    x.name.localeCompare(y.name, "mn"),
  );
  const totals = shown.reduce(
    (s, a) => ({
      cnt: s.cnt + a.cnt,
      cost: s.cost + a.cost,
      accum: s.accum + a.accum,
      net: s.net + a.net,
    }),
    { cnt: 0, cost: 0, accum: 0, net: 0 },
  );

  const exportRows: SummaryExportRow[] = shown.map((a) => ({
    category: a.name,
    cnt: a.cnt,
    cost: a.cost,
    accum: a.accum,
    net: a.net,
  }));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {year} оны {MONTH_NAMES[month - 1]} сарын байдлаар — ангиллын нэгтгэл
        </p>
        <div className="no-print">
          <AssetsToolbar rows={exportRows} fileLabel={`${year}-${month}`} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        {shown.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            Хөрөнгө бүртгэгдээгүй байна.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-4 py-2">Ангилал</th>
                <th className="px-4 py-2 text-right">Тоо</th>
                <th className="px-4 py-2 text-right">Анхны өртөг</th>
                <th className="px-4 py-2 text-right">Хуримтлагдсан элэгдэл</th>
                <th className="px-4 py-2 text-right">Үлдэгдэл өртөг</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shown.map((a) => (
                <tr key={a.name} className="hover:bg-zinc-50">
                  <td className="px-4 py-2 font-medium text-zinc-800">{a.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-500">
                    {a.cnt}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-900">
                    {fmt(a.cost)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                    {fmt(a.accum)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-green-700">
                    {fmt(a.net)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm font-semibold">
              <tr>
                <td className="px-4 py-2 text-right text-zinc-500">Нийт дүн:</td>
                <td className="px-4 py-2 text-right tabular-nums text-zinc-500">
                  {totals.cnt}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-zinc-900">
                  {fmt(totals.cost)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                  {fmt(totals.accum)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-green-700">
                  {fmt(totals.net)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
