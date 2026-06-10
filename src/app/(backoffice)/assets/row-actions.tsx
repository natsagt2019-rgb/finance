"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { deleteAsset } from "./actions";

export function RowActions({ id, label }: { id: number; label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`${label} хөрөнгийг устгах уу?`)) return;
    startTransition(async () => {
      const res = await deleteAsset(id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/assets/${id}`}
        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Засах
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Устгах
      </button>
    </div>
  );
}
