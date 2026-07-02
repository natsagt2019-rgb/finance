"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  importCounterparties,
  upsertCounterparty,
  deleteCounterparty,
} from "./actions";

export type CpRow = { account_no: string; name: string };

export function CounterpartiesClient({ rows }: { rows: CpRow[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [q, setQ] = useState("");
  const [newAcct, setNewAcct] = useState("");
  const [newName, setNewName] = useState("");
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.account_no.toLowerCase().includes(s) ||
        r.name.toLowerCase().includes(s),
    );
  }, [rows, q]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    start(async () => {
      const res = await importCounterparties(fd);
      if (res.ok)
        setMsg({
          ok: true,
          text: `✓ ${res.distinct} данс шинэчлэв (${res.total} мөр уншсан).`,
        });
      else setMsg({ ok: false, text: res.error });
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  function addOne() {
    start(async () => {
      const res = await upsertCounterparty(newAcct, newName);
      if (res.ok) {
        setMsg({ ok: true, text: "✓ Хадгаллаа." });
        setNewAcct("");
        setNewName("");
      } else setMsg({ ok: false, text: res.error });
      router.refresh();
    });
  }

  function remove(acct: string) {
    start(async () => {
      const res = await deleteCounterparty(acct);
      if (!res.ok) setMsg({ ok: false, text: res.error });
      router.refresh();
    });
  }

  const inputCls =
    "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-900";

  return (
    <div className="space-y-5">
      {/* Импорт */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="font-semibold text-zinc-800">Excel-ээс лавлах импорт</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Файлд <b>харьцсан дансны дугаар</b> ба <b>харилцагчийн нэр</b> багана
          байхад хангалттай — багана хаана ч байсан (код/нэр/данс дараалал ч
          болно), бүх sheet-ийг уншиж автоматаар таньна. Толгой мөр алгасагдана,
          нэг данс олон нэртэй бол олонхыг авна. Байгаа дансыг шинэчилж шинийг
          нэмнэ.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
          >
            {pending ? "Уншиж байна…" : "↥ Excel-ээс импорт"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={onFile}
            className="hidden"
          />
        </div>
      </div>

      {msg && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
        >
          {msg.text}
        </div>
      )}

      {/* Гар оруулга */}
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Дансны дугаар
          <input
            value={newAcct}
            onChange={(e) => setNewAcct(e.target.value)}
            placeholder="ж: 5013135904"
            className={`${inputCls} w-44`}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-500">
          Харилцагчийн нэр
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ж: ОТГОНЖАРГАЛ ЭНХМАНЛАЙ"
            className={`${inputCls} w-full`}
          />
        </label>
        <button
          type="button"
          disabled={pending || !newAcct.trim() || !newName.trim()}
          onClick={addOne}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          + Нэмэх / засах
        </button>
      </div>

      {/* Жагсаалт */}
      <div>
        <div className="mb-2 flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Данс эсвэл нэрээр хайх…"
            className={`${inputCls} w-72`}
          />
          <span className="text-sm text-zinc-500">
            Нийт {rows.length}
            {q ? ` · олдсон ${filtered.length}` : ""}
          </span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-3 py-2">Харьцсан данс</th>
                <th className="px-3 py-2">Харилцагчийн нэр</th>
                <th className="px-3 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-zinc-400">
                    {rows.length === 0
                      ? "Лавлах хоосон байна. Excel-ээс импортлоно уу."
                      : "Хайлтад тохирох бичлэг алга."}
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 500).map((r) => (
                  <tr key={r.account_no}>
                    <td className="px-3 py-1.5 font-mono text-xs text-zinc-600">
                      {r.account_no}
                    </td>
                    <td className="px-3 py-1.5 text-zinc-800">{r.name}</td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => remove(r.account_no)}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        Устгах
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 500 && (
          <p className="mt-2 text-xs text-zinc-400">
            Эхний 500 харуулав — хайлтаар нарийсгана уу.
          </p>
        )}
      </div>
    </div>
  );
}
