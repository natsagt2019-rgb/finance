import Link from "next/link";

import { fmt, CASH_TYPE_LABELS } from "@/lib/cash-calc";
import { EntryDelete } from "./row-actions";
import type {
  AccountOption,
  EntryRow,
  PartnerOption,
  RegisterRow,
} from "./types";

const TYPE_COLOR: Record<string, string> = {
  in: "bg-green-100 text-green-700",
  out: "bg-red-100 text-red-700",
};

export function EntriesTab({
  entries,
  registers,
  accounts,
  partners,
  year,
  month,
}: {
  entries: EntryRow[];
  registers: RegisterRow[];
  accounts: AccountOption[];
  partners: PartnerOption[];
  year: number;
  month: number;
}) {
  const regName = new Map(registers.map((r) => [r.id, r.name]));
  const partnerName = new Map(partners.map((p) => [p.id, p.name]));
  const accountName = new Map(accounts.map((a) => [a.id, `${a.code} — ${a.name}`]));

  const totalIn = entries
    .filter((e) => e.type === "in")
    .reduce((s, e) => s + Number(e.amount_mnt), 0);
  const totalOut = entries
    .filter((e) => e.type === "out")
    .reduce((s, e) => s + Number(e.amount_mnt), 0);

  return (
    <div>
      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {year} оны {month}-р сар — {entries.length} баримт · орлого{" "}
          <span className="font-medium text-green-700">{fmt(totalIn)}₮</span> · зарлага{" "}
          <span className="font-medium text-red-600">{fmt(totalOut)}₮</span> · цэвэр{" "}
          <span className="font-medium text-zinc-800">{fmt(totalIn - totalOut)}₮</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/cash/entries/new?type=in"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            + Орлого
          </Link>
          <Link
            href="/cash/entries/new?type=out"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            + Зарлага
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white">
        {entries.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            Энэ сард баримт бүртгэгдээгүй байна.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Огноо</th>
                  <th className="px-4 py-2">Төрөл</th>
                  <th className="px-4 py-2">Касс</th>
                  <th className="px-4 py-2">Харилцагч</th>
                  <th className="px-4 py-2">Нөгөө тал данс</th>
                  <th className="px-4 py-2">Утга</th>
                  <th className="px-4 py-2 text-right">Дүн (₮)</th>
                  <th className="px-4 py-2">Баримт</th>
                  <th className="px-4 py-2 text-center">Журнал</th>
                  <th className="no-print px-4 py-2 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-50">
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-600">
                      {e.date}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          TYPE_COLOR[e.type] ?? "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {CASH_TYPE_LABELS[e.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-medium text-zinc-800">
                      {regName.get(e.register_id) ?? `#${e.register_id}`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                      {e.partner_id ? partnerName.get(e.partner_id) ?? "—" : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                      {e.counter_account_id
                        ? accountName.get(e.counter_account_id) ?? "—"
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{e.description || "—"}</td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums font-medium ${
                        e.type === "in" ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {e.type === "in" ? "+" : "−"}
                      {fmt(Number(e.amount_mnt))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-400">
                      {e.doc_no || "—"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {e.journal_id ? (
                        <Link
                          href="/journals?source=cash"
                          title="Журнал үүссэн"
                          className="text-green-600 hover:underline"
                        >
                          ✓
                        </Link>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="no-print whitespace-nowrap px-4 py-2 text-right">
                      <a
                        href={`/cash/voucher/${e.id}`}
                        target="_blank"
                        rel="noopener"
                        className="mr-1 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Баримт
                      </a>
                      <EntryDelete id={e.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
