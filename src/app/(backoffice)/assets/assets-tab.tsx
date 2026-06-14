import { resolveUsefulLife } from "@/lib/asset-calc";
import { RowActions } from "./row-actions";
import type { AssetRow, CategoryRow } from "./types";

function fmtMoney(n: number): string {
  return Math.round(Number(n) || 0).toLocaleString("en-US");
}

export function AssetsTab({
  assets,
  categories,
}: {
  assets: AssetRow[];
  categories: CategoryRow[];
}) {
  const catById = new Map(categories.map((c) => [c.id, c]));

  const totalCost = assets.reduce((s, a) => s + (Number(a.cost) || 0), 0);
  const activeCount = assets.filter((a) => a.status === "active").length;

  return (
    <div>
      {/* Нэгтгэлийн картууд */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Нийт хөрөнгө
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-blue-900">
            {assets.length}
          </p>
          <p className="mt-1 text-xs text-blue-600">{activeCount} идэвхтэй</p>
        </div>
        <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-green-600">
            Нийт анхны өртөг
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-green-900">
            {fmtMoney(totalCost)}₮
          </p>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-purple-600">
            Ангилал
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-purple-900">
            {categories.length}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white">
        {assets.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            Үндсэн хөрөнгө бүртгэгдээгүй байна.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2">№</th>
                  <th className="px-4 py-2">Нэр / код</th>
                  <th className="px-4 py-2">Ангилал</th>
                  <th className="px-4 py-2">Компани</th>
                  <th className="px-4 py-2">Эд хариуцагч</th>
                  <th className="px-4 py-2">Орсон огноо</th>
                  <th className="px-4 py-2 text-right">Анхны өртөг</th>
                  <th className="px-4 py-2 text-right">Ашиглах хугацаа</th>
                  <th className="px-4 py-2">Төлөв</th>
                  <th className="no-print px-4 py-2 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {assets.map((a, i) => {
                  const cat = a.category_id ? catById.get(a.category_id) : null;
                  const life = resolveUsefulLife(
                    a.useful_life_years,
                    cat?.useful_life_years,
                  );
                  return (
                    <tr key={a.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-2 text-zinc-400">{i + 1}</td>
                      <td className="px-4 py-2">
                        <div className="font-medium text-zinc-800">{a.name}</div>
                        {a.code && (
                          <div className="text-xs text-zinc-400">{a.code}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                        {cat?.name || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                        {a.company || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                        {a.responsible || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                        {a.acquired_date || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-zinc-800">
                        {fmtMoney(a.cost)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-zinc-500">
                        {life} жил
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            a.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {a.status === "active" ? "Идэвхтэй" : "Актласан"}
                        </span>
                      </td>
                      <td className="no-print whitespace-nowrap px-4 py-2 text-right">
                        <RowActions id={a.id} label={a.name} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
