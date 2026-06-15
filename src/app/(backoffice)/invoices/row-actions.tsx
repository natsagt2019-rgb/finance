"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { markPaid, deleteInvoice } from "./actions";

export function RowActions({
  id,
  label,
  isPaid,
  partnerId,
}: {
  id: number;
  label: string;
  isPaid: boolean;
  partnerId: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handlePay() {
    if (!confirm(`${label} — бүрэн төлөгдсөн гэж тэмдэглэх үү?`)) return;
    startTransition(async () => {
      const res = await markPaid(id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`${label} нэхэмжлэлийг устгах уу?`)) return;
    startTransition(async () => {
      const res = await deleteInvoice(id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {partnerId != null && (
        <Link
          href={`/partners/${partnerId}`}
          title="Холбогдох гүйлгээ (банкны орлого, тулгалт)"
          className="rounded-lg border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
        >
          ₮ Гүйлгээ
        </Link>
      )}
      <Link
        href={`/invoices/${id}/print`}
        target="_blank"
        title="Нэхэмжлэх хэвлэх"
        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-[#1a3c5e] hover:bg-zinc-50"
      >
        🖨
      </Link>
      <Link
        href={`/invoices/${id}/edit`}
        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Засах
      </Link>
      {!isPaid && (
        <button
          type="button"
          onClick={handlePay}
          disabled={isPending}
          title="Бүрэн төлөгдсөн гэж тэмдэглэх"
          className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
        >
          ✓
        </button>
      )}
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
