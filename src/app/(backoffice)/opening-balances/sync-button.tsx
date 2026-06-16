"use client";

import { useState, useTransition } from "react";

export type SyncResult = { ok: boolean; message: string };

// Дэд дэвтрийн (хөрөнгө/бараа) эхний үлдэгдлийг журналд тусгах товч.
// action нь server action — эцсийн дүнг {ok, message}-ээр буцаана.
export function SyncButton({
  action,
  label,
  disabled,
}: {
  action: () => Promise<SyncResult>;
  label: string;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<SyncResult | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending || disabled}
        onClick={() => start(async () => setMsg(await action()))}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
      >
        {pending ? "Тусгаж байна…" : label}
      </button>
      {msg && (
        <span
          className={`rounded-lg px-3 py-1.5 text-sm ${
            msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.message}
        </span>
      )}
    </div>
  );
}
