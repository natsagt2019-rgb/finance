"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { bulkSetVatType } from "./actions";
import type { VatType } from "./types";

// Хайлт идэвхтэй үед: шүүсэн бүх баримтын төрлийг нэг дор тогтооно.
export function BulkTypeBar({ ids }: { ids: number[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function setAll(type: VatType) {
    const label = type === "out" ? "Борлуулалт" : "Худалдан авалт";
    if (!confirm(`Шүүсэн ${ids.length} баримтыг бүгдийг "${label}" болгох уу?`))
      return;
    startTransition(async () => {
      const res = await bulkSetVatType(ids, type);
      if (res.ok) router.refresh();
      else alert(res.error ?? "Алдаа гарлаа");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm">
      <span className="text-zinc-600">
        Шүүсэн <span className="font-semibold">{ids.length}</span> баримтыг бүгдийг:
      </span>
      <button
        type="button"
        onClick={() => setAll("out")}
        disabled={pending}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
      >
        → Борлуулалт
      </button>
      <button
        type="button"
        onClick={() => setAll("in")}
        disabled={pending}
        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
      >
        → Худалдан авалт
      </button>
      {pending && <span className="text-xs text-zinc-400">шинэчилж байна…</span>}
    </div>
  );
}
