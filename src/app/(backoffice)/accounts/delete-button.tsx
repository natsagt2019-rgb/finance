"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteAccount } from "./actions";

export function DeleteAccountButton({
  id,
  name,
}: {
  id: number;
  name: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`"${name}" дансыг устгах уу?`)) return;
    startTransition(async () => {
      const res = await deleteAccount(id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {isPending ? "…" : "Устгах"}
    </button>
  );
}
