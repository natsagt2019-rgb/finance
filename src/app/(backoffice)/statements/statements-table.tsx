"use client";

import { useMemo, useState, useTransition } from "react";
import { updateTxnAccounts } from "./actions";

export type TxnRow = {
  id: number;
  txn_date: string;
  bank: string | null;
  description: string | null;
  counterparty: string | null;
  income: number | null;
  expense: number | null;
  income_code: string | null;
  expense_code: string | null;
  debit_code: string | null;
  credit_code: string | null;
};

export type AccountOpt = { code: string; name: string };

function fmt(n: number | null): string {
  if (n == null) return "";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EMPTY = { date: "", bank: "", desc: "", partner: "", dt: "", kt: "" };

export function StatementsTable({
  rows,
  accounts,
}: {
  rows: TxnRow[];
  accounts: AccountOpt[];
}) {
  const [filters, setFilters] = useState(EMPTY);
  const [data, setData] = useState<TxnRow[]>(rows);
  const [editId, setEditId] = useState<number | null>(null);
  const [editDt, setEditDt] = useState("");
  const [editKt, setEditKt] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) m.set(a.code, a.name);
    return m;
  }, [accounts]);

  const filtered = useMemo(() => {
    const f = filters;
    const has = (v: string | null, q: string) =>
      !q || (v ?? "").toLowerCase().includes(q.toLowerCase());
    return data.filter(
      (r) =>
        has(r.txn_date?.slice(0, 10), f.date) &&
        has(r.bank, f.bank) &&
        has(r.description, f.desc) &&
        has(r.counterparty, f.partner) &&
        has(r.debit_code, f.dt) &&
        has(r.credit_code, f.kt),
    );
  }, [data, filters]);

  function startEdit(r: TxnRow) {
    setEditId(r.id);
    setEditDt(r.debit_code ?? "");
    setEditKt(r.credit_code ?? "");
    setMsg(null);
  }

  function save(id: number) {
    start(async () => {
      const res = await updateTxnAccounts(id, editDt || null, editKt || null);
      if (res.ok) {
        setData((d) =>
          d.map((r) =>
            r.id === id ? { ...r, debit_code: editDt || null, credit_code: editKt || null } : r,
          ),
        );
        setEditId(null);
      } else {
        setMsg(res.error);
      }
    });
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }));

  const fInput =
    "w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none focus:border-zinc-900";
  const acctCell = (code: string | null) =>
    code ? (
      <span title={nameOf.get(code) ?? ""}>
        <span className="font-mono text-xs">{code}</span>
        <span className="ml-1 text-zinc-400">{(nameOf.get(code) ?? "").slice(0, 16)}</span>
      </span>
    ) : (
      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
        ⚠ дутуу
      </span>
    );

  return (
    <div className="overflow-x-auto">
      {msg && (
        <div className="border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {msg}
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
          <tr>
            <th className="px-3 py-2">Огноо</th>
            <th className="px-3 py-2">Банк</th>
            <th className="px-3 py-2">Гүйлгээний утга</th>
            <th className="px-3 py-2">Харилцагч</th>
            <th className="px-3 py-2 text-right">Орлого</th>
            <th className="px-3 py-2 text-right">Зарлага</th>
            <th className="px-3 py-2">Дт</th>
            <th className="px-3 py-2">Кт</th>
            <th className="px-3 py-2"></th>
          </tr>
          <tr className="bg-white">
            <th className="px-2 py-1"><input value={filters.date} onChange={set("date")} placeholder="огноо…" className={fInput} /></th>
            <th className="px-2 py-1"><input value={filters.bank} onChange={set("bank")} placeholder="банк…" className={fInput} /></th>
            <th className="px-2 py-1"><input value={filters.desc} onChange={set("desc")} placeholder="тайлбар…" className={fInput} /></th>
            <th className="px-2 py-1"><input value={filters.partner} onChange={set("partner")} placeholder="харилцагч…" className={fInput} /></th>
            <th className="px-2 py-1"></th>
            <th className="px-2 py-1"></th>
            <th className="px-2 py-1"><input value={filters.dt} onChange={set("dt")} placeholder="Дт…" className={fInput} /></th>
            <th className="px-2 py-1"><input value={filters.kt} onChange={set("kt")} placeholder="Кт…" className={fInput} /></th>
            <th className="px-2 py-1 text-right">
              <button
                type="button"
                onClick={() => setFilters(EMPTY)}
                className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50"
              >
                ✕
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {filtered.map((r) => {
            const editing = editId === r.id;
            return (
              <tr key={r.id} className={editing ? "bg-blue-50/40" : ""}>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-600">{r.txn_date.slice(0, 10)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-500">{r.bank}</td>
                <td className="max-w-xs px-3 py-2 text-zinc-700"><span title={r.description ?? ""}>{r.description}</span></td>
                <td className="px-3 py-2 text-zinc-700">{r.counterparty}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-green-700">{fmt(r.income)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-red-700">{fmt(r.expense)}</td>
                {editing ? (
                  <>
                    <td className="px-2 py-1">
                      <input list="acc-list" value={editDt} onChange={(e) => setEditDt(e.target.value)} placeholder="Дт код" className="w-28 rounded border border-zinc-300 px-2 py-1 text-xs" />
                    </td>
                    <td className="px-2 py-1">
                      <input list="acc-list" value={editKt} onChange={(e) => setEditKt(e.target.value)} placeholder="Кт код" className="w-28 rounded border border-zinc-300 px-2 py-1 text-xs" />
                    </td>
                    <td className="whitespace-nowrap px-2 py-1">
                      <button type="button" disabled={pending} onClick={() => save(r.id)} className="mr-1 rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50">Хадгал</button>
                      <button type="button" onClick={() => setEditId(null)} className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500">Болих</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600">{acctCell(r.debit_code)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600">{acctCell(r.credit_code)}</td>
                    <td className="px-2 py-1">
                      <button type="button" onClick={() => startEdit(r)} title="Засах" className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50">✏</button>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <datalist id="acc-list">
        {accounts.map((a) => (
          <option key={a.code} value={a.code}>
            {a.code} — {a.name}
          </option>
        ))}
      </datalist>
      <div className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-400">
        {filtered.length} / {data.length} мөр харагдаж байна.
      </div>
    </div>
  );
}
