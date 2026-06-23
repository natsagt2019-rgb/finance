import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import {
  ITEM_SELECT,
  MOVE_SELECT,
  SETTINGS_SELECT,
  TABS,
  type Tab,
  type ItemRow,
  type MoveRow,
  type InvSettings,
  type AccountOption,
  type PartnerOption,
} from "./types";
import { ItemsTab } from "./items-tab";
import { MovesTab } from "./moves-tab";
import { StockTab } from "./stock-tab";
import { CountTab } from "./count-tab";
import { SettingsTab } from "./settings-tab";

type SearchParams = {
  tab?: string;
  company?: string;
  year?: string;
  month?: string;
};

const TAB_LABELS: Record<Tab, string> = {
  items: "Бараа",
  moves: "Хөдөлгөөн",
  stock: "Үлдэгдэл",
  count: "Тооллого",
  settings: "Тохиргоо",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "")
    ? (sp.tab as Tab)
    : "items";
  const company = (sp.company ?? "").trim();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : 2026;
  const monthNum = Number(sp.month);
  const month =
    monthNum >= 1 && monthNum <= 12 ? monthNum : Number(today.slice(5, 7));

  // PostgREST-ийн max-rows (≈1000) хязгаараас болж нэг .limit() том датад
  // хүрэлцэхгүй (1000+ мөр бол таслагдаж үлдэгдэл буруу гарна). inv_items ба
  // inv_moves-ийг .range()-ээр хуудаслаж БҮРЭН татна.
  async function fetchAll<T>(
    build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  ): Promise<{ rows: T[]; error: { message: string } | null }> {
    const PAGE = 1000;
    const rows: T[] = [];
    for (let offset = 0; offset < 500000; offset += PAGE) {
      const { data, error } = await build(offset, offset + PAGE - 1);
      if (error) return { rows, error };
      const page = (data as T[] | null) ?? [];
      rows.push(...page);
      if (page.length < PAGE) break;
    }
    return { rows, error: null };
  }

  const [
    { rows: itemRows, error: itemErr },
    { rows: moveRows },
    { data: setData },
    { data: accData },
    { data: partData },
    { data: empData },
  ] = await Promise.all([
    fetchAll<ItemRow>((from, to) =>
      supabase
        .from("inv_items")
        .select(ITEM_SELECT)
        .eq("is_active", true)
        .order("category_code", { ascending: true })
        .order("name", { ascending: true })
        .range(from, to)),
    fetchAll<MoveRow>((from, to) =>
      supabase
        .from("inv_moves")
        .select(MOVE_SELECT)
        .order("date", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to)),
    supabase.from("inv_settings").select(SETTINGS_SELECT).eq("id", 1).maybeSingle(),
    supabase
      .from("accounts")
      .select("id, code, name")
      .eq("is_active", true)
      .order("code", { ascending: true })
      .limit(3000),
    supabase
      .from("partners")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(3000),
    supabase
      .from("employees")
      .select("id, name, company")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(5000),
  ]);

  const allItems = itemRows;
  const items = company ? allItems.filter((i) => i.company === company) : allItems;
  const allMoves = moveRows;
  const settings = (setData as InvSettings | null) ?? null;
  const accounts = (accData as AccountOption[] | null) ?? [];
  const partners = (partData as PartnerOption[] | null) ?? [];
  const allEmployees =
    (empData as { id: number; name: string; company: string | null }[] | null) ?? [];
  const employees = company
    ? allEmployees.filter((e) => e.company === company)
    : allEmployees;

  // Үлдэгдэл/тооллого нь хуримтлагдсан тул бүх хөдөлгөөнийг (зөвхөн компаниар) авна.
  const itemIds = new Set(items.map((i) => i.id));
  const stockMoves = allMoves.filter((m) => itemIds.has(m.item_id));
  // Хөдөлгөөний жагсаалт — сонгосон он/сараар шүүнэ.
  const periodMoves = stockMoves.filter(
    (m) => m.year === year && m.month === month,
  );

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
    return `/inventory?${p.toString()}`;
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
  const showPeriod = tab === "moves";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">
            📦 Бараа материал
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Барааны бүртгэл, орлого/зарлага хөдөлгөөн, FIFO үлдэгдэл, тооллого.
          </p>
        </div>
        {tab === "items" && (
          <Link
            href={`/inventory/items/new${company ? `?company=${encodeURIComponent(company)}` : ""}`}
            className="no-print rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + Бараа нэмэх
          </Link>
        )}
        {tab === "moves" && (
          <Link
            href="/inventory/moves/new?type=receipt"
            className="no-print rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + Хөдөлгөөн нэмэх
          </Link>
        )}
      </div>

      <div className="no-print mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t} href={buildHref({ tab: t })} className={tabCls(tab === t)}>
            {TAB_LABELS[t]}
          </Link>
        ))}
      </div>

      {itemErr && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Алдаа: {itemErr.message}
          <p className="mt-1 text-zinc-500">
            inv_items хүснэгт үүссэн эсэхийг шалгана уу (scripts/inventory-schema.sql).
          </p>
        </div>
      )}

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
              {(["ТҮМЭН РЕСУРС", "ТҮМЭН ТЭЭХ"] as const).map((c) => (
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
        {tab === "items" && <ItemsTab items={items} moves={stockMoves} />}
        {tab === "moves" && (
          <MovesTab
            moves={periodMoves}
            items={allItems}
            accounts={accounts}
            partners={partners}
            year={year}
            month={month}
          />
        )}
        {tab === "stock" && (
          <StockTab
            items={items}
            moves={stockMoves}
            fileLabel={`${company || "бүгд"}_${today}`}
          />
        )}
        {tab === "count" && (
          <CountTab
            key={`${company}-${today}`}
            items={items}
            moves={stockMoves}
            employees={employees}
            company={company || null}
            today={today}
          />
        )}
        {tab === "settings" && (
          <SettingsTab settings={settings} accounts={accounts} />
        )}
      </div>
    </div>
  );
}
