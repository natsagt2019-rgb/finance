"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { deletePartner } from "./actions";

// Харилцагчийн жагсаалтын мөр бүрийн устгах товч.
export function DeletePartnerButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDelete() {
    const ok = window.confirm(
      `"${name}" харилцагчийг устгах уу?\n(Журнал/eBarimt/нэхэмжлэлтэй бол устгахгүй, зөвхөн идэвхгүй болгоно.)`,
    );
    if (!ok) return;
    start(async () => {
      const res = await deletePartner(id);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      if (res.deactivated)
        window.alert(
          `"${res.name}" нь ${res.refs} холбоос (журнал/eBarimt/нэхэмжлэл)-тэй тул устгалгүй ИДЭВХГҮЙ болголоо.`,
        );
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      title="Устгах"
      className="ml-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "…" : "🗑"}
    </button>
  );
}
