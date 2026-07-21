import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { paramsFromSettings, DEFAULT_MONTH_HOURS_2026 } from "@/lib/salary-calc";
import {
  EMPLOYEE_SELECT,
  SALARY_SELECT,
  SETTINGS_SELECT,
  TABS,
  type Tab,
  type EmployeeRow,
  type SalaryRow,
  type SalarySettings,
} from "./types";
import { EmployeesTab } from "./employees-tab";
import { CalcTab } from "./calc-tab";
import { SummaryTab } from "./summary-tab";
import { InsuranceTab } from "./insurance-tab";
import { SettingsTab } from "./settings-tab";

type SearchParams = {
  tab?: string;
  company?: string;
  department?: string;
  year?: string;
  month?: string;
};

const TAB_LABELS: Record<Tab, string> = {
  employees: "Ажилтнууд",
  calc: "Цалин тооцоо",
  summary: "Нэгтгэл",
  insurance: "ЭМНД тайлан",
  settings: "Тохиргоо",
};

export default async function SalaryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "")
    ? (sp.tab as Tab)
    : "employees";
  const company = (sp.company ?? "").trim();
  const department = (sp.department ?? "").trim();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : 2026;
  const monthNum = Number(sp.month);
  const month =
    monthNum >= 1 && monthNum <= 12 ? monthNum : Number(today.slice(5, 7));

  // Ажилтнууд (идэвхтэй)
  const { data: empData, error: empErr } = await supabase
    .from("employees")
    .select(EMPLOYEE_SELECT)
    .eq("is_active", true)
    .order("company", { ascending: true })
    .order("name", { ascending: true })
    .limit(2000);
  const allEmployees = (empData as EmployeeRow[] | null) ?? [];
  // Шүүлтийн сонголтод харуулах хэлтсүүд (давхардалгүй).
  const departments = [
    ...new Set(
      allEmployees
        .map((e) => (e.department ?? "").trim())
        .filter((d): d is string => d.length > 0),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const employees = allEmployees.filter(
    (e) =>
      (!company || e.company === company) &&
      (!department || (e.department ?? "") === department),
  );

  // Сонгосон оны тохиргоо
  const { data: setData } = await supabase
    .from("salary_settings")
    .select(SETTINGS_SELECT)
    .eq("year", year)
    .maybeSingle();
  const settings = setData as SalarySettings | null;
  const monthHours = settings?.month_hours?.length
    ? settings.month_hours
    : DEFAULT_MONTH_HOURS_2026;
  const params = paramsFromSettings(settings);

  // Сонгосон оны цалингийн мөрүүд (calc + summary)
  const { data: recData } = await supabase
    .from("salary_records")
    .select(SALARY_SELECT)
    .eq("year", year)
    .eq("is_active", true)
    .limit(5000);
  const records = (recData as SalaryRow[] | null) ?? [];

  // Нээлттэй ажилчдын авлага (БМ дутагдал) — ажилтан тус бүрийн үлдэгдэл.
  const { data: srData } = await supabase
    .from("staff_receivables")
    .select("employee_id, amount, recovered")
    .eq("status", "open")
    .limit(10000);
  const staffReceivables: Record<number, number> = {};
  for (const r of srData ?? []) {
    const eid = r.employee_id as number | null;
    if (eid == null) continue;
    const open = (Number(r.amount) || 0) - (Number(r.recovered) || 0);
    if (open > 0) staffReceivables[eid] = (staffReceivables[eid] ?? 0) + open;
  }

  const buildHref = (over: Partial<SearchParams>) => {
    const p = new URLSearchParams();
    const t = over.tab ?? tab;
    const c = over.company ?? company;
    const d = over.department ?? department;
    const y = over.year ?? String(year);
    const m = over.month ?? String(month);
    if (t) p.set("tab", t);
    if (c) p.set("company", c);
    if (d) p.set("department", d);
    if (y) p.set("year", y);
    if (m) p.set("month", m);
    return `/salary?${p.toString()}`;
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
  const showPeriod = tab === "calc" || tab === "summary" || tab === "insurance";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">
            👥 Цалин
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Ажилтны бүртгэл, сар бүрийн цалин тооцоо, татвар, шимтгэлийн нэгтгэл.
          </p>
        </div>
        {tab === "employees" && (
          <Link
            href="/salary/employees/new"
            className="no-print rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + Ажилтан нэмэх
          </Link>
        )}
        {tab === "calc" && (
          <div className="no-print flex items-center gap-2">
            {(["cx-5b", "cx-5a"] as const).map((f) => {
              const q = new URLSearchParams();
              if (company) q.set("company", company);
              q.set("year", String(year));
              q.set("month", String(month));
              return (
                <Link
                  key={f}
                  href={`/salary/document/${f}?${q.toString()}`}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  🖨 {f === "cx-5b" ? "ЦХ-5б" : "ЦХ-5а"}
                </Link>
              );
            })}
          </div>
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

      {empErr && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Алдаа: {empErr.message}
          <p className="mt-1 text-zinc-500">
            employees хүснэгт үүссэн эсэхийг шалгана уу (scripts/salary-schema.sql).
          </p>
        </div>
      )}

      {/* Шүүлтийн мөр: он/сар */}
      {showPeriod && (
        <div className="no-print mt-5 flex flex-wrap items-center gap-2">
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

      {/* Хэлтэс тасгийн шүүлт (динамик — бүртгэлтэй хэлтсүүдээс) */}
      {showCompanyFilter && departments.length > 0 && (
        <div className="no-print mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-400">Хэлтэс:</span>
          <Link
            href={buildHref({ department: "" })}
            className={chipCls(!department)}
          >
            Бүх хэлтэс
          </Link>
          {departments.map((d) => (
            <Link
              key={d}
              href={buildHref({ department: d })}
              className={chipCls(department === d)}
            >
              {d}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5">
        {tab === "employees" && <EmployeesTab employees={employees} year={year} />}
        {tab === "calc" && (
          <CalcTab
            key={`${year}-${month}-${company}-${department}`}
            employees={employees}
            records={records.filter((r) => r.month === month)}
            year={year}
            month={month}
            monthHours={monthHours[month - 1] ?? 0}
            params={params}
            staffReceivables={staffReceivables}
          />
        )}
        {tab === "summary" && (
          <SummaryTab
            records={records.filter(
              (r) =>
                (!company || r.company === company) &&
                (!department || (r.department ?? "") === department),
            )}
            employees={allEmployees}
            year={year}
          />
        )}
        {tab === "insurance" && (
          <InsuranceTab
            monthRecords={records.filter(
              (r) =>
                r.month === month &&
                (!company || r.company === company) &&
                (!department || (r.department ?? "") === department),
            )}
            employees={allEmployees}
            year={year}
            month={month}
          />
        )}
        {tab === "settings" && <SettingsTab settings={settings} year={year} />}
      </div>
    </div>
  );
}
