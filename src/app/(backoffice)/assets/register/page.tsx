import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { computeAsset, resolveUsefulLife } from "@/lib/asset-calc";
import {
  ASSET_SELECT,
  CATEGORY_SELECT,
  COMPANIES,
  type AssetRow,
  type CategoryRow,
} from "../types";
import { PrintButton } from "./print-button";

type SearchParams = {
  company?: string;
  year?: string;
  month?: string;
};

function fmt(n: number): string {
  return Math.round(Number(n) || 0).toLocaleString("en-US");
}

export default async function AssetRegisterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const company = (sp.company ?? "").trim();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : 2026;
  const monthNum = Number(sp.month);
  const month =
    monthNum >= 1 && monthNum <= 12 ? monthNum : Number(today.slice(5, 7));
  const asOf = `${year}-${String(month).padStart(2, "0")}-${today.slice(8, 10)}`;

  const [{ data: catData }, { data: assetData }] = await Promise.all([
    supabase
      .from("asset_categories")
      .select(CATEGORY_SELECT)
      .eq("is_active", true)
      .limit(500),
    supabase
      .from("assets")
      .select(ASSET_SELECT)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(5000),
  ]);
  const categories = (catData as CategoryRow[] | null) ?? [];
  const catById = new Map(categories.map((c) => [c.id, c]));
  const allAssets = (assetData as AssetRow[] | null) ?? [];
  const assets = company
    ? allAssets.filter((a) => a.company === company)
    : allAssets;

  // Эд хариуцагчаар бүлэглэнэ.
  const NONE = "— хариуцагчгүй —";
  const groups = new Map<string, AssetRow[]>();
  for (const a of assets) {
    const key = (a.responsible ?? "").trim() || NONE;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  const custodians = Array.from(groups.keys()).sort((x, y) =>
    x.localeCompare(y, "mn"),
  );

  const buildHref = (over: Partial<SearchParams>) => {
    const p = new URLSearchParams();
    const c = over.company ?? company;
    const y = over.year ?? String(year);
    const m = over.month ?? String(month);
    if (c) p.set("company", c);
    if (y) p.set("year", y);
    if (m) p.set("month", m);
    return `/assets/register?${p.toString()}`;
  };

  const chipCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${
      active
        ? "bg-zinc-900 text-white"
        : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
    }`;

  const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div>
      {/* Удирдлагын мөр (хэвлэхэд нуугдана) */}
      <div className="no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/assets?tab=assets"
            className="text-sm text-zinc-500 hover:text-zinc-800"
          >
            ← Үндсэн хөрөнгө
          </Link>
          <PrintButton />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            {[2025, 2026].map((y) => (
              <Link
                key={y}
                href={buildHref({ year: String(y) })}
                className={chipCls(year === y)}
              >
                {y}
              </Link>
            ))}
            <div className="flex flex-wrap gap-1">
              {MONTHS.map((m) => (
                <Link
                  key={m}
                  href={buildHref({ month: String(m) })}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    month === m
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {m}-р сар
                </Link>
              ))}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href={buildHref({ company: "" })} className={chipCls(!company)}>
              Бүх компани
            </Link>
            {COMPANIES.map((c) => (
              <Link
                key={c}
                href={buildHref({ company: c })}
                className={chipCls(company === c)}
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Тайлан — эд хариуцагч бүрээр нэг хэсэг */}
      <div className="mt-6 space-y-8 print:mt-0 print:space-y-0">
        {assets.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">
            Хөрөнгө бүртгэгдээгүй байна.
          </div>
        ) : (
          custodians.map((cust) => {
            const items = groups.get(cust)!;
            const companyName = items[0]?.company ?? "";
            const tasag =
              items.find((a) => a.location)?.location ?? "";

            let tCost = 0;
            let tAccum = 0;
            let tNet = 0;
            const rows = items.map((a, i) => {
              const cat = a.category_id ? catById.get(a.category_id) : null;
              const life = resolveUsefulLife(
                a.useful_life_years,
                cat?.useful_life_years,
              );
              const c = computeAsset(
                {
                  cost: Number(a.cost) || 0,
                  salvageValue: Number(a.salvage_value) || 0,
                  usefulLifeYears: life,
                  acquiredDate: a.acquired_date,
                  openingDate: a.opening_date,
                  openingAccumDepreciation:
                    Number(a.opening_accum_depreciation) || 0,
                },
                year,
                month,
              );
              tCost += Number(a.cost) || 0;
              tAccum += c.accumulatedDepreciation;
              tNet += c.netBookValue;
              return { a, i, cat, life, c };
            });

            return (
              <section
                key={cust}
                className="break-after-page rounded-2xl border border-zinc-200 bg-white p-6 print:rounded-none print:border-0 print:p-0"
              >
                <div className="text-center">
                  <p className="text-sm text-zinc-600">
                    Байгууллага:{" "}
                    <span className="font-semibold text-zinc-900">
                      {companyName || "—"}
                    </span>
                  </p>
                  <h1 className="mt-1 text-lg font-bold tracking-wide text-zinc-900">
                    ҮНДСЭН ХӨРӨНГИЙН ДЭЛГЭРЭНГҮЙ БҮРТГЭЛ
                  </h1>
                </div>

                <div className="mt-3 flex flex-wrap items-end justify-between gap-2 text-sm text-zinc-700">
                  <div className="space-y-0.5">
                    <p>
                      Тасаг:{" "}
                      <span className="font-medium">{tasag || "............."}</span>
                    </p>
                    <p>
                      Эд хариуцагч:{" "}
                      <span className="font-semibold text-zinc-900">{cust}</span>
                    </p>
                  </div>
                  <p>
                    Тайлант огноо:{" "}
                    <span className="font-medium">{asOf}</span>
                  </p>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-100 text-left text-zinc-600">
                        <th className="border border-zinc-300 px-2 py-1.5 text-center">
                          №
                        </th>
                        <th className="border border-zinc-300 px-2 py-1.5">
                          Хөрөнгийн нэр
                        </th>
                        <th className="border border-zinc-300 px-2 py-1.5">
                          Дугаар
                        </th>
                        <th className="border border-zinc-300 px-2 py-1.5">
                          Ангилал
                        </th>
                        <th className="border border-zinc-300 px-2 py-1.5 text-center">
                          Ашиглалтад орсон
                        </th>
                        <th className="border border-zinc-300 px-2 py-1.5 text-center">
                          Ашиглах хугацаа
                        </th>
                        <th className="border border-zinc-300 px-2 py-1.5 text-right">
                          Анхны өртөг
                        </th>
                        <th className="border border-zinc-300 px-2 py-1.5 text-right">
                          Хуримтлагдсан элэгдэл
                        </th>
                        <th className="border border-zinc-300 px-2 py-1.5 text-right">
                          Үлдэгдэл өртөг
                        </th>
                        <th className="border border-zinc-300 px-2 py-1.5">
                          Тайлбар
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ a, i, cat, life, c }) => (
                        <tr key={a.id}>
                          <td className="border border-zinc-300 px-2 py-1 text-center text-zinc-500">
                            {i + 1}
                          </td>
                          <td className="border border-zinc-300 px-2 py-1 text-zinc-900">
                            {a.name}
                          </td>
                          <td className="border border-zinc-300 px-2 py-1 text-zinc-600">
                            {a.code || "—"}
                          </td>
                          <td className="border border-zinc-300 px-2 py-1 text-zinc-600">
                            {cat?.name || "—"}
                          </td>
                          <td className="whitespace-nowrap border border-zinc-300 px-2 py-1 text-center text-zinc-600">
                            {a.acquired_date || "—"}
                          </td>
                          <td className="border border-zinc-300 px-2 py-1 text-center text-zinc-600">
                            {life} жил
                          </td>
                          <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums text-zinc-900">
                            {fmt(a.cost)}
                          </td>
                          <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums text-zinc-700">
                            {fmt(c.accumulatedDepreciation)}
                          </td>
                          <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums font-semibold text-zinc-900">
                            {fmt(c.netBookValue)}
                          </td>
                          <td className="border border-zinc-300 px-2 py-1 text-zinc-500">
                            {a.disposal_note || ""}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-zinc-50 font-semibold">
                        <td
                          colSpan={6}
                          className="border border-zinc-300 px-2 py-1.5 text-right text-zinc-700"
                        >
                          НИЙТ:
                        </td>
                        <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums text-zinc-900">
                          {fmt(tCost)}
                        </td>
                        <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums text-zinc-900">
                          {fmt(tAccum)}
                        </td>
                        <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums text-zinc-900">
                          {fmt(tNet)}
                        </td>
                        <td className="border border-zinc-300" />
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Гарын үсэг */}
                <div className="mt-8 flex justify-between gap-8 text-sm">
                  <div className="text-center">
                    <p className="text-zinc-500">Нягтлан бодогч</p>
                    <p className="mt-6 border-t border-zinc-400 px-8 pt-1 text-zinc-700">
                      /                    /
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-zinc-500">Эд хариуцагч</p>
                    <p className="mt-6 border-t border-zinc-400 px-8 pt-1 font-medium text-zinc-800">
                      {cust !== NONE ? cust : "/                    /"}
                    </p>
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
