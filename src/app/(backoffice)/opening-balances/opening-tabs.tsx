"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { GrandBalance } from "./shared";

const TABS = [
  { href: "/opening-balances/financial-statement", label: "Санхүүгийн тайлангийн" },
  { href: "/opening-balances/accounts", label: "Дансны" },
  { href: "/opening-balances/partners", label: "Харилцагчийн" },
  { href: "/opening-balances/assets", label: "Үндсэн хөрөнгийн" },
  { href: "/opening-balances/inventory", label: "Барааны / хангамж" },
];

function fmt(n: number): string {
  if (!n) return "0";
  return Math.round(n).toLocaleString("en-US");
}

// Бүх дэд цэсэн дээр харагдах толгой: tab холбоосууд + он сонголт +
// (БҮХ source дээрх) нийт эхний үлдэгдлийн тэнцэл.
export function OpeningTabs({
  year,
  years,
  balance,
}: {
  year: number;
  years: number[];
  balance: GrandBalance;
}) {
  const pathname = usePathname();
  const balanced = Math.abs(balance.diff) < 0.5;

  const tab = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={`${href}?year=${year}`}
        className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          active
            ? "bg-zinc-900 text-white"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="print:hidden">
      {/* Tab холбоосууд */}
      <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-zinc-200 bg-white p-1.5">
        {TABS.map((t) => tab(t.href, t.label))}
        <form method="get" className="ml-auto flex items-center gap-2 px-2">
          <label className="text-xs text-zinc-500">Тайлант он</label>
          <select
            name="year"
            defaultValue={String(year)}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="rounded-lg border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-900"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y} ({y - 1}-12-31)
              </option>
            ))}
          </select>
        </form>
      </div>

      {/* Нийт тэнцэл (бүх дэд дэвтэр нийлбэр) */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">Нийт Дт (бүх төрөл)</div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-zinc-800">
            {fmt(balance.dr)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">Нийт Кт (бүх төрөл)</div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-zinc-800">
            {fmt(balance.cr)}
          </div>
        </div>
        <div
          className={`rounded-2xl border p-3 ${
            balanced ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
          }`}
        >
          <div className="text-xs text-zinc-500">Зөрүү</div>
          <div
            className={`mt-1 text-lg font-semibold tabular-nums ${
              balanced ? "text-green-700" : "text-red-700"
            }`}
          >
            {fmt(balance.diff)} {balanced ? "✓ тэнцэв" : "⚠"}
          </div>
        </div>
      </div>
    </div>
  );
}
