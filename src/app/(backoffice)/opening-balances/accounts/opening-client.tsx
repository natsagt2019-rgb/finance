"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  saveOpeningBalances,
  importOpeningExcel,
  fetchOpeningRates,
  type OpenRow,
} from "./actions";

export type Acct = {
  code: string;
  name: string;
  type: string;
  currency?: string | null;
};

// Валютын данс уу? (MNT биш, тохируулсан бол).
function isForeign(a: Acct): boolean {
  return !!a.currency && a.currency.toUpperCase() !== "MNT";
}
function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

const TYPE_LABEL: Record<string, string> = {
  asset: "Хөрөнгө",
  liability: "Өр төлбөр",
  equity: "Өмч",
  income: "Орлого",
  expense: "Зардал",
};
const DEBIT_TYPES = new Set(["asset", "expense"]);

function parseNum(s: string): number {
  // Таслал/зай/валют хасна. Нягтлан бодох сөрөг (123.45) ба хасах (-123.45)
  // хоёуланг сөрөг гэж ойлгоно.
  let str = String(s ?? "").trim().replace(/[,\s₮]/g, "");
  let sign = 1;
  const paren = /^\((.*)\)$/.exec(str);
  if (paren) {
    sign = -1;
    str = paren[1];
  }
  const n = Number(str);
  return Number.isFinite(n) ? n * sign : 0;
}
function fmt(n: number): string {
  if (!n) return "0";
  return Math.round(n).toLocaleString("en-US");
}

export function OpeningClient({
  accounts,
  initial,
  year,
}: {
  accounts: Acct[];
  initial: Record<string, number>; // code → natural amount
  year: number;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(initial)) if (v) m[k] = String(v);
    return m;
  });
  // Валютын дансны туслах оролт: валютын дүн + ханш (₮ дүнг эндээс боддог).
  const [fxVals, setFxVals] = useState<Record<string, string>>({});
  const [rateVals, setRateVals] = useState<Record<string, string>>({});
  const [rateBusy, setRateBusy] = useState(false);
  const [q, setQ] = useState("");
  const [onlyFilled, setOnlyFilled] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const hasForeign = useMemo(() => accounts.some(isForeign), [accounts]);

  // fx эсвэл ханш өөрчлөгдөхөд ₮ дүнг (fx × ханш) дахин бодно.
  function recompute(code: string, fxStr: string, rateStr: string) {
    const fx = parseNum(fxStr);
    const rate = parseNum(rateStr);
    if (fx > 0 && rate > 0) setVal(code, String(round2(fx * rate)));
  }
  function setFx(code: string, v: string) {
    setFxVals((m) => ({ ...m, [code]: v }));
    recompute(code, v, rateVals[code] ?? "");
  }
  function setRate(code: string, v: string) {
    setRateVals((m) => ({ ...m, [code]: v }));
    recompute(code, fxVals[code] ?? "", v);
  }

  // Монголбанкнаас ((Y-1)-12-31) ханш татаж, валютын дансуудад бөглөнө.
  function loadRates() {
    setRateBusy(true);
    setMsg(null);
    start(async () => {
      const res = await fetchOpeningRates(year);
      if (!res.ok) {
        setMsg({ ok: false, text: res.error });
        setRateBusy(false);
        return;
      }
      const nextRate = { ...rateVals };
      const nextFx = { ...fxVals };
      const nextVals = { ...vals };
      let filled = 0;
      const missing = new Set<string>();
      for (const a of accounts) {
        if (!isForeign(a)) continue;
        const cur = (a.currency ?? "").toUpperCase();
        const rate = res.rates[cur];
        if (rate && rate > 0) {
          nextRate[a.code] = String(rate);
          filled++;
          const fx = parseNum(fxVals[a.code] ?? "");
          const mnt = parseNum(vals[a.code] ?? "");
          if (fx > 0) {
            nextVals[a.code] = String(round2(fx * rate));
          } else if (mnt > 0) {
            // Одоо ₮ дүнтэй бол ханшаар нөгөө талд валютын дүнг илчилнэ.
            nextFx[a.code] = String(round2(mnt / rate));
          }
        } else if (cur) missing.add(cur);
      }
      setRateVals(nextRate);
      setFxVals(nextFx);
      setVals(nextVals);
      setMsg({
        ok: true,
        text: `Монголбанк — ${res.rateDate} ханш: ${filled} валютын данс бөглөгдлөө.${
          missing.size ? ` Олдоогүй: ${[...missing].join(", ")}.` : ""
        }`,
      });
      setRateBusy(false);
    });
  }

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

  // Энэ хуудсанд гараар оруулсан Дт/Кт (бусад дэд дэвтэр тусдаа).
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
        <div className="text-sm text-zinc-500">
          Энэ хуудасны гар оруулга:{" "}
          <span className="font-medium text-zinc-700">
            Дт {fmt(totals.dr)} / Кт {fmt(totals.cr)}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {hasForeign && (
            <button
              type="button"
              onClick={loadRates}
              disabled={rateBusy || pending}
              title={`Валютын дансуудад ${year - 1}-12-31-ний Монголбанкны ханшийг татаж бөглөх`}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {rateBusy ? "Татаж байна…" : "₮ Монголбанкны ханш татах"}
            </button>
          )}
          <a
            href="/opening-balances/accounts/template"
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
          disabled={pending}
          onClick={save}
          className="ml-auto rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
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
                  {isForeign(a) ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        value={fxVals[a.code] ?? ""}
                        onChange={(e) => setFx(a.code, e.target.value)}
                        placeholder="0"
                        title="Валютын дүн"
                        className="w-24 rounded border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums focus:border-zinc-900 focus:outline-none"
                      />
                      <span className="w-9 text-left text-xs font-medium text-zinc-400">
                        {(a.currency ?? "").toUpperCase()}
                      </span>
                      <span className="text-zinc-300">×</span>
                      <input
                        value={rateVals[a.code] ?? ""}
                        onChange={(e) => setRate(a.code, e.target.value)}
                        placeholder="ханш"
                        title="Ханш (гараар засаж болно)"
                        className="w-20 rounded border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums focus:border-zinc-900 focus:outline-none"
                      />
                      <span className="text-zinc-300">=</span>
                      <span className="w-32 text-right text-sm tabular-nums font-medium text-zinc-700">
                        {fmt(a.amt)}₮
                      </span>
                    </div>
                  ) : (
                    <input
                      value={vals[a.code] ?? ""}
                      onChange={(e) => setVal(a.code, e.target.value)}
                      placeholder="0"
                      className="w-40 rounded border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums focus:border-zinc-900 focus:outline-none"
                    />
                  )}
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
        Контр данс (ж: хуримтлагдсан элэгдэл) бол сөрөг тоо бичнэ. Харилцагч/хөрөнгө/барааны дэлгэрэнгүйг
        тус тусын таб дээр оруулна — нийт тэнцлийг дээрх «Зөрүү» харуулна.
        <br />
        Валютын данс (USD/CNY…) дээр «валютын дүн × ханш» бичихэд ₮ дүн автомат бодогдоно. «Монголбанкны ханш
        татах» товчоор {year - 1}-12-31-ний албан ёсны ханшийг татна — ханшийг гараар засаж болно.
      </p>
    </div>
  );
}
