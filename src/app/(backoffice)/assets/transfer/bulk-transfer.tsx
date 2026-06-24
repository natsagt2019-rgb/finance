"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { moveAssetsBulk } from "../actions";
import type { AssetRow, LocationRow } from "../types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

export function BulkTransfer({
  assets,
  locations,
}: {
  assets: AssetRow[];
  locations: LocationRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [moveType, setMoveType] = useState<"custody" | "internal">("custody");
  const [movedDate, setMovedDate] = useState(new Date().toISOString().slice(0, 10));
  const [toResponsible, setToResponsible] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const locById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.code ?? "").toLowerCase().includes(q) ||
        (a.responsible ?? "").toLowerCase().includes(q),
    );
  }, [assets, query]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id));

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((a) => next.delete(a.id));
      else filtered.forEach((a) => next.add(a.id));
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    if (selected.size === 0) { setError("Хөрөнгө сонгоно уу."); return; }
    const fd = new FormData();
    fd.set("move_type", moveType);
    fd.set("moved_date", movedDate);
    fd.set("to_responsible", toResponsible);
    fd.set("to_location_id", toLocationId);
    fd.set("note", note);
    startTransition(async () => {
      const res = await moveAssetsBulk([...selected], fd);
      if (!res.ok) { setError(res.error); return; }
      setMsg(`${res.id} хөрөнгө шилжүүллээ.`);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Төрөл</label>
            <div className="flex gap-2">
              {[
                { v: "custody", t: "Эзэмшил шилжүүлэх (хариуцагч)" },
                { v: "internal", t: "Дотоод хөдөлгөөн (байршил)" },
              ].map(({ v, t }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMoveType(v as "custody" | "internal")}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    moveType === v
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Огноо</label>
            <input type="date" value={movedDate} onChange={(e) => setMovedDate(e.target.value)} className={inputCls} />
          </div>

          {moveType === "custody" ? (
            <div>
              <label className={labelCls}>Шинэ эд хариуцагч</label>
              <input type="text" value={toResponsible} onChange={(e) => setToResponsible(e.target.value)} placeholder="Б. Бат" className={inputCls} />
            </div>
          ) : (
            <div>
              <label className={labelCls}>Шинэ байршил</label>
              <select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} className={inputCls}>
                <option value="">— сонгох —</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.code ? `${l.code} — ` : ""}{l.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className={labelCls}>Акт / тэмдэглэл</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ҮХ-4 актын дугаар / шалтгаан" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Хөрөнгө сонгох */}
      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-700">
              Сонгосон: {selected.size} / {assets.length}
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Хайх — нэр / код / хариуцагч"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-900"
            />
          </div>
          <button
            type="button"
            onClick={toggleAllFiltered}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {allFilteredSelected ? "Сонголт цуцлах" : "Бүгдийг сонгох"}
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-50 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-4 py-2 w-10"></th>
                <th className="px-4 py-2">Нэр / код</th>
                <th className="px-4 py-2">Хариуцагч</th>
                <th className="px-4 py-2">Байршил</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((a) => (
                <tr key={a.id} className="cursor-pointer hover:bg-zinc-50" onClick={() => toggle(a.id)}>
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-zinc-800">{a.name}</div>
                    {a.code && <div className="text-xs text-zinc-400">{a.code}</div>}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">{a.responsible || "—"}</td>
                  <td className="px-4 py-2 text-zinc-500">
                    {(a.location_id != null && locById.get(a.location_id)?.name) || a.location || "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-400">Хөрөнгө олдсонгүй.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || selected.size === 0}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? "Шилжүүлж байна…" : `${selected.size} хөрөнгө шилжүүлэх`}
        </button>
        {msg && <span className="text-sm text-green-700">{msg}</span>}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
    </form>
  );
}
