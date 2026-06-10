"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteEntry, deleteRegister } from "./actions";

const btnCls =
  "rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50";

export function EntryDelete({ id }: { id: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Энэ баримтыг устгах уу? (холбоотой журнал хамт устана)")) return;
    startTransition(async () => {
      const res = await deleteEntry(id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button type="button" onClick={handleDelete} disabled={isPending} className={btnCls}>
      Устгах
    </button>
  );
}

export function RegisterDelete({ id }: { id: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Энэ кассыг идэвхгүй болгох уу? (баримтын түүх хадгалагдана)")) return;
    startTransition(async () => {
      const res = await deleteRegister(id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button type="button" onClick={handleDelete} disabled={isPending} className={btnCls}>
      Идэвхгүй
    </button>
  );
}
