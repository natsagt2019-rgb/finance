"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { fmt } from "@/lib/cash-calc";
import { createRegister } from "./actions";
import { RegisterDelete } from "./row-actions";
import {
  COMPANIES,
  CURRENCIES,
  type AccountOption,
  type RegisterRow,
} from "./types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

export function RegistersTab({
  registers,
  accounts,
  balances,
}: {
  registers: RegisterRow[];
  accounts: AccountOption[];
  balances: Record<number, number>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const accountName = new Map(accounts.map((a) => [a.id, `${a.code} — ${a.name}`]));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const res = await createRegister(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-200 bg-white p-6"
      >
        <h2 className="text-sm font-semibold text-zinc-800">Шинэ касс нэмэх</h2>
        {accounts.length === 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Данс олдсонгүй. Эхлээд дансны төлөвлөгөөгөө оруулна уу.
          </div>
        )}
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Кассын нэр</label>
            <input
              type="text"
              name="name"
              required
              placeholder="Төв касс"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Валют</label>
            <select name="currency" defaultValue="MNT" className={inputCls}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Компани</label>
            <select name="company" defaultValue="" className={inputCls}>
              <option value="">— сонгох —</option>
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Бэлэн мөнгөний данс</label>
            <select name="account_id" defaultValue="" className={inputCls}>
              <option value="">— сонгох —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-400">
              Энэ кассын орлого/зарлагын журнал энэ дансыг хэрэглэнэ.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Тэмдэглэл</label>
            <input type="text" name="note" className={inputCls} />
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? "Хадгалж байна…" : "+ Касс нэмэх"}
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white">
        {registers.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            Касс бүртгэгдээгүй байна. Дээрх формоор нэмнэ үү.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Нэр</th>
                  <th className="px-4 py-2">Валют</th>
                  <th className="px-4 py-2">Данс</th>
                  <th className="px-4 py-2">Компани</th>
                  <th className="px-4 py-2 text-right">Үлдэгдэл (₮)</th>
                  <th className="no-print px-4 py-2 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {registers.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2 font-medium text-zinc-800">{r.name}</td>
                    <td className="px-4 py-2 text-zinc-600">{r.currency}</td>
                    <td className="px-4 py-2 text-zinc-500">
                      {r.account_id ? (
                        accountName.get(r.account_id) ?? `#${r.account_id}`
                      ) : (
                        <span className="text-amber-600">данс сонгоогүй</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">{r.company || "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium text-zinc-900">
                      {fmt(balances[r.id] ?? 0)}
                    </td>
                    <td className="no-print whitespace-nowrap px-4 py-2 text-right">
                      <RegisterDelete id={r.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
