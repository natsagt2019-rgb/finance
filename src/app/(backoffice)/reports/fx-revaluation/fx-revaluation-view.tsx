"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { computeFxLine } from "@/lib/fx-calc";
import { createRevaluation, fetchRates } from "./actions";
import type { FxAccount, FxLineInput } from "./types";

function fmt(n: number): string {
  if (!n) return "—";
  return Math.round(n).toLocaleString("en-US");
}

// Засагдах оролтын мөр.
type EditRow = {
  account_id: number;
  account_code: string;
  account_name: string;
  currency: string;
  nature: string | null;
  type: string | null;
  book_balance: number;
  fx_balance: number;
  rate: number;
};

const cellInput =
  "w-28 rounded border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-zinc-900";

export function FxRevaluationView({
  accounts,
  allAccounts,
  fxAccountsReady,
}: {
  accounts: FxAccount[];
  allAccounts: { id: number; code: string; name: string }[];
  fxAccountsReady: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");

  const initial: EditRow[] = useMemo(
    () =>
      accounts.map((a) => ({
        account_id: a.id,
        account_code: a.code,
        account_name: a.name,
        currency: a.currency || "USD",
        nature: a.nature,
        type: a.type,
        book_balance: a.bookBalance,
        fx_balance: 0,
        rate: 0,
      })),
    [accounts],
  );
  const [rows, setRows] = useState<EditRow[]>(initial);
  const [addId, setAddId] = useState("");
  const [rateBusy, setRateBusy] = useState(false);

  // Монголбанкны ханшийг татаж, валют тус бүрийн ханшийг мөрүүдэд бөглөнө.
  async function fetchMnbRates() {
    setRateBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetchRates(date);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      let filled = 0;
      const missing: string[] = [];
      const next = rows.map((r) => {
        const cur = (r.currency || "").toUpperCase();
        const rate = res.rates[cur];
        if (rate && rate > 0) {
          filled++;
          return { ...r, rate };
        }
        if (cur && cur !== "MNT" && !missing.includes(cur)) missing.push(cur);
        return r;
      });
      setRows(next);
      const note = missing.length
        ? ` Олдоогүй: ${missing.join(", ")}.`
        : "";
      setMsg(
        `Монголбанк — ${res.rateDate} ханш: ${filled} мөр бөглөгдлөө.${note}`,
      );
    } finally {
      setRateBusy(false);
    }
  }

  function update(id: number, field: keyof EditRow, value: number | string) {
    setRows((prev) =>
      prev.map((r) => (r.account_id === id ? { ...r, [field]: value } : r)),
    );
  }
  function removeRow(id: number) {
    setRows((prev) => prev.filter((r) => r.account_id !== id));
  }
  function addRow() {
    const id = Number(addId);
    if (!id || rows.some((r) => r.account_id === id)) return;
    const a = allAccounts.find((x) => x.id === id);
    if (!a) return;
    setRows((prev) => [
      ...prev,
      {
        account_id: a.id,
        account_code: a.code,
        account_name: a.name,
        currency: "USD",
        nature: null,
        type: null,
        book_balance: 0,
        fx_balance: 0,
        rate: 0,
      },
    ]);
    setAddId("");
  }

  // Мөр бүрийн live тооцоо (server-тэй ижил fx-calc.ts).
  const computed = rows.map((r) => ({
    row: r,
    c: computeFxLine({
      bookBalance: r.book_balance,
      fxBalance: r.fx_balance,
      rate: r.rate,
      nature: r.nature,
      type: r.type,
    }),
  }));

  const totals = computed.reduce(
    (s, { c }) => ({ gain: s.gain + c.gain, loss: s.loss + c.loss }),
    { gain: 0, loss: 0 },
  );
  const net = totals.gain - totals.loss;

  function handleSubmit(status: "draft" | "posted") {
    setMsg(null);
    setErr(null);
    const lines: FxLineInput[] = rows.map((r) => ({
      account_id: r.account_id,
      account_code: r.account_code,
      account_name: r.account_name,
      currency: r.currency,
      nature: r.nature,
      type: r.type,
      book_balance: r.book_balance,
      fx_balance: r.fx_balance,
      rate: r.rate,
    }));
    startTransition(async () => {
      const res = await createRevaluation({ date, description, status, lines });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setMsg(
        `${res.number} журнал үүслээ — олз ${fmt(res.gain)}₮, гарз ${fmt(res.loss)}₮.`,
      );
      router.refresh();
    });
  }

  const available = allAccounts.filter(
    (a) => !rows.some((r) => r.account_id === a.id),
  );

  return (
    <div>
      {/* Огноо + тайлбар */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Тэгшитгэх огноо
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
          />
        </div>
        <div className="min-w-56 flex-1">
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Тайлбар (заавал биш)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`Ханшийн тэгшитгэл — ${date}`}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
          />
        </div>
        <button
          type="button"
          onClick={fetchMnbRates}
          disabled={rateBusy || rows.length === 0}
          title="Сонгосон огноогоор Монголбанкны албан ёсны ханшийг татаж бөглөх"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {rateBusy ? "Татаж байна…" : "₮ Монголбанкны ханш татах"}
        </button>
      </div>

      {!fxAccountsReady && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠ «Ханшийн олз» (орлого) ба «Ханшийн гарз» (зардал) данс олдсонгүй.
          Журнал үүсгэхийн өмнө дансны төлөвлөгөөнд эдгээрийг үүсгэнэ үү.
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2">Данс</th>
              <th className="px-3 py-2 text-center">Валют</th>
              <th className="px-3 py-2 text-right">Дэвтрийн үлдэгдэл (₮)</th>
              <th className="px-3 py-2 text-right">Валютын үлдэгдэл</th>
              <th className="px-3 py-2 text-right">Ханш</th>
              <th className="px-3 py-2 text-right">Шинэ үнэлгээ (₮)</th>
              <th className="px-3 py-2 text-right">Зөрүү (олз/гарз)</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {computed.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-zinc-400">
                  Валютын данс алга. Доорхоос данс нэмнэ үү.
                </td>
              </tr>
            )}
            {computed.map(({ row: r, c }) => (
              <tr key={r.account_id} className="hover:bg-zinc-50">
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="font-mono text-xs text-rose-600">
                    {r.account_code}
                  </div>
                  <div className="text-zinc-700">{r.account_name}</div>
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="text"
                    value={r.currency}
                    onChange={(e) =>
                      update(r.account_id, "currency", e.target.value.toUpperCase())
                    }
                    className="w-16 rounded border border-zinc-200 px-2 py-1 text-center text-sm uppercase outline-none focus:border-zinc-900"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={r.book_balance}
                    onChange={(e) =>
                      update(r.account_id, "book_balance", Number(e.target.value))
                    }
                    className={cellInput}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={r.fx_balance}
                    onChange={(e) =>
                      update(r.account_id, "fx_balance", Number(e.target.value))
                    }
                    className={cellInput}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={r.rate}
                    onChange={(e) =>
                      update(r.account_id, "rate", Number(e.target.value))
                    }
                    className={`${cellInput} w-24`}
                  />
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-800">
                  {fmt(c.revalued)}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums font-semibold ${
                    c.diff > 0
                      ? "text-green-700"
                      : c.diff < 0
                        ? "text-rose-700"
                        : "text-zinc-400"
                  }`}
                >
                  {c.diff > 0 ? `+${fmt(c.diff)}` : c.diff < 0 ? fmt(c.diff) : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeRow(r.account_id)}
                    title="Мөр хасах"
                    className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm font-semibold">
            <tr>
              <td colSpan={6} className="px-3 py-2 text-right text-zinc-500">
                Нийт — олз {fmt(totals.gain)}₮ · гарз {fmt(totals.loss)}₮ · цэвэр:
              </td>
              <td
                colSpan={2}
                className={`px-3 py-2 text-right tabular-nums ${
                  net >= 0 ? "text-green-700" : "text-rose-700"
                }`}
              >
                {net > 0 ? `+${fmt(net)}` : fmt(net)}₮
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Данс нэмэх */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={addId}
          onChange={(e) => setAddId(e.target.value)}
          className="min-w-72 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
        >
          <option value="">+ Данс сонгож нэмэх…</option>
          {available.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} — {a.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addRow}
          disabled={!addId}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          Нэмэх
        </button>
      </div>

      {/* Үйлдэл */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          {msg && <span className="text-green-700">{msg}</span>}
          {err && <span className="text-rose-600">{err}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={isPending || computed.length === 0}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {isPending ? "…" : "Ноорогоор хадгалах"}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("posted")}
            disabled={isPending || computed.length === 0 || !fxAccountsReady}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? "Бичиж байна…" : "Журнал үүсгэж батлах"}
          </button>
        </div>
      </div>
    </div>
  );
}
