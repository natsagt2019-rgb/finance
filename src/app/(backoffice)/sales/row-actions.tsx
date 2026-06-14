"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSale } from "./actions";

export function DeleteSaleButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function handle() {
    if (!confirm("Энэ борлуулалтыг устгах уу? (холбоотой журнал хамт устана)")) return;
    start(async () => {
      const res = await deleteSale(id);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      Устгах
    </button>
  );
}
