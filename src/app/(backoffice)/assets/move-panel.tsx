"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { moveAsset } from "./actions";
import type { AssetRow, LocationRow, MovementRow } from "./types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

export function MovePanel({
  asset,
  locations,
  movements,
}: {
  asset: AssetRow;
  locations: LocationRow[];
  movements: MovementRow[];
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

  const locById = new Map(locations.map((l) => [l.id, l]));
  const locName = (id: number | null) =>
    id != null ? locById.get(id)?.name ?? `#${id}` : "—";

  const curLoc = locName(asset.location_id);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const fd = new FormData();
    fd.set("move_type", moveType);
    fd.set("moved_date", movedDate);
    fd.set("to_responsible", toResponsible);
    fd.set("to_location_id", toLocationId);
    fd.set("note", note);
    startTransition(async () => {
      const res = await moveAsset(asset.id, fd);
      if (!res.ok) { setError(res.error); return; }
      setMsg("Хөдөлгөөн бүртгэгдлээ.");
      setToResponsible("");
      setToLocationId("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="text-base font-semibold text-zinc-900">Эзэмшил шилжүүлэх / хөдөлгөөн</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Одоогийн хариуцагч: <span className="text-zinc-600">{asset.responsible || "—"}</span>
        {" · "}байршил: <span className="text-zinc-600">{curLoc}</span>
      </p>

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <input
              type="text"
              value={toResponsible}
              onChange={(e) => setToResponsible(e.target.value)}
              placeholder={asset.responsible || "Б. Бат"}
              className={inputCls}
            />
          </div>
        ) : (
          <div>
            <label className={labelCls}>Шинэ байршил</label>
            <select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} className={inputCls}>
              <option value="">— сонгох —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code ? `${l.code} — ` : ""}{l.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className={labelCls}>Акт / тэмдэглэл</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ҮХ-4 актын дугаар / шалтгаан" className={inputCls} />
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? "Хадгалж байна…" : "Шилжүүлэх"}
          </button>
          {msg && <span className="text-sm text-green-700">{msg}</span>}
          {error && <span className="text-sm text-red-700">{error}</span>}
        </div>
      </form>

      {/* Хөдөлгөөний түүх */}
      {movements.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-zinc-700">Хөдөлгөөний түүх</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-1.5 pr-3">Огноо</th>
                  <th className="py-1.5 pr-3">Төрөл</th>
                  <th className="py-1.5 pr-3">Хариуцагч</th>
                  <th className="py-1.5 pr-3">Байршил</th>
                  <th className="py-1.5">Тэмдэглэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="py-1.5 pr-3 tabular-nums text-zinc-600">{m.moved_date}</td>
                    <td className="py-1.5 pr-3 text-zinc-500">
                      {m.move_type === "custody" ? "Эзэмшил" : "Дотоод"}
                    </td>
                    <td className="py-1.5 pr-3 text-zinc-700">
                      {m.from_responsible || "—"} → {m.to_responsible || "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-zinc-700">
                      {locName(m.from_location_id)} → {locName(m.to_location_id)}
                    </td>
                    <td className="py-1.5 text-zinc-400">{m.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
