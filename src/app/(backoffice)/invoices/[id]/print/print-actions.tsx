"use client";

import { useRouter } from "next/navigation";

export function PrintActions() {
  const router = useRouter();
  return (
    <div className="no-print mb-4 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg bg-[#1a3c5e] px-6 py-2 text-sm font-medium text-white hover:bg-[#0d2137]"
      >
        🖨 Хэвлэх
      </button>
      <button
        type="button"
        onClick={() => router.push("/invoices")}
        className="rounded-lg border-2 border-[#1a3c5e] bg-white px-6 py-2 text-sm font-medium text-[#1a3c5e] hover:bg-zinc-50"
      >
        ✕ Хаах
      </button>
      <button
        type="button"
        onClick={() => router.back()}
        className="rounded-lg border-2 border-[#1a3c5e] bg-white px-6 py-2 text-sm font-medium text-[#1a3c5e] hover:bg-zinc-50"
      >
        ← Буцах
      </button>
    </div>
  );
}
