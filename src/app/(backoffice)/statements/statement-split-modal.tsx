"use client";

import { useMemo, useState, useTransition } from "react";

import { createTxnSplitJournal } from "./actions";
import { unlinkedEbarimt } from "../journals/actions";
import type { UnlinkedEbarimt } from "../journals/types";
import type { AccountOpt } from "./statements-table";

export type SplitTxn = {
  id: number;
  date: string;
  description: string | null;
  counterparty: string | null;
  amount: number; // ₮ (ханшаар хөрвүүлсэн)
  dir: "in" | "out"; // in = орлого (банк Дт), out = зарлага (банк Кт)
  bankGl: string | null;
};

type Line = { code: string; amount: string; description: string };

function num(v: string): number {
  const n = parseFloat((v || "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function StatementSplitModal({
  txn,
  accounts,
  onClose,
  onSaved,
}: {
  txn: SplitTxn;
  accounts: AccountOpt[];
  onClose: () => void;
  onSaved: (msg: string, journalId: number) => void;
}) {
  const [lines, setLines] = useState<Line[]>([
    { code: "", amount: String(Math.round(txn.amount)), description: "" },
  ]);
  const [reference, setReference] = useState("");
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [ebOpen, setEbOpen] = useState(false);
  const [ebItems, setEbItems] = useState<UnlinkedEbarimt[]>([]);
  const [ebLoading, setEbLoading] = useState(false);
  const [ebSearch, setEbSearch] = useState("");

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) m.set(a.code, a.name);
    return m;
  }, [accounts]);

  const sum = useMemo(
    () => Math.round(lines.reduce((s, l) => s + num(l.amount), 0) * 100) / 100,
    [lines],
  );
  const diff = Math.round((sum - txn.amount) * 100) / 100;
  const balanced = Math.abs(diff) < 0.5 && sum > 0;

  const contraSide = txn.dir === "out" ? "Дт" : "Кт";
  const bankSide = txn.dir === "out" ? "Кт" : "Дт";

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, { code: "", amount: "", description: "" }]);
  const removeLine = (i: number) =>
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  // И-баримт: зарлага→худ.авалт(in), орлого→борлуулалт(out) төрөл харна.
  const wantType: "in" | "out" = txn.dir === "out" ? "in" : "out";
  function openEb() {
    setEbOpen(true);
    setEbItems([]);
    setEbSearch("");
    setEbLoading(true);
    unlinkedEbarimt()
      .then((items) => setEbItems(items.filter((v) => v.type === wantType)))
      .finally(() => setEbLoading(false));
  }
  const ebFiltered = useMemo(() => {
    const q = ebSearch.trim().toLowerCase();
    const base = q
      ? ebItems.filter(
          (v) =>
            (v.partner_name ?? "").toLowerCase().includes(q) ||
            (v.ddtd ?? "").toLowerCase().includes(q),
        )
      : ebItems;
    return [...base]
      .sort((a, b) => Math.abs(a.total - txn.amount) - Math.abs(b.total - txn.amount))
      .slice(0, 50);
  }, [ebItems, ebSearch, txn.amount]);

  function pickEb(v: UnlinkedEbarimt) {
    const nl: Line[] = [
      {
        code: "",
        amount: String(Math.round(v.net)),
        description: v.type === "in" ? "Худалдан авалт" : "Борлуулалт",
      },
    ];
    if (v.vat > 0)
      nl.push({
        code: v.type === "in" ? "130600" : "330100",
        amount: String(Math.round(v.vat)),
        description: v.type === "in" ? "НӨАТ-ын авлага" : "НӨАТ-ын өглөг",
      });
    setLines(nl);
    setReference(v.ddtd ?? "");
    setPartnerId(v.partner_id);
    setEbOpen(false);
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await createTxnSplitJournal({
        txnId: txn.id,
        lines: lines.map((l) => ({
          code: l.code.trim(),
          amount: num(l.amount),
          description: l.description,
        })),
        reference,
        partnerId,
        description: null,
      });
      if (res.ok) onSaved(`✓ Журнал ${res.number} үүсэж, гүйлгээ холбогдлоо.`, res.journalId);
      else setError(res.error);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-zinc-200 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-800">
              Гүйлгээг задлах / И-баримт холбох
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {txn.date.slice(0, 10)} · {txn.description || "—"}
              {txn.counterparty ? ` · ${txn.counterparty}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {/* Банкны тал */}
          <div className="mb-3 flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm">
            <span className="text-zinc-600">
              Банк ({bankSide}):{" "}
              <span className="font-mono text-zinc-800">{txn.bankGl ?? "?"}</span>{" "}
              {txn.bankGl && (
                <span className="text-zinc-400">{nameOf.get(txn.bankGl) ?? ""}</span>
              )}
            </span>
            <span className="font-semibold tabular-nums text-zinc-800">{fmt(txn.amount)}₮</span>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600">
              Харьцах данс ({contraSide})
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openEb}
                className="rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                📄 И-баримт дуудах
              </button>
              <button
                type="button"
                onClick={addLine}
                className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                + Мөр нэмэх
              </button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-1 py-1">Данс ({contraSide})</th>
                <th className="px-1 py-1 text-right">Дүн</th>
                <th className="px-1 py-1">Тайлбар</th>
                <th className="w-6 px-1 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="px-1 py-1">
                    <input
                      list="split-acc-list"
                      value={l.code}
                      onChange={(e) => setLine(i, { code: e.target.value })}
                      placeholder="720701…"
                      className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                    />
                    {l.code && nameOf.get(l.code.trim()) && (
                      <span className="ml-1 text-[10px] text-zinc-400">
                        {nameOf.get(l.code.trim())}
                      </span>
                    )}
                  </td>
                  <td className="px-1 py-1">
                    <input
                      inputMode="decimal"
                      value={l.amount}
                      onChange={(e) => setLine(i, { amount: e.target.value })}
                      placeholder="0"
                      className="w-32 rounded border border-zinc-300 px-2 py-1 text-right text-sm tabular-nums"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      value={l.description}
                      onChange={(e) => setLine(i, { description: e.target.value })}
                      className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      disabled={lines.length <= 1}
                      className="text-zinc-400 hover:text-red-600 disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 text-sm font-semibold">
                <td className="px-1 py-1.5 text-right text-zinc-500">Нийлбэр</td>
                <td className="px-1 py-1.5 text-right tabular-nums text-zinc-800">{fmt(sum)}</td>
                <td className="px-1 py-1.5" colSpan={2}>
                  {balanced ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      ✓ Тэнцсэн
                    </span>
                  ) : (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                      Зөрүү: {fmt(diff)}
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>

          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-xs font-semibold text-zinc-600">
              Лавлах № / ДДТД{" "}
              <span className="font-normal text-zinc-400">(и-баримт дуудвал автоматаар)</span>
            </span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* И-баримт picker */}
          {ebOpen && (
            <div className="mt-3 rounded-lg border border-zinc-200">
              <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
                <span className="text-xs font-semibold text-zinc-700">
                  {wantType === "in" ? "Худалдан авалтын" : "Борлуулалтын"} холбогдоогүй и-баримт
                </span>
                <button
                  type="button"
                  onClick={() => setEbOpen(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-700"
                >
                  хаах
                </button>
              </div>
              <div className="px-3 py-2">
                <input
                  value={ebSearch}
                  onChange={(e) => setEbSearch(e.target.value)}
                  placeholder="Харилцагч эсвэл ДДТД…"
                  className="w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                />
              </div>
              <div className="max-h-52 overflow-y-auto px-2 pb-2">
                {ebLoading ? (
                  <div className="py-4 text-center text-xs text-zinc-500">Ачааллаж байна…</div>
                ) : ebFiltered.length === 0 ? (
                  <div className="py-4 text-center text-xs text-zinc-500">
                    Холбогдоогүй и-баримт алга.
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-zinc-100">
                      {ebFiltered.map((v) => (
                        <tr key={v.id} className="hover:bg-zinc-50">
                          <td className="px-2 py-1 text-zinc-500">{v.date}</td>
                          <td className="max-w-[12rem] truncate px-2 py-1" title={v.partner_name ?? ""}>
                            {v.partner_name || "—"}
                            {v.ddtd && (
                              <span className="block text-[10px] text-zinc-400">{v.ddtd}</span>
                            )}
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums font-medium text-zinc-700">
                            {fmt(v.total)}
                            <span className="block text-[10px] font-normal text-zinc-400">
                              {Math.abs(v.total - txn.amount) < 0.5 ? "= гүйлгээтэй" : ""}
                            </span>
                          </td>
                          <td className="px-2 py-1 text-right">
                            <button
                              type="button"
                              onClick={() => pickEb(v)}
                              className="rounded bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-zinc-700"
                            >
                              Сонгох
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600"
          >
            Болих
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !balanced}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {pending ? "Хадгалж байна…" : "Журнал үүсгэх"}
          </button>
        </div>

        <datalist id="split-acc-list">
          {accounts.map((a) => (
            <option key={a.code} value={a.code}>
              {a.code} — {a.name}
            </option>
          ))}
        </datalist>
      </div>
    </div>
  );
}
