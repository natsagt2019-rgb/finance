"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteJournal } from "./actions";

export function DeleteJournalButton({
  id,
  number,
  redirectTo,
}: {
  id: number;
  number: string;
  redirectTo?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`${number || "Энэ журнал"}-ыг устгах уу?`)) return;
    startTransition(async () => {
      const res = await deleteJournal(id);
      if (res.ok) {
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } else alert(res.error ?? "Алдаа гарлаа");
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
    >
      {pending ? "…" : "Устгах"}
    </button>
  );
}
