"use client";

// ============================================================
// Баланс / Гүйлгээ баланс дээрх банкны постингийн төлвийн анхааруулга.
// ============================================================
// uncoded > 0 → "N гүйлгээ Дт/Кт холболтгүй тул балансад тусаагүй".
// stale       → "Журнал хуучирсан" + нэг товчоор дахин бичих (postBankJournal).
// Хоёулаа цэвэр бол юу ч харуулахгүй (журнал хуулгатай бүрэн тулсан).
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { postBankJournal } from "../categorize/actions";
import type { BankJournalStatus } from "@/lib/bank-journal-status";

export function BankJournalBanner({
  year,
  status,
}: {
  year: number;
  status: BankJournalStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const { uncoded, stale, postable, posted } = status;
  // Бүх зүйл тулсан бол анхааруулга шаардлагагүй.
  if (uncoded === 0 && !stale) return null;

  function repost() {
    setError(null);
    setDone(null);
    startTransition(async () => {
      try {
        const r = await postBankJournal(year);
        setDone(
          `Журналд бичигдсэн: ${r.made} мөр` +
            (r.skippedUncoded > 0
              ? ` · ${r.skippedUncoded} гүйлгээ холболтгүй тул орсонгүй`
              : ""),
        );
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Алдаа гарлаа.");
      }
    });
  }

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800 print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold">
            ⚠ {year} оны банкны хуулга балансад бүрэн тусаагүй байж магадгүй
          </p>
          {uncoded > 0 && (
            <p>
              <span className="font-semibold tabular-nums">{uncoded}</span>{" "}
              гүйлгээ Дт/Кт данс холболтгүй тул журналд орохгүй — касс/харилцахын
              GL үлдэгдэл хуулгаас зөрнө.{" "}
              <a href="/categorize" className="font-medium underline">
                Ангилал/холболт хийх →
              </a>
            </p>
          )}
          {stale && (
            <p>
              Журналд бичигдсэн{" "}
              <span className="font-semibold tabular-nums">{posted}</span> ≠ бичих
              ёстой{" "}
              <span className="font-semibold tabular-nums">{postable}</span> — кодыг
              зассаны дараа журнал шинэчлэгдээгүй байна.
            </p>
          )}
          {error && <p className="text-red-700">{error}</p>}
          {done && <p className="text-green-700">✓ {done}</p>}
        </div>
        {stale && (
          <button
            type="button"
            onClick={repost}
            disabled={isPending}
            className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {isPending ? "Бичиж байна…" : "📒 Журналд дахин бичих"}
          </button>
        )}
      </div>
    </div>
  );
}
