"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  suggestCategories,
  applyCategories,
  type UncatTxn,
  type SuggestedRow,
} from "./actions";
import {
  CATEGORY_CODES,
  INCOME_CODES,
  EXPENSE_CODES,
} from "@/lib/bank-importer/config";

type EditableRow = SuggestedRow & { include: boolean; code: string };

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function confBadge(c: number): { label: string; cls: string } {
  if (c >= 0.8) return { label: `${Math.round(c * 100)}%`, cls: "bg-green-100 text-green-700" };
  if (c >= 0.5) return { label: `${Math.round(c * 100)}%`, cls: "bg-amber-100 text-amber-700" };
  if (c > 0) return { label: `${Math.round(c * 100)}%`, cls: "bg-red-100 text-red-700" };
  return { label: "—", cls: "bg-zinc-100 text-zinc-500" };
}

export function CategorizeClient({ initial }: { initial: UncatTxn[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const count = initial.length;
  const includedCount = rows.filter((r) => r.include && r.code).length;

  function handleSuggest() {
    setError(null);
    setMessage(null);
    setDone(false);
    startTransition(async () => {
      try {
        const res = await suggestCategories(initial);
        setRows(
          res.map((r) => ({
            ...r,
            include: r.suggestion.confidence >= 0.5 && !!r.suggestion.code,
            code: r.suggestion.code,
          })),
        );
        if (res.every((r) => !r.suggestion.code)) {
          setMessage("AI тохирох код олсонгүй.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "AI ангилалд алдаа гарлаа.");
      }
    });
  }

  function handleApply() {
    const selected = rows.filter((r) => r.include && r.code);
    if (selected.length === 0) {
      setError("Батлах мөр сонгогдоогүй байна.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await applyCategories(
          selected.map((r) => ({ id: r.id, direction: r.direction, code: r.code })),
        );
        setMessage(`${res.updated} гүйлгээ ангиллаа.`);
        setRows([]);
        setDone(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Хадгалахад алдаа гарлаа.");
      }
    });
  }

  function update(i: number, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              AI гүйлгээ ангилал
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Ангилагдаагүй {count} гүйлгээг Claude AI-аар ангиллын кодод
              хуваарилна. Дараа нь шалгаж батална.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSuggest}
            disabled={isPending || count === 0}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending && rows.length === 0 ? "AI ангилж байна…" : "✨ AI-аар ангилах"}
          </button>
        </div>
        {count === 0 && (
          <p className="mt-3 text-sm text-green-700">
            Бүх гүйлгээ ангилагдсан байна 🎉
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            done
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-zinc-200 bg-zinc-50 text-zinc-600"
          }`}
        >
          {message}
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
            <p className="text-xs text-zinc-500">
              {rows.length} санал · {includedCount} сонгогдсон
            </p>
            <button
              type="button"
              onClick={handleApply}
              disabled={isPending || includedCount === 0}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? "Хадгалж байна…" : `Батлах (${includedCount})`}
            </button>
          </div>

          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="w-10 px-3 py-2"></th>
                  <th className="px-3 py-2">Огноо</th>
                  <th className="px-3 py-2">Харилцагч / тайлбар</th>
                  <th className="px-3 py-2 text-right">Дүн</th>
                  <th className="px-3 py-2">AI ангилал</th>
                  <th className="px-3 py-2">Итгэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((r, i) => {
                  const opts = r.direction === "income" ? INCOME_CODES : EXPENSE_CODES;
                  const badge = confBadge(r.suggestion.confidence);
                  const amt = (r.income ?? 0) || (r.expense ?? 0);
                  return (
                    <tr key={r.id} className={r.include ? "" : "opacity-50"}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={r.include}
                          onChange={(e) => update(i, { include: e.target.checked })}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                        {r.txn_date?.slice(0, 10)}
                      </td>
                      <td className="max-w-[320px] px-3 py-2">
                        <div className="truncate text-zinc-700">
                          {r.counterparty || "—"}
                        </div>
                        <div className="truncate text-xs text-zinc-400">
                          {r.description || ""}
                        </div>
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${
                          r.direction === "income" ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {fmt(amt)}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={r.code}
                          onChange={(e) => update(i, { code: e.target.value })}
                          className="rounded-lg border border-zinc-300 px-2 py-1 text-xs outline-none focus:border-zinc-900"
                        >
                          <option value="">— сонгох —</option>
                          {opts.map((c) => (
                            <option key={c} value={c}>
                              {c} — {CATEGORY_CODES[c] ?? c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
