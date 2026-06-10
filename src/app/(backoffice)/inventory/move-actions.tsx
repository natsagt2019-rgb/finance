"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteMove } from "./actions";

export function MoveDelete({ id }: { id: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Энэ хөдөлгөөнийг устгах уу? (холбоотой журнал хамт устана)")) return;
    startTransition(async () => {
      const res = await deleteMove(id);
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
      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      Устгах
    </button>
  );
}
