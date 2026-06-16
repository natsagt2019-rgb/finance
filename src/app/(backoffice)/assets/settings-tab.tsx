"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "./actions";
import type { CategoryRow } from "./types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

export function SettingsTab({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    setError(null);
    setMsg(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? "Алдаа гарлаа.");
        return;
      }
      setMsg(ok);
      setEditing(null);
      router.refresh();
    });
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    run(() => createCategory(formData), "Ангилал нэмэгдлээ.");
    form.reset();
  }

  function handleUpdate(e: React.FormEvent<HTMLFormElement>, id: number) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    run(() => updateCategory(id, formData), "Ангилал шинэчлэгдлээ.");
  }

  function handleDelete(id: number, name: string) {
    if (!confirm(`${name} ангиллыг устгах уу?`)) return;
    run(() => deleteCategory(id), "Ангилал устгагдлаа.");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-800">Хөрөнгийн ангилал</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Ангилал бүрийн анхдагч ашиглалтын хугацаа (жил) ба холбогдох данс.
            Хөрөнгийн картад хугацаа оруулаагүй бол энэ хугацааг ашиглана.
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-zinc-500">
            Ангилал алга. Доорх формоор нэмнэ үү (эсвэл scripts/assets-seed.sql).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Код</th>
                  <th className="px-4 py-2">Нэр</th>
                  <th className="px-4 py-2 text-right">Хугацаа (жил)</th>
                  <th className="px-4 py-2">Хөрөнгийн данс</th>
                  <th className="px-4 py-2">Хуримтлагдсан элэгдэл</th>
                  <th className="px-4 py-2">Элэгдлийн зардал</th>
                  <th className="no-print px-4 py-2 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {categories.map((c) =>
                  editing === c.id ? (
                    <tr key={c.id} className="bg-amber-50/40">
                      <td colSpan={7} className="px-4 py-3">
                        <form
                          onSubmit={(e) => handleUpdate(e, c.id)}
                          className="flex flex-wrap items-end gap-3"
                        >
                          <div className="w-24">
                            <label className={labelCls}>Код</label>
                            <input name="code" defaultValue={c.code ?? ""} className={inputCls} />
                          </div>
                          <div className="min-w-48 flex-1">
                            <label className={labelCls}>Нэр *</label>
                            <input name="name" required defaultValue={c.name} className={inputCls} />
                          </div>
                          <div className="w-28">
                            <label className={labelCls}>Хугацаа</label>
                            <input
                              type="number"
                              name="useful_life_years"
                              step="0.5"
                              min="0"
                              defaultValue={String(c.useful_life_years)}
                              className={`${inputCls} text-right tabular-nums`}
                            />
                          </div>
                          <div className="w-28">
                            <label className={labelCls}>Хөрөнгийн данс</label>
                            <input name="account_code" defaultValue={c.account_code ?? ""} className={inputCls} />
                          </div>
                          <div className="w-32">
                            <label className={labelCls}>Хуримтлагдсан элэгдэл</label>
                            <input name="accum_account_code" defaultValue={c.accum_account_code ?? ""} className={inputCls} />
                          </div>
                          <div className="w-32">
                            <label className={labelCls}>Элэгдлийн зардал</label>
                            <input name="expense_account_code" defaultValue={c.expense_account_code ?? ""} className={inputCls} />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              disabled={isPending}
                              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                            >
                              Хадгалах
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(null)}
                              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
                            >
                              Болих
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-2 text-zinc-500">{c.code || "—"}</td>
                      <td className="px-4 py-2 font-medium text-zinc-800">{c.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-zinc-700">
                        {c.useful_life_years}
                      </td>
                      <td className="px-4 py-2 text-zinc-500">{c.account_code || "—"}</td>
                      <td className="px-4 py-2 text-zinc-500">{c.accum_account_code || "—"}</td>
                      <td className="px-4 py-2 text-zinc-500">{c.expense_account_code || "—"}</td>
                      <td className="no-print whitespace-nowrap px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditing(c.id)}
                            className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Засах
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id, c.name)}
                            disabled={isPending}
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Устгах
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Шинэ ангилал нэмэх */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-zinc-200 bg-white p-6"
      >
        <h2 className="text-sm font-semibold text-zinc-800">Шинэ ангилал нэмэх</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-24">
            <label className={labelCls}>Код</label>
            <input name="code" placeholder="ҮХ-7" className={inputCls} />
          </div>
          <div className="min-w-48 flex-1">
            <label className={labelCls}>
              Нэр <span className="text-red-500">*</span>
            </label>
            <input name="name" required placeholder="Биет бус хөрөнгө" className={inputCls} />
          </div>
          <div className="w-28">
            <label className={labelCls}>Хугацаа (жил)</label>
            <input
              type="number"
              name="useful_life_years"
              step="0.5"
              min="0"
              defaultValue="10"
              className={`${inputCls} text-right tabular-nums`}
            />
          </div>
          <div className="w-28">
            <label className={labelCls}>Хөрөнгийн данс</label>
            <input name="account_code" placeholder="2170" className={inputCls} />
          </div>
          <div className="w-32">
            <label className={labelCls}>Хуримтлагдсан элэгдэл</label>
            <input name="accum_account_code" placeholder="2197" className={inputCls} />
          </div>
          <div className="w-32">
            <label className={labelCls}>Элэгдлийн зардал</label>
            <input name="expense_account_code" placeholder="9120" className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            + Нэмэх
          </button>
        </div>
      </form>

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
    </div>
  );
}
