"use client";

import { useState, useTransition } from "react";
import { updateJournalEntry } from "./actions";

export function EntryEditButton({
  id,
  partnerName,
  amount,
  partnerNames,
}: {
  id: number;
  partnerName: string;
  amount: number;
  partnerNames: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pn, setPn] = useState(partnerName);
  const [amt, setAmt] = useState(String(amount));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const save = () => {
    start(async () => {
      const r = await updateJournalEntry(id, pn, Number(amt));
      if (r.ok) {
        setOpen(false);
        // Хуудсыг сэргээж тооцоог дахин гаргана.
        window.location.reload();
      } else {
        setMsg(r.error);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => {
          setPn(partnerName);
          setAmt(String(amount));
          setMsg(null);
          setOpen(true);
        }}
        title="Гүйлгээ засах"
        className="text-zinc-300 hover:text-zinc-700"
      >
        ✎
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-800">
              Гүйлгээ засах
            </div>
            <div className="space-y-3 p-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-600">Харилцагч</span>
                <input
                  list="stmt-edit-partners"
                  value={pn}
                  onChange={(e) => setPn(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <datalist id="stmt-edit-partners">
                  {partnerNames.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-600">Дүн</span>
                <input
                  type="number"
                  value={amt}
                  onChange={(e) => setAmt(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-right text-sm tabular-nums"
                />
              </label>
              {msg && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                >
                  Болих
                </button>
                <button
                  onClick={save}
                  disabled={pending}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  {pending ? "…" : "Хадгалах"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
