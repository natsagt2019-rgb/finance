import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { computeBook, balanceByRegister, type BookResult } from "@/lib/cash-calc";
import {
  ENTRY_SELECT,
  REGISTER_SELECT,
  SETTINGS_SELECT,
  TABS,
  type Tab,
  type EntryRow,
  type RegisterRow,
  type CashSettings,
  type AccountOption,
  type PartnerOption,
} from "./types";
import { EntriesTab } from "./entries-tab";
import { BookTab } from "./book-tab";
import { RegistersTab } from "./registers-tab";
import { SettingsTab } from "./settings-tab";

type SearchParams = {
  tab?: string;
  company?: string;
  year?: string;
  month?: string;
  reg?: string;
};

const TAB_LABELS: Record<Tab, string> = {
  entries: "Баримт",
  book: "Кассын дэвтэр",
  registers: "Касс",
  settings: "Тохиргоо",
};

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export default async function CashPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "")
    ? (sp.tab as Tab)
    : "entries";
  const company = (sp.company ?? "").trim();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : 2026;
  const monthNum = Number(sp.month);
  const month =
    monthNum >= 1 && monthNum <= 12 ? monthNum : Number(today.slice(5, 7));

  const [
    { data: regData, error: regErr },
    { data: entData },
    { data: setData },
    { data: accData },
    { data: partData },
  ] = await Promise.all([
    supabase
      .from("cash_registers")
      .select(REGISTER_SELECT)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(2000),
    supabase
      .from("cash_entries")
      .select(ENTRY_SELECT)
      .order("date", { ascending: false })
      .order("id", { ascending: false })
      .limit(50000),
    supabase.from("cash_settings").select(SETTINGS_SELECT).eq("id", 1).maybeSingle(),
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
  ]);

  const allRegisters = (regData as RegisterRow[] | null) ?? [];
  const registers = company
    ? allRegisters.filter((r) => r.company === company)
    : allRegisters;
  const allEntries = (entData as EntryRow[] | null) ?? [];
  const settings = (setData as CashSettings | null) ?? null;
  const accounts = (accData as AccountOption[] | null) ?? [];
  const partners = (partData as PartnerOption[] | null) ?? [];

  // Компаниар (кассаар) шүүсэн баримтууд.
  const regIds = new Set(registers.map((r) => r.id));
  const scopedEntries = company
    ? allEntries.filter((e) => regIds.has(e.register_id))
    : allEntries;
  const periodEntries = scopedEntries.filter(
    (e) => e.year === year && e.month === month,
  );

  // Касс бүрийн нийт үлдэгдэл (Касс таб).
  const balances = balanceByRegister(
    allEntries.map((e) => ({
      id: e.id,
      date: e.date,
      type: e.type,
      amount_mnt: Number(e.amount_mnt),
      register_id: e.register_id,
    })),
  );

  // Кассын дэвтэр — сонгосон кассын тухайн сарын running balance.
  const selectedRegId =
    sp.reg && registers.some((r) => r.id === Number(sp.reg))
      ? Number(sp.reg)
      : registers[0]?.id ?? null;

  let bookResult: BookResult<EntryRow> | null = null;
  if (selectedRegId != null) {
    const regEntries = allEntries.filter((e) => e.register_id === selectedRegId);
    const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
    let opening = 0;
    for (const e of regEntries) {
      if (e.date < periodStart)
        opening += (e.type === "in" ? 1 : -1) * Number(e.amount_mnt);
    }
    const inPeriod = regEntries.filter(
      (e) => e.year === year && e.month === month,
    );
    bookResult = computeBook(inPeriod, r2(opening));
  }

  const buildHref = (over: Partial<SearchParams>) => {
    const p = new URLSearchParams();
    const t = over.tab ?? tab;
    const c = over.company ?? company;
    const y = over.year ?? String(year);
    const m = over.month ?? String(month);
    const reg = over.reg ?? (selectedRegId != null ? String(selectedRegId) : "");
    if (t) p.set("tab", t);
    if (c) p.set("company", c);
    if (y) p.set("year", y);
    if (m) p.set("month", m);
    if (reg) p.set("reg", reg);
    return `/cash?${p.toString()}`;
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
  const showPeriod = tab === "entries" || tab === "book";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">
            🪙 Касс
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Бэлэн мөнгөний орлого/зарлагын баримт, кассын дэвтэр, олон касс. Журнал
            автоматаар үүснэ.
          </p>
        </div>
        {tab === "entries" && (
          <Link
            href="/cash/entries/new?type=in"
            className="no-print rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + Баримт нэмэх
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

      {regErr && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Алдаа: {regErr.message}
          <p className="mt-1 text-zinc-500">
            cash_registers хүснэгт үүссэн эсэхийг шалгана уу (scripts/cash-schema.sql).
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
        {tab === "entries" && (
          <EntriesTab
            entries={periodEntries}
            registers={allRegisters}
            accounts={accounts}
            partners={partners}
            year={year}
            month={month}
          />
        )}
        {tab === "book" && (
          <BookTab
            registers={registers}
            selectedRegId={selectedRegId}
            result={bookResult}
            year={year}
            month={month}
            hrefFor={(regId) => buildHref({ reg: String(regId) })}
          />
        )}
        {tab === "registers" && (
          <RegistersTab
            registers={allRegisters}
            accounts={accounts}
            balances={balances}
          />
        )}
        {tab === "settings" && (
          <SettingsTab settings={settings} accounts={accounts} />
        )}
      </div>
    </div>
  );
}
