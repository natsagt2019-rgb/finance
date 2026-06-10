"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { toggleVatType } from "./actions";
import type { VatType } from "./types";

// Баримтын төрлийг (борлуулалт ↔ худалдан авалт) солих badge + товч.
export function TypeToggle({ id, type }: { id: number; type: VatType }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle() {
    startTransition(async () => {
      const res = await toggleVatType(id);
      if (res.ok) router.refresh();
      else alert(res.error ?? "Алдаа гарлаа");
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      {type === "out" ? (
        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          Борлуулалт
        </span>
      ) : (
        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          Худ.авалт
        </span>
      )}
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        title="Төрөл солих (борлуулалт ↔ худалдан авалт)"
        className="text-zinc-400 transition hover:text-zinc-700 disabled:opacity-40"
      >
        {pending ? "…" : "⇄"}
      </button>
    </span>
  );
}
