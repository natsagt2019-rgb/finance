"use client";

import { useMemo, useState, useTransition } from "react";
import { setCounterAccount, setCounterAccountBulk } from "./actions";

type Txn = {
  id: number;
  txn_date: string;
  description: string | null;
  counterparty: string | null;
  income: number | null;
  expense: number | null;
  debit_code: string | null;
  credit_code: string | null;
};
type Group = {
  code: string;
  name: string;
  rows: { t: Txn; inc: number; exp: number }[];
  totalIn: number;
  totalOut: number;
};
type Acc = { code: string; name: string };

function fmt(n: number, ccy = "MNT"): string {
  if (!n) return "—";
  const d = ccy === "MNT" ? 0 : 2;
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function ubDate(ts: string): string {
  return new Date(ts).toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });
}

export function BankJournalTable({
  groups,
  ccy,
  totalIn,
  totalOut,
  accounts,
}: {
  groups: Group[];
  ccy: string;
  totalIn: number;
  totalOut: number;
  accounts: Acc[];
}) {
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [target, setTarget] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // мөр бүрийн чиглэл (orлого эсэх) — bulk action-д хэрэггүй (server тодорхойлно),
  // гэхдээ нэг мөрийн edit-д ашиглана.
  const incomeById = useMemo(() => {
    const m = new Map<number, boolean>();
    for (const g of groups) for (const r of g.rows) m.set(r.t.id, r.inc > 0);
    return m;
  }, [groups]);

  const toggle = (id: number) =>
    setSel((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleGroup = (g: Group, on: boolean) =>
    setSel((p) => {
      const n = new Set(p);
      for (const r of g.rows) on ? n.add(r.t.id) : n.delete(r.t.id);
      return n;
    });

  const doBulk = () => {
    if (!target.trim()) {
      setMsg({ ok: false, text: "Зорилтот данс сонгоно уу." });
      return;
    }
    start(async () => {
      const r = await setCounterAccountBulk([...sel], target.trim());
      if (r.ok) {
        setMsg({ ok: true, text: `${r.count} гүйлгээ шилжлээ.` });
        setTimeout(() => window.location.reload(), 600);
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });
  };

  const editOne = (id: number, code: string) => {
    start(async () => {
      const r = await setCounterAccount(id, code, incomeById.get(id) ?? false);
      if (r.ok) window.location.reload();
      else setMsg({ ok: false, text: r.error });
    });
  };

  return (
    <div>
      {/* Бөөн солих toolbar */}
      {sel.size > 0 && (
        <div className="no-print sticky top-0 z-10 mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
          <span className="font-medium text-amber-800">{sel.size} гүйлгээ сонгосон</span>
          <span className="text-amber-700">→ Харьцсан данс:</span>
          <input
            list="bj-bulk-acc"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="код, ж: 310601"
            className="w-40 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <datalist id="bj-bulk-acc">
            {accounts.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.name}
              </option>
            ))}
          </datalist>
          <button
            onClick={doBulk}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {pending ? "…" : "Шилжүүлэх"}
          </button>
          <button
            onClick={() => setSel(new Set())}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-600"
          >
            Цуцлах
          </button>
          {msg && (
            <span className={msg.ok ? "text-green-700" : "text-red-700"}>{msg.text}</span>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-zinc-100 text-xs font-medium text-zinc-600">
            <tr>
              <th className="no-print border border-zinc-200 px-2 py-2" style={{ width: 32 }}></th>
              <th className="border border-zinc-200 px-3 py-2 text-right" style={{ width: 48 }}>№</th>
              <th className="border border-zinc-200 px-3 py-2 text-left">Огноо</th>
              <th className="border border-zinc-200 px-3 py-2 text-left">Гүйлгээний утга</th>
              <th className="border border-zinc-200 px-3 py-2 text-left">Харилцагч</th>
              <th className="border border-zinc-200 px-3 py-2 text-right">Орлого</th>
              <th className="border border-zinc-200 px-3 py-2 text-right">Зарлага</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-zinc-200 px-3 py-10 text-center text-sm text-zinc-500">
                  Энэ хугацаанд гүйлгээ алга.
                </td>
              </tr>
            ) : (
              groups.map((g) => {
                const allSel = g.rows.every((r) => sel.has(r.t.id));
                return (
                  <BlockRows
                    key={g.code}
                    g={g}
                    ccy={ccy}
                    sel={sel}
                    allSel={allSel}
                    onToggle={toggle}
                    onToggleGroup={(on) => toggleGroup(g, on)}
                    onEdit={editOne}
                    accounts={accounts}
                  />
                );
              })
            )}
            <tr className="border-t-2 border-zinc-300 bg-zinc-100 font-bold text-zinc-900">
              <td className="no-print border border-zinc-200" />
              <td colSpan={4} className="border border-zinc-200 px-3 py-2">Нийт</td>
              <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums text-green-700">{fmt(totalIn, ccy)}</td>
              <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums text-red-600">{fmt(totalOut, ccy)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BlockRows({
  g,
  ccy,
  sel,
  allSel,
  onToggle,
  onToggleGroup,
  onEdit,
  accounts,
}: {
  g: Group;
  ccy: string;
  sel: Set<number>;
  allSel: boolean;
  onToggle: (id: number) => void;
  onToggleGroup: (on: boolean) => void;
  onEdit: (id: number, code: string) => void;
  accounts: Acc[];
}) {
  return (
    <>
      <tr className="bg-zinc-50 font-semibold text-zinc-700">
        <td className="no-print border border-zinc-200 px-2 py-1.5 text-center">
          <input type="checkbox" checked={allSel} onChange={(e) => onToggleGroup(e.target.checked)} />
        </td>
        <td colSpan={6} className="border border-zinc-200 px-3 py-1.5">
          Харьцсан данс: <span className="font-mono">{g.code}</span>
          {g.name ? ` — ${g.name}` : ""}
        </td>
      </tr>
      {g.rows.map(({ t, inc, exp }, i) => (
        <tr key={t.id} className={sel.has(t.id) ? "bg-amber-50" : "hover:bg-zinc-50"}>
          <td className="no-print border border-zinc-200 px-2 py-1.5 text-center">
            <input type="checkbox" checked={sel.has(t.id)} onChange={() => onToggle(t.id)} />
          </td>
          <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-zinc-400">{i + 1}</td>
          <td className="whitespace-nowrap border border-zinc-200 px-3 py-1.5 text-zinc-600">{ubDate(t.txn_date)}</td>
          <td className="border border-zinc-200 px-3 py-1.5 text-zinc-700">
            <div className="flex items-center justify-between gap-2">
              <span>{t.description || "—"}</span>
              <RowEdit current={g.code} accounts={accounts} onSave={(code) => onEdit(t.id, code)} />
            </div>
          </td>
          <td className="whitespace-nowrap border border-zinc-200 px-3 py-1.5 text-zinc-500">{t.counterparty || "—"}</td>
          <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-green-700">{inc ? fmt(inc, ccy) : "—"}</td>
          <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-red-600">{exp ? fmt(exp, ccy) : "—"}</td>
        </tr>
      ))}
      <tr className="bg-amber-50/60 font-medium text-zinc-800">
        <td className="no-print border border-zinc-200" />
        <td colSpan={4} className="border border-zinc-200 px-3 py-1.5 text-right">Харьцсан дансны дүн</td>
        <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-green-700">{fmt(g.totalIn, ccy)}</td>
        <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-red-600">{fmt(g.totalOut, ccy)}</td>
      </tr>
    </>
  );
}

function RowEdit({
  current,
  accounts,
  onSave,
}: {
  current: string;
  accounts: Acc[];
  onSave: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(current);
  return (
    <>
      <button
        onClick={() => {
          setCode(current === "(тодорхойгүй)" ? "" : current);
          setOpen(true);
        }}
        title="Харьцсан данс засах"
        className="no-print ml-1 text-zinc-300 hover:text-zinc-700"
      >
        ✎
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-800">Харьцсан данс засах</div>
            <div className="space-y-3 p-4">
              <input
                list="bj-bulk-acc"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="код, ж: 310601"
                autoFocus
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setOpen(false)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">Болих</button>
                <button
                  onClick={() => { setOpen(false); onSave(code); }}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Хадгалах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
