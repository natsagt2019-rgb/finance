"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveSettings } from "./actions";
import type { AccountOption, CashSettings } from "./types";

const selectCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

const STD_ACCOUNTS: { key: keyof CashSettings; label: string; hint: string }[] = [
  {
    key: "default_income_account_id",
    label: "Орлогын анхдагч данс",
    hint: "баримтад заагаагүй үед орлогын Кт",
  },
  {
    key: "default_expense_account_id",
    label: "Зарлагын анхдагч данс",
    hint: "баримтад заагаагүй үед зарлагын Дт",
  },
];

export function SettingsTab({
  settings,
  accounts,
}: {
  settings: CashSettings | null;
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        <h2 className="text-sm font-semibold text-zinc-800">Анхдагч данснууд</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Баримт дээр «нөгөө тал данс» сонгоогүй үед журналд хэрэглэх анхдагч данс.
        </p>
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
          Баримт бүрт журнал автоматаар үүсгэх
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
