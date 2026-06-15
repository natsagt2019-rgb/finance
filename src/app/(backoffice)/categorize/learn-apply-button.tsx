"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { autoApplyLearnedCodes, type LearnResult } from "./actions";

export function LearnApplyButton() {
  const router = useRouter();
  const [res, setRes] = useState<LearnResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApply() {
    setError(null);
    setRes(null);
    startTransition(async () => {
      try {
        const r = await autoApplyLearnedCodes();
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
          <h2 className="text-sm font-semibold text-zinc-800">
            Сурсан кодоор бөглөх (давтагдсан)
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Өмнө батлагдсан ангиллаас сурч, давтагддаг харилцагчийн кодгүй/default
            гүйлгээг автоматаар бөглөнө. AI-д зөвхөн шинэ харилцагч үлдэнэ.
          </p>
        </div>
        <button
          type="button"
          onClick={handleApply}
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? "Бөглөж байна…" : "✨ Сурсан кодоор бөглөх"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {res && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ Авто бөглөсөн: <span className="font-semibold">{res.updated}</span> гүйлгээ
          {" · "}
          сурсан дүрэм: {res.rules}
          {res.updated === 0 && (
            <span className="text-zinc-500">
              {" "}
              — давтагдсан, сурах боломжтой гүйлгээ олдсонгүй.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
