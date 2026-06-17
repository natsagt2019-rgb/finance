"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { postBankJournal, type PostJournalResult } from "./actions";

export function PostJournalButton() {
  const router = useRouter();
  const [year, setYear] = useState(2026);
  const [res, setRes] = useState<PostJournalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePost() {
    if (
      !confirm(
        `${year} оны банкны гүйлгээг журналд бичих үү?\n\n` +
          `Өмнө үүсгэсэн банкны журнал (CASH${String(year).slice(2)}:) дарагдаж дахин бичигдэнэ.`,
      )
    )
      return;
    setError(null);
    setRes(null);
    startTransition(async () => {
      try {
        const r = await postBankJournal(year);
        setRes(r);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Алдаа гарлаа.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Журналд бичих</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Ангилсан банкны гүйлгээг ерөнхий дэвтэрт (journal_entries) double-entry
            болгон бичнэ. Орлого: Дт банк/Кт ангилал; зарлага: Дт ангилал/Кт банк.
            Дахин ажиллуулж болно (идемпотент).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800"
          >
            {[2026, 2025].map((y) => (
              <option key={y} value={y}>
                {y} он
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handlePost}
            disabled={isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? "Бичиж байна…" : "📒 Журналд бичих"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {res && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ Журналд бичигдсэн: <span className="font-semibold">{res.made}</span> мөр
          {res.skipped > 0 && <> · алгассан: {res.skipped}</>}
          {res.skippedUncoded > 0 && (
            <div className="mt-2 text-amber-700">
              ⚠ Дт/Кт холболтгүй тул {res.skippedUncoded} гүйлгээ журналд ороогүй —
              «Автомат холболт» хийгээд дахин бичнэ үү.
            </div>
          )}
          <div className="mt-1 text-xs text-green-700">
            Тайланд харагдана: /reports/trial-balance-by-type, /reports/balance-sheet
            г.м. ({year}-01-01 → {year}-12-31).
          </div>
        </div>
      )}
    </div>
  );
}
