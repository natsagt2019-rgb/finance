"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rebuildCashFlow } from "./actions";

export function RebuildCashFlowButton({ year }: { year: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function rebuild() {
    setMsg(null);
    start(async () => {
      const res = await rebuildCashFlow(year);
      if (res.ok) {
        const unm =
          res.unmapped.length > 0
            ? ` · зураглагдаагүй: ${res.unmapped.join(", ")}`
            : "";
        setMsg(
          `✓ ${year}: ${res.lines} мөр · орлого ${res.income.toLocaleString()}₮ · зарлага ${res.expense.toLocaleString()}₮${unm}`,
        );
        router.refresh();
      } else {
        setMsg(`⚠ ${res.error}`);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={rebuild}
        disabled={pending}
        title="transactions-аас (ангиллын кодоор) cash_flow_lines-ийг дахин дүгнэнэ. Валютыг ханшаар MNT болгоно."
        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Дүгнэж байна…" : "↻ Дахин дүгнэх"}
      </button>
      {msg && (
        <span
          className={`text-xs ${msg.startsWith("✓") ? "text-green-700" : "text-red-600"}`}
        >
          {msg}
        </span>
      )}
    </div>
  );
}
