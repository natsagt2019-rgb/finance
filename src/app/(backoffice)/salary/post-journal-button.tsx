"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { postSalaryMonthJournal } from "./actions";

// Нэгтгэл табаас тухайн сарын цалингийн журналыг GL-д бичих товч.
export function PostJournalButton({
  year,
  month,
  posted,
}: {
  year: number;
  month: number;
  posted: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handleClick() {
    if (
      posted &&
      !confirm(`${month}-р сарын цалингийн журнал бичигдсэн байна. Дахин бичих үү?`)
    )
      return;
    setMsg(null);
    startTransition(async () => {
      const res = await postSalaryMonthJournal(year, month);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        title={`${month}-р сарын цалингийн журнал бичих`}
        className={`rounded border px-2 py-0.5 text-xs font-medium disabled:opacity-40 ${
          posted
            ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
            : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
        }`}
      >
        {isPending ? "…" : posted ? "✓ бичсэн" : "Журналд бичих"}
      </button>
      {msg && <span className="text-[10px] text-rose-600">{msg}</span>}
    </div>
  );
}
