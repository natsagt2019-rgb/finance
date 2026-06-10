"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CATEGORIES } from "@/lib/inventory-calc";
import { saveSettings } from "./actions";
import type { AccountOption, InvSettings } from "./types";

const selectCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

// Стандарт данснууд (нэр, талбар, тайлбар).
const STD_ACCOUNTS: { key: keyof InvSettings; label: string; hint: string }[] = [
  { key: "ap_account_id", label: "Нийлүүлэгчийн өглөг", hint: "орлогын кредит (Кт)" },
  { key: "vat_account_id", label: "НӨАТ-ын авлага", hint: "орлогын НӨАТ суутгал (Дт)" },
  { key: "cash_account_id", label: "Кассын бэлэн мөнгө", hint: "бэлэн худалдан авалт" },
  { key: "bank_account_id", label: "Харилцах данс", hint: "банкаар төлөх" },
  { key: "shortage_expense_account_id", label: "Дутагдал/устгал зардал", hint: "тооллого, устгал" },
  { key: "staff_receivable_account_id", label: "Ажилчдын авлага", hint: "ажилтанд хариуцуулах" },
  { key: "salary_payable_account_id", label: "Цалин хөлсний өглөг", hint: "цалингаас суутгах" },
];

export function SettingsTab({
  settings,
  accounts,
}: {
  settings: InvSettings | null;
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const catAccounts = (settings?.category_accounts as Record<string, number | null>) ?? {};

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveSettings(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMsg("Тохиргоо хадгалагдлаа.");
      router.refresh();
    });
  }

  const accountOptions = (
    <>
      <option value="">— сонгох —</option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.code} — {a.name}
        </option>
      ))}
    </>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-6"
    >
      {accounts.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Данс олдсонгүй. Эхлээд дансны төлөвлөгөөгөө оруулна уу.
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-zinc-800">
          Ангилал → бараа материалын данс
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Орлого/зарлагын журналд хэрэглэх бараа материалын данс. (Дүрмийн 120201–120299
          кодыг идэвхтэй дансны төлөвлөгөөний жинхэнэ данстай холбоно.)
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <div key={c.code}>
              <label className={labelCls}>
                {c.code} — {c.label}
              </label>
              <select
                name={`cat_${c.code}`}
                defaultValue={String(catAccounts[c.code] ?? "")}
                className={selectCls}
              >
                {accountOptions}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-800">Стандарт данснууд</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STD_ACCOUNTS.map((a) => (
            <div key={a.key}>
              <label className={labelCls}>
                {a.label} <span className="text-zinc-400">({a.hint})</span>
              </label>
              <select
                name={a.key}
                defaultValue={String((settings?.[a.key] as number | null) ?? "")}
                className={selectCls}
              >
                {accountOptions}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="auto_journal"
          name="auto_journal"
          defaultChecked={settings?.auto_journal !== false}
          className="h-4 w-4 rounded border-zinc-300"
        />
        <label htmlFor="auto_journal" className="text-sm text-zinc-700">
          Хөдөлгөөн бүрт журнал автоматаар үүсгэх
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {msg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {msg}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {isPending ? "Хадгалж байна…" : "Хадгалах"}
      </button>
    </form>
  );
}
