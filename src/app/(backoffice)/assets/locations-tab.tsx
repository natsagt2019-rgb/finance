"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createLocation, updateLocation, deleteLocation } from "./actions";
import type { AssetRow, LocationRow } from "./types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

export function LocationsTab({
  locations,
  assets,
}: {
  locations: LocationRow[];
  assets: AssetRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // Байршил тус бүрийн хөрөнгийн тоо.
  const countByLoc = new Map<number, number>();
  for (const a of assets)
    if (a.location_id != null)
      countByLoc.set(a.location_id, (countByLoc.get(a.location_id) ?? 0) + 1);

  // Баар кодтой хөрөнгүүд.
  const barcoded = assets.filter((a) => a.barcode);

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
    run(() => createLocation(formData), "Байршил нэмэгдлээ.");
    form.reset();
  }

  function handleUpdate(e: React.FormEvent<HTMLFormElement>, id: number) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    run(() => updateLocation(id, formData), "Байршил шинэчлэгдлээ.");
  }

  function handleDelete(id: number, name: string) {
    const n = countByLoc.get(id) ?? 0;
    if (!confirm(`${name} байршлыг устгах уу?${n > 0 ? ` (${n} хөрөнгө холбоотой)` : ""}`)) return;
    run(() => deleteLocation(id), "Байршил устгагдлаа.");
  }

  return (
    <div className="space-y-6">
      {/* ── Байршлын лавлах ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-800">Хөрөнгийн байршил</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Хөрөнгө байрлах газрын лавлах (Ашиглалт, Агуулах ...). Хөрөнгийн картад
            энэ жагсаалтаас сонгоно.
          </p>
        </div>

        {locations.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-zinc-500">
            Байршил алга. Доорх формоор нэмнэ үү.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Код</th>
                  <th className="px-4 py-2">Нэр</th>
                  <th className="px-4 py-2 text-right">Хөрөнгө</th>
                  <th className="no-print px-4 py-2 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {locations.map((l) =>
                  editing === l.id ? (
                    <tr key={l.id} className="bg-amber-50/40">
                      <td colSpan={4} className="px-4 py-3">
                        <form
                          onSubmit={(e) => handleUpdate(e, l.id)}
                          className="flex flex-wrap items-end gap-3"
                        >
                          <div className="w-24">
                            <label className={labelCls}>Код</label>
                            <input name="code" defaultValue={l.code ?? ""} className={inputCls} />
                          </div>
                          <div className="min-w-48 flex-1">
                            <label className={labelCls}>Нэр *</label>
                            <input name="name" required defaultValue={l.name} className={inputCls} />
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
                    <tr key={l.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-2 text-zinc-500">{l.code || "—"}</td>
                      <td className="px-4 py-2 font-medium text-zinc-800">{l.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-zinc-600">
                        {countByLoc.get(l.id) ?? 0}
                      </td>
                      <td className="no-print whitespace-nowrap px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditing(l.id)}
                            className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Засах
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(l.id, l.name)}
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

      {/* Шинэ байршил нэмэх */}
      <form onSubmit={handleCreate} className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-800">Шинэ байршил нэмэх</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-24">
            <label className={labelCls}>Код</label>
            <input name="code" placeholder="003" className={inputCls} />
          </div>
          <div className="min-w-48 flex-1">
            <label className={labelCls}>
              Нэр <span className="text-red-500">*</span>
            </label>
            <input name="name" required placeholder="Салбар оффис" className={inputCls} />
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

      {/* ── Хөрөнгийн баар код ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-800">Хөрөнгийн баар код</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Баар код нь хөрөнгийн картад бүртгэгдэнэ. Энд бүртгэлтэйг жагсаав.
          </p>
        </div>
        {barcoded.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-zinc-500">
            Баар код бүртгэсэн хөрөнгө алга. Хөрөнгийн картаас «Баар код» талбарт оруулна.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Баар код</th>
                  <th className="px-4 py-2">Хөрөнгө</th>
                  <th className="px-4 py-2">Карт №</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {barcoded.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2 font-mono tabular-nums text-zinc-800">{a.barcode}</td>
                    <td className="px-4 py-2 text-zinc-700">{a.name}</td>
                    <td className="px-4 py-2 text-zinc-500">{a.code || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
    </div>
  );
}
