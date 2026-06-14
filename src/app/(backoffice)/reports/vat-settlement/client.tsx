"use client";

import { useMemo, useState } from "react";

export type VatRow = {
  partner: string;
  output_vat: number;
  input_vat: number;
  txn_count: number;
};

function fmt(n: number): string {
  if (!n) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export function VatClient({ rows }: { rows: VatRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const r = rows.filter((x) => !q || x.partner.toLowerCase().includes(q.toLowerCase()));
    return [...r].sort((a, b) => b.output_vat - a.output_vat);
  }, [rows, q]);

  const t = filtered.reduce(
    (a, x) => ({ out: a.out + x.output_vat, inp: a.inp + x.input_vat }),
    { out: 0, inp: 0 },
  );

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center gap-3 print:hidden">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Харилцагчаар хайх…"
          className="w-64 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-900"
        />
        <span className="ml-auto text-xs text-zinc-400">{filtered.length} харилцагч</span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left">Харилцагч</th>
              <th className="px-4 py-2 text-right">Борлуулалтын НӨАТ (output)</th>
              <th className="px-4 py-2 text-right">Худалдан авалтын НӨАТ (input)</th>
              <th className="px-4 py-2 text-right">Төлөх НӨАТ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((x) => (
              <tr key={x.partner} className="hover:bg-zinc-50">
                <td className="px-4 py-1.5">
                  <a
                    href={`/reports/partner-balances/${encodeURIComponent(x.partner)}`}
                    className="text-zinc-800 hover:text-blue-600 hover:underline"
                  >
                    {x.partner}
                  </a>
                </td>
                <td className="px-4 py-1.5 text-right tabular-nums text-emerald-700">{fmt(x.output_vat)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums text-amber-700">{fmt(x.input_vat)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums font-medium text-zinc-900">
                  {fmt(x.output_vat - x.input_vat)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold">
              <td className="px-4 py-2">НИЙТ ({filtered.length})</td>
              <td className="px-4 py-2 text-right tabular-nums text-emerald-700">{fmt(t.out)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-amber-700">{fmt(t.inp)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmt(t.out - t.inp)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Output = борлуулалтад тооцсон НӨАТ (310601). Input = худалдан авалтын суутгал НӨАТ (120201).
        Төлөх = Output − Input. (Худалдан авалтын НӨАТ задлагдаагүй бол input=0.)
      </p>
    </div>
  );
}
