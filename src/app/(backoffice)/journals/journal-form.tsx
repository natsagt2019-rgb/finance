"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createJournal } from "./actions";
import type { AccountOption, LineInput } from "./types";

type Row = {
  account_id: string; // select value (string)
  debit: string;
  credit: string;
  description: string;
};

const EMPTY_ROW: Row = { account_id: "", debit: "", credit: "", description: "" };

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function num(v: string): number {
  const n = parseFloat(v.replace(/[,₮\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function JournalForm({
  accounts,
  partners,
  today,
}: {
  accounts: AccountOption[];
  partners: { id: number; name: string }[];
  today: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [rows, setRows] = useState<Row[]>([
    { ...EMPTY_ROW },
    { ...EMPTY_ROW },
  ]);

  const totals = useMemo(() => {
    const d = rows.reduce((s, r) => s + num(r.debit), 0);
    const c = rows.reduce((s, r) => s + num(r.credit), 0);
    return {
      debit: Math.round(d * 100) / 100,
      credit: Math.round(c * 100) / 100,
      diff: Math.round((d - c) * 100) / 100,
    };
  }, [rows]);

  const balanced = totals.diff === 0 && totals.debit > 0;

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeRow(i: number) {
    setRows((prev) =>
      prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i),
    );
  }

  function handleSubmit(status: "draft" | "posted") {
    setError(null);
    const lines: LineInput[] = rows.map((r) => ({
      account_id: r.account_id ? Number(r.account_id) : null,
      debit: num(r.debit),
      credit: num(r.credit),
      description: r.description,
    }));

    startTransition(async () => {
      const res = await createJournal({
        date,
        description,
        reference,
        partner_id: partnerId ? Number(partnerId) : null,
        status,
        lines,
      });
      if (res.ok) {
        router.push("/journals");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Толгой */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600">
            Огноо <span className="text-red-500">*</span>
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-zinc-600">
            Гүйлгээний утга
          </span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Жишээ: 1-р сарын НӨАТ-ын бичилт"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600">
            Лавлах № / баримт
          </span>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600">
            Харилцагч (заавал биш)
          </span>
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">— Сонгох —</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Мөрүүд */}
      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <span className="text-sm font-semibold text-zinc-700">
            Гүйлгээний мөрүүд
          </span>
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            + Мөр нэмэх
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-3 py-2" style={{ width: "34%" }}>
                  Данс
                </th>
                <th className="px-3 py-2 text-right" style={{ width: "16%" }}>
                  Дебет
                </th>
                <th className="px-3 py-2 text-right" style={{ width: "16%" }}>
                  Кредит
                </th>
                <th className="px-3 py-2">Тайлбар</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-3 py-1.5">
                    <select
                      value={r.account_id}
                      onChange={(e) => setRow(i, { account_id: e.target.value })}
                      className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
                    >
                      <option value="">— Данс сонгох —</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      inputMode="decimal"
                      value={r.debit}
                      onChange={(e) =>
                        setRow(i, {
                          debit: e.target.value,
                          credit: e.target.value ? "" : r.credit,
                        })
                      }
                      className="w-full rounded border border-zinc-200 px-2 py-1.5 text-right text-sm tabular-nums focus:border-zinc-400 focus:outline-none"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      inputMode="decimal"
                      value={r.credit}
                      onChange={(e) =>
                        setRow(i, {
                          credit: e.target.value,
                          debit: e.target.value ? "" : r.debit,
                        })
                      }
                      className="w-full rounded border border-zinc-200 px-2 py-1.5 text-right text-sm tabular-nums focus:border-zinc-400 focus:outline-none"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={r.description}
                      onChange={(e) => setRow(i, { description: e.target.value })}
                      className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={rows.length <= 2}
                      className="text-zinc-400 hover:text-red-600 disabled:opacity-30"
                      title="Мөр устгах"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-zinc-200 bg-zinc-50 font-semibold">
              <tr>
                <td className="px-3 py-2 text-right text-zinc-600">Нийт</td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-800">
                  {fmt(totals.debit)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-800">
                  {fmt(totals.credit)}
                </td>
                <td className="px-3 py-2" colSpan={2}>
                  {balanced ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      ✓ Баланслагдсан
                    </span>
                  ) : (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Зөрүү: {fmt(totals.diff)}
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Үйлдэл */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleSubmit("posted")}
          disabled={isPending || !balanced}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isPending ? "Хадгалж байна…" : "Батлаж хадгалах"}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit("draft")}
          disabled={isPending || !balanced}
          className="rounded-lg border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          Ноороглон хадгалах
        </button>
        {!balanced && (
          <span className="text-xs text-zinc-500">
            Дебет = Кредит баланслахад хадгална.
          </span>
        )}
      </div>
    </div>
  );
}
