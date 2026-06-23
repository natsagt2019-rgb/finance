"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLocation, deleteLocation } from "./actions";

export type LocationRow = {
  id: number; code: string | null; name: string; keeper: string | null; note: string | null;
};

export function LocationsClient({ locations }: { locations: LocationRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    start(async () => {
      const res = await createLocation(fd);
      if (res.ok) { (e.target as HTMLFormElement).reset(); router.refresh(); setMsg("✓ Байршил нэмэгдлээ."); }
      else setMsg(res.error);
    });
  }
  function remove(id: number) {
    if (!window.confirm("Энэ байршлыг устгах уу?")) return;
    start(async () => { await deleteLocation(id); router.refresh(); });
  }

  const inp = "rounded-lg border border-zinc-300 px-3 py-2 text-sm";

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Код
          <input name="code" placeholder="A1" className={`${inp} w-24`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Нэр *
          <input name="name" required placeholder="Төв агуулах" className={`${inp} w-56`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Няраж
          <input name="keeper" placeholder="хариуцагчийн нэр" className={`${inp} w-48`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">Тэмдэглэл
          <input name="note" className={`${inp} w-48`} />
        </label>
        <button type="submit" disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
          {pending ? "Хадгалж байна…" : "Нэмэх"}
        </button>
        {msg && <span className={`text-xs ${msg.startsWith("✓") ? "text-green-700" : "text-red-600"}`}>{msg}</span>}
      </form>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Код</th>
              <th className="px-3 py-2 text-left">Нэр</th>
              <th className="px-3 py-2 text-left">Няраж</th>
              <th className="px-3 py-2 text-left">Тэмдэглэл</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {locations.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-zinc-400">Байршил бүртгээгүй байна.</td></tr>
            ) : null}
            {locations.map((l) => (
              <tr key={l.id} className="hover:bg-zinc-50">
                <td className="px-3 py-1.5 font-mono text-xs text-zinc-500">{l.code ?? ""}</td>
                <td className="px-3 py-1.5 text-zinc-700">{l.name}</td>
                <td className="px-3 py-1.5 text-zinc-500">{l.keeper ?? ""}</td>
                <td className="px-3 py-1.5 text-zinc-500">{l.note ?? ""}</td>
                <td className="px-3 py-1.5 text-right">
                  <button type="button" onClick={() => remove(l.id)} className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50">Устгах</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
