"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTxnCounterparty } from "./actions";

// Харилцахын тайлан дээрх «Харилцагч» нүд — inline засвартай.
// datalist (нэрийн санал) нь хуудсанд нэг удаа render хийгддэг (listId).
export function CounterpartyCell({
  id,
  name,
  listId = "bank-cp-list",
}: {
  id: number;
  name: string | null;
  listId?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name ?? "");
  const [current, setCurrent] = useState(name ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function save() {
    setErr(null);
    start(async () => {
      const res = await updateTxnCounterparty(id, value);
      if (res.ok) {
        setCurrent(value.trim().replace(/\s+/g, " "));
        setEditing(false);
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  function cancel() {
    setValue(current);
    setEditing(false);
    setErr(null);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          list={listId}
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          placeholder="харилцагч"
          className="w-40 rounded border border-zinc-300 px-2 py-1 text-xs outline-none focus:border-zinc-900"
        />
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "…" : "✓"}
        </button>
        <button
          type="button"
          onClick={cancel}
          className="rounded border border-zinc-200 px-1.5 py-1 text-xs text-zinc-500 hover:bg-zinc-50"
        >
          ✕
        </button>
        {err && <span className="text-[10px] text-red-600">{err}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Харилцагчийн нэр засах"
      className="group flex items-center gap-1 text-left text-zinc-500 hover:text-zinc-900"
    >
      <span>{current || "—"}</span>
      <span className="opacity-0 transition-opacity group-hover:opacity-100">✏</span>
    </button>
  );
}
