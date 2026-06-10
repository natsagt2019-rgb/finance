import Link from "next/link";

import { fmt, CASH_TYPE_LABELS, type BookResult } from "@/lib/cash-calc";
import { PrintButton } from "@/components/print-button";
import type { EntryRow, RegisterRow } from "./types";

export function BookTab({
  registers,
  selectedRegId,
  result,
  year,
  month,
  hrefFor,
}: {
  registers: RegisterRow[];
  selectedRegId: number | null;
  result: BookResult<EntryRow> | null;
  year: number;
  month: number;
  hrefFor: (regId: number) => string;
}) {
  if (registers.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Касс бүртгэгдээгүй байна. «Касс» табаас касс нэмнэ үү.
      </div>
    );
  }

  const reg = registers.find((r) => r.id === selectedRegId) ?? null;

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {registers.map((r) => (
            <Link
              key={r.id}
              href={hrefFor(r.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                r.id === selectedRegId
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {r.name}
            </Link>
          ))}
        </div>
        <PrintButton />
      </div>

      {!result || !reg ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">
          Касс сонгоно уу.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
            <div>
              <span className="font-semibold text-zinc-900">{reg.name}</span>
              <span className="ml-2 text-xs text-zinc-500">
                {reg.currency} · {year} оны {month}-р сар
              </span>
            </div>
            <div className="text-xs text-zinc-500">
              Эхний үлдэгдэл:{" "}
              <span className="font-medium text-zinc-700">{fmt(result.opening)}₮</span>
              {"  ·  "}
              Эцсийн үлдэгдэл:{" "}
              <span className="font-medium text-zinc-700">{fmt(result.closing)}₮</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Огноо</th>
                  <th className="px-4 py-2">Төрөл</th>
                  <th className="px-4 py-2">Утга</th>
                  <th className="px-4 py-2">Баримт</th>
                  <th className="px-4 py-2 text-right">Орлого</th>
                  <th className="px-4 py-2 text-right">Зарлага</th>
                  <th className="px-4 py-2 text-right">Үлдэгдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <tr className="bg-zinc-50/60 font-medium text-zinc-700">
                  <td className="px-4 py-2" colSpan={6}>
                    Эхний үлдэгдэл
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {fmt(result.opening)}
                  </td>
                </tr>
                {result.rows.map(({ entry: e, inAmt, outAmt, balance }) => (
                  <tr key={e.id} className="hover:bg-zinc-50">
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-600">
                      {e.date}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {CASH_TYPE_LABELS[e.type]}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{e.description || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-400">
                      {e.doc_no || "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-green-700">
                      {inAmt ? fmt(inAmt) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-red-600">
                      {outAmt ? fmt(outAmt) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium text-zinc-900">
                      {fmt(balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-200 bg-zinc-50 font-semibold text-zinc-900">
                  <td className="px-4 py-2" colSpan={4}>
                    Дүн
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-green-700">
                    {fmt(result.totalIn)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-red-600">
                    {fmt(result.totalOut)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {fmt(result.closing)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
