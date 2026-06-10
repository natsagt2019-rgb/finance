import Link from "next/link";

import { fmt, fmtQty } from "@/lib/inventory-calc";
import { MoveDelete } from "./move-actions";
import {
  MOVE_TYPE_LABELS,
  type AccountOption,
  type ItemRow,
  type MoveRow,
  type PartnerOption,
} from "./types";

const TYPE_COLOR: Record<string, string> = {
  receipt: "bg-green-100 text-green-700",
  issue: "bg-blue-100 text-blue-700",
  return_supplier: "bg-amber-100 text-amber-700",
  return_in: "bg-teal-100 text-teal-700",
  disposal: "bg-red-100 text-red-700",
  count_adj: "bg-purple-100 text-purple-700",
};

const NEW_LINKS = [
  { type: "receipt", label: "+ Орлого" },
  { type: "issue", label: "+ Зарлага" },
  { type: "return_supplier", label: "+ Буцаалт" },
  { type: "disposal", label: "+ Устгал" },
] as const;

export function MovesTab({
  moves,
  items,
  partners,
  year,
  month,
}: {
  moves: MoveRow[];
  items: ItemRow[];
  accounts: AccountOption[];
  partners: PartnerOption[];
  year: number;
  month: number;
}) {
  const itemName = new Map(items.map((i) => [i.id, i.name]));
  const partnerName = new Map(partners.map((p) => [p.id, p.name]));

  return (
    <div>
      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {year} оны {month}-р сар — {moves.length} хөдөлгөөн
        </p>
        <div className="flex flex-wrap gap-2">
          {NEW_LINKS.map((l) => (
            <Link
              key={l.type}
              href={`/inventory/moves/new?type=${l.type}`}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white">
        {moves.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            Энэ сард хөдөлгөөн бүртгэгдээгүй байна.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Огноо</th>
                  <th className="px-4 py-2">Төрөл</th>
                  <th className="px-4 py-2">Бараа</th>
                  <th className="px-4 py-2 text-right">Тоо</th>
                  <th className="px-4 py-2 text-right">Нэгж өртөг</th>
                  <th className="px-4 py-2 text-right">Нийт өртөг</th>
                  <th className="px-4 py-2 text-right">НӨАТ</th>
                  <th className="px-4 py-2">Нийлүүлэгч</th>
                  <th className="px-4 py-2">Баримт</th>
                  <th className="px-4 py-2 text-center">Журнал</th>
                  <th className="no-print px-4 py-2 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {moves.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50">
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-600">
                      {m.date}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          TYPE_COLOR[m.type] ?? "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {MOVE_TYPE_LABELS[m.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-medium text-zinc-800">
                      {itemName.get(m.item_id) ?? `#${m.item_id}`}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-700">
                      {fmtQty(Number(m.qty))}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-500">
                      {fmt(Number(m.unit_cost))}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium text-zinc-900">
                      {fmt(Number(m.total_cost))}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-500">
                      {Number(m.vat_amount) ? fmt(Number(m.vat_amount)) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                      {m.partner_id ? partnerName.get(m.partner_id) ?? "—" : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-400">
                      {m.doc_no || "—"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {m.journal_id ? (
                        <Link
                          href="/journals?source=inventory"
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
                      <MoveDelete id={m.id} />
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
