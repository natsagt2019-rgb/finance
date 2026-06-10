import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import {
  ASSET_SELECT,
  CATEGORY_SELECT,
  COMPANIES,
  TABS,
  type Tab,
  type AssetRow,
  type CategoryRow,
} from "./types";
import { AssetsTab } from "./assets-tab";
import { DepreciationTab } from "./depreciation-tab";
import { SummaryTab } from "./summary-tab";
import { SettingsTab } from "./settings-tab";

type SearchParams = {
  tab?: string;
  company?: string;
  year?: string;
  month?: string;
};

const TAB_LABELS: Record<Tab, string> = {
  assets: "Хөрөнгийн бүртгэл",
  depreciation: "Элэгдэл тооцоо",
  summary: "Нэгтгэл",
  settings: "Ангилал/тохиргоо",
};

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "")
    ? (sp.tab as Tab)
    : "assets";
  const company = (sp.company ?? "").trim();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : 2026;
  const monthNum = Number(sp.month);
  const month =
    monthNum >= 1 && monthNum <= 12 ? monthNum : Number(today.slice(5, 7));

  // Ангилал (идэвхтэй)
  const { data: catData } = await supabase
    .from("asset_categories")
    .select(CATEGORY_SELECT)
    .eq("is_active", true)
    .order("code", { ascending: true })
    .limit(500);
  const categories = (catData as CategoryRow[] | null) ?? [];

  // Хөрөнгө (идэвхтэй)
  const { data: assetData, error: assetErr } = await supabase
    .from("assets")
    .select(ASSET_SELECT)
    .eq("is_active", true)
    .order("company", { ascending: true })
    .order("name", { ascending: true })
    .limit(5000);
  const allAssets = (assetData as AssetRow[] | null) ?? [];
  const assets = company
    ? allAssets.filter((a) => a.company === company)
    : allAssets;

  const buildHref = (over: Partial<SearchParams>) => {
    const p = new URLSearchParams();
    const t = over.tab ?? tab;
    const c = over.company ?? company;
    const y = over.year ?? String(year);
    const m = over.month ?? String(month);
    if (t) p.set("tab", t);
    if (c) p.set("company", c);
    if (y) p.set("year", y);
    if (m) p.set("month", m);
    return `/assets?${p.toString()}`;
  };

  const tabCls = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${
      active
        ? "bg-zinc-900 text-white"
        : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
    }`;

  const chipCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${
      active
        ? "bg-zinc-900 text-white"
        : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
    }`;

  const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const showCompanyFilter = tab !== "settings";
  const showPeriod = tab === "depreciation" || tab === "summary";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">
            🏗 Үндсэн хөрөнгө
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Хөрөнгийн бүртгэл, шулуун шугамын элэгдэл тооцоо, ангилал тус бүрийн
            нэгтгэл.
          </p>
        </div>
        {tab === "assets" && (
          <Link
            href="/assets/new"
            className="no-print rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + Хөрөнгө нэмэх
          </Link>
        )}
      </div>

      {/* Таб navigation */}
      <div className="no-print mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t} href={buildHref({ tab: t })} className={tabCls(tab === t)}>
            {TAB_LABELS[t]}
          </Link>
        ))}
      </div>

      {assetErr && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Алдаа: {assetErr.message}
          <p className="mt-1 text-zinc-500">
            assets хүснэгт үүссэн эсэхийг шалгана уу (scripts/assets-schema.sql).
          </p>
        </div>
      )}

      {/* Шүүлтийн мөр: он/сар + компани */}
      {(showCompanyFilter || showPeriod) && (
        <div className="no-print mt-5 flex flex-wrap items-center gap-3">
          {showPeriod && (
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
          )}

          {showCompanyFilter && (
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
          )}
        </div>
      )}

      <div className="mt-5">
        {tab === "assets" && (
          <AssetsTab assets={assets} categories={categories} />
        )}
        {tab === "depreciation" && (
          <DepreciationTab
            key={`${year}-${month}-${company}`}
            assets={assets}
            categories={categories}
            year={year}
            month={month}
          />
        )}
        {tab === "summary" && (
          <SummaryTab
            assets={assets}
            categories={categories}
            year={year}
            month={month}
          />
        )}
        {tab === "settings" && <SettingsTab categories={categories} />}
      </div>
    </div>
  );
}
