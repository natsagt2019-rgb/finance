"use client";

import { useMemo, useState } from "react";

export type PB = {
  partner: string;
  receivable: number;
  payable: number;
  txn_count: number;
};

function fmt(n: number): string {
  if (!n) return "—";
  return Math.round(n).toLocaleString("en-US");
}

type SortKey = "receivable" | "payable" | "net" | "partner";

export function PartnerBalancesClient({ rows }: { rows: PB[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("net");
  const [onlyRec, setOnlyRec] = useState(false);
  const [onlyPay, setOnlyPay] = useState(false);

  const filtered = useMemo(() => {
    let r = rows.filter((x) => !q || x.partner.toLowerCase().includes(q.toLowerCase()));
    if (onlyRec) r = r.filter((x) => x.receivable > 1);
    if (onlyPay) r = r.filter((x) => x.payable > 1);
    const net = (x: PB) => x.receivable - x.payable;
    r = [...r].sort((a, b) => {
      if (sort === "partner") return a.partner.localeCompare(b.partner);
      if (sort === "receivable") return b.receivable - a.receivable;
      if (sort === "payable") return b.payable - a.payable;
      return Math.abs(net(b)) - Math.abs(net(a));
    });
    return r;
  }, [rows, q, sort, onlyRec, onlyPay]);

  const t = filtered.reduce(
    (a, x) => ({ rec: a.rec + x.receivable, pay: a.pay + x.payable }),
    { rec: 0, pay: 0 },
  );

  const inputCls =
    "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-900";

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center gap-3 print:hidden">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Харилцагчаар хайх…"
          className={`${inputCls} w-64`}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={inputCls}>
          <option value="net">Эрэмбэ: Цэвэр</option>
          <option value="receivable">Эрэмбэ: Авлага</option>
          <option value="payable">Эрэмбэ: Өглөг</option>
          <option value="partner">Эрэмбэ: Нэр</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-zinc-600">
          <input type="checkbox" checked={onlyRec} onChange={(e) => setOnlyRec(e.target.checked)} />
          Авлагатай
        </label>
        <label className="flex items-center gap-1.5 text-sm text-zinc-600">
          <input type="checkbox" checked={onlyPay} onChange={(e) => setOnlyPay(e.target.checked)} />
          Өглөгтэй
        </label>
        <span className="ml-auto text-xs text-zinc-400">{filtered.length} харилцагч</span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left">Харилцагч</th>
              <th className="px-4 py-2 text-right">Авлага</th>
              <th className="px-4 py-2 text-right">Өглөг</th>
              <th className="px-4 py-2 text-right">Цэвэр (авлага−өглөг)</th>
              <th className="px-4 py-2 text-right">Гүйлгээ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((x) => {
              const net = x.receivable - x.payable;
              return (
                <tr key={x.partner} className="hover:bg-zinc-50">
                  <td className="px-4 py-1.5">
                    <a
                      href={`/reports/partner-balances/${encodeURIComponent(x.partner)}`}
                      className="text-zinc-800 hover:text-blue-600 hover:underline"
                    >
                      {x.partner}
                    </a>
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-emerald-700">
                    {fmt(x.receivable)}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-amber-700">
                    {fmt(x.payable)}
                  </td>
                  <td
                    className={`px-4 py-1.5 text-right tabular-nums font-medium ${
                      net < 0 ? "text-red-600" : "text-zinc-900"
                    }`}
                  >
                    {fmt(net)}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-zinc-400">
                    {x.txn_count}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold">
              <td className="px-4 py-2">НИЙТ ({filtered.length})</td>
              <td className="px-4 py-2 text-right tabular-nums text-emerald-700">{fmt(t.rec)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-amber-700">{fmt(t.pay)}</td>
              <td className={`px-4 py-2 text-right tabular-nums ${t.rec - t.pay < 0 ? "text-red-600" : ""}`}>
                {fmt(t.rec - t.pay)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
