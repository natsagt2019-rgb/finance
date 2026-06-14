"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  saveOpeningBalances,
  importOpeningExcel,
  type OpenRow,
} from "./actions";

export type Acct = { code: string; name: string; type: string };

const TYPE_LABEL: Record<string, string> = {
  asset: "Хөрөнгө",
  liability: "Өр төлбөр",
  equity: "Өмч",
  income: "Орлого",
  expense: "Зардал",
};
const DEBIT_TYPES = new Set(["asset", "expense"]);

function parseNum(s: string): number {
  const n = Number(String(s ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function fmt(n: number): string {
  if (!n) return "0";
  return Math.round(n).toLocaleString("en-US");
}

export function OpeningClient({
  accounts,
  initial,
  year,
  years,
}: {
  accounts: Acct[];
  initial: Record<string, number>; // code → natural amount
  year: number;
  years: number[];
}) {
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(initial)) if (v) m[k] = String(v);
    return m;
  });
  const [q, setQ] = useState("");
  const [onlyFilled, setOnlyFilled] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => {
    return accounts
      .filter((a) => {
        if (onlyFilled && !parseNum(vals[a.code] ?? "")) return false;
        if (!q) return true;
        const s = q.toLowerCase();
        return a.code.includes(s) || a.name.toLowerCase().includes(s);
      })
      .map((a) => {
        const amt = parseNum(vals[a.code] ?? "");
        const dp = DEBIT_TYPES.has(a.type) ? amt : -amt; // debit-positive
        return { ...a, amt, dp };
      });
  }, [accounts, vals, q, onlyFilled]);

  // Нийт Дт/Кт (бүх данс дээр, шүүлтээс үл хамаарна).
  const totals = useMemo(() => {
    let dr = 0;
    let cr = 0;
    for (const a of accounts) {
      const amt = parseNum(vals[a.code] ?? "");
      if (!amt) continue;
      const dp = DEBIT_TYPES.has(a.type) ? amt : -amt;
      if (dp > 0) dr += dp;
      else cr += -dp;
    }
    return { dr, cr, diff: dr - cr };
  }, [accounts, vals]);

  const balanced = Math.abs(totals.diff) < 0.5;

  function setVal(code: string, v: string) {
    setVals((m) => ({ ...m, [code]: v }));
    setMsg(null);
  }

  function save() {
    const payload: OpenRow[] = accounts
      .map((a) => ({ code: a.code, amount: parseNum(vals[a.code] ?? "") }))
      .filter((r) => r.amount !== 0);
    start(async () => {
      const res = await saveOpeningBalances(year, payload);
      if (res.ok)
        setMsg({ ok: true, text: `✓ Хадгаллаа — ${res.count} данс (${res.date} огноогоор).` });
      else setMsg({ ok: false, text: res.error });
    });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    start(async () => {
      const res = await importOpeningExcel(fd);
      if (res.ok) {
        setVals((m) => {
          const next = { ...m };
          for (const r of res.rows) next[r.code] = String(r.amount);
          return next;
        });
        setMsg({ ok: true, text: `✓ Excel-ээс ${res.rows.length} мөр уншлаа. Шалгаад «Хадгалах» дарна уу.` });
      } else {
        setMsg({ ok: false, text: res.error });
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  const inputCls =
    "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-900";

  return (
    <div>
      {/* Хяналтын мөр */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <form method="get" className="flex items-center gap-2">
          <label className="text-sm text-zinc-500">Тайлант он</label>
          <select name="year" defaultValue={String(year)} className={inputCls}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y} ({y - 1}-12-31)
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            Солих
          </button>
        </form>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <a
            href="/opening-balances/template"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            ↓ Excel загвар татах
          </a>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            ↥ Excel-ээс импорт
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onFile} className="hidden" />
        </div>
      </div>

      {/* Тэнцлийн нэгтгэл */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">Нийт Дт (хөрөнгө)</div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-zinc-800">{fmt(totals.dr)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">Нийт Кт (өр+өмч)</div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-zinc-800">{fmt(totals.cr)}</div>
        </div>
        <div className={`rounded-2xl border p-3 ${balanced ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          <div className="text-xs text-zinc-500">Зөрүү</div>
          <div className={`mt-1 text-lg font-semibold tabular-nums ${balanced ? "text-green-700" : "text-red-700"}`}>
            {fmt(totals.diff)} {balanced ? "✓ тэнцэв" : "⚠"}
          </div>
        </div>
      </div>

      {msg && (
        <div className={`mt-3 rounded-lg px-4 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Шүүлт */}
      <div className="mt-4 flex flex-wrap items-center gap-3 print:hidden">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Код эсвэл нэрээр хайх…"
          className={`${inputCls} w-64`}
        />
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input type="checkbox" checked={onlyFilled} onChange={(e) => setOnlyFilled(e.target.checked)} />
          Зөвхөн үлдэгдэлтэй
        </label>
        <button
          type="button"
          disabled={pending || !balanced}
          onClick={save}
          className="ml-auto rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
          title={balanced ? "" : "Эхлээд Зөрүү=0 болгоно уу"}
        >
          {pending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      </div>

      {/* Хүснэгт */}
      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-50 text-left text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2">Код</th>
              <th className="px-3 py-2">Дансны нэр</th>
              <th className="px-3 py-2">Шинж</th>
              <th className="px-3 py-2 text-right">Эхний үлдэгдэл</th>
              <th className="px-3 py-2 text-center">Тал</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((a) => (
              <tr key={a.code} className={a.amt ? "bg-amber-50/30" : ""}>
                <td className="px-3 py-1.5 font-mono text-xs text-zinc-500">{a.code}</td>
                <td className="px-3 py-1.5 text-zinc-700">{a.name}</td>
                <td className="px-3 py-1.5 text-xs text-zinc-400">{TYPE_LABEL[a.type] ?? a.type}</td>
                <td className="px-3 py-1.5 text-right">
                  <input
                    value={vals[a.code] ?? ""}
                    onChange={(e) => setVal(a.code, e.target.value)}
                    placeholder="0"
                    className="w-40 rounded border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums focus:border-zinc-900 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-1.5 text-center">
                  {a.amt ? (
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${a.dp >= 0 ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                      {a.dp >= 0 ? "Дт" : "Кт"}
                    </span>
                  ) : (
                    <span className="text-zinc-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Зөвхөн эерэг дүн бичнэ — Дт/Кт-г дансны шинжээс автомат тогтооно (хөрөнгө/зардал→Дт, өр/өмч/орлого→Кт).
        Контр данс (ж: хуримтлагдсан элэгдэл) бол сөрөг тоо бичнэ. Зөрүү=0 болсон үед л хадгална.
      </p>
    </div>
  );
}
