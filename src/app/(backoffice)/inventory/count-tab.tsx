"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  categoryLabel,
  computeFifo,
  fmtQty,
  type MoveLite,
} from "@/lib/inventory-calc";
import { saveCounts, type CountInputRow } from "./actions";
import type { ItemRow, MoveRow } from "./types";

type EmployeeOption = { id: number; name: string; company: string | null };

type CountEdit = {
  item_id: number;
  name: string;
  unit: string;
  category_code: string;
  book_qty: number;
  counted: string;
  resolution: "natural" | "staff";
  employee_id: string; // staff үед хариуцах ажилтан
};

const cellInput =
  "w-24 rounded border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-zinc-900";

export function CountTab({
  items,
  moves,
  employees,
  company,
  today,
}: {
  items: ItemRow[];
  moves: MoveRow[];
  employees: EmployeeOption[];
  company: string | null;
  today: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [date, setDate] = useState<string>(today);

  const initial: CountEdit[] = useMemo(() => {
    const byItem = new Map<number, MoveLite[]>();
    for (const m of moves) {
      const arr = byItem.get(m.item_id) ?? [];
      arr.push({ id: m.id, date: m.date, type: m.type, qty: m.qty, unit_cost: m.unit_cost });
      byItem.set(m.item_id, arr);
    }
    return items.map((it) => {
      const book = computeFifo(byItem.get(it.id) ?? []).qtyRemaining;
      const rounded = Math.round(book * 1000) / 1000;
      return {
        item_id: it.id,
        name: it.name,
        unit: it.unit,
        category_code: it.category_code,
        book_qty: rounded,
        counted: String(rounded),
        resolution: "natural" as const,
        employee_id: "",
      };
    });
  }, [items, moves]);

  const [rows, setRows] = useState<CountEdit[]>(initial);

  function update<K extends keyof CountEdit>(id: number, field: K, value: CountEdit[K]) {
    setRows((prev) => prev.map((r) => (r.item_id === id ? { ...r, [field]: value } : r)));
  }

  function handleSave() {
    setMsg(null);
    const payload: CountInputRow[] = rows.map((r) => {
      const emp =
        r.resolution === "staff" && r.employee_id
          ? employees.find((e) => e.id === Number(r.employee_id))
          : undefined;
      return {
        item_id: r.item_id,
        counted_qty: Number(r.counted) || 0,
        resolution: r.resolution,
        employee_id: emp ? emp.id : null,
        employee_name: emp ? emp.name : null,
      };
    });
    startTransition(async () => {
      const res = await saveCounts(date, company, payload);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg(`Тооллого хадгалагдлаа — ${res.id} тохируулга үүсгэлээ.`);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">
        Бараа бүртгэгдээгүй байна. Эхлээд «Бараа» табаас бараа нэмнэ үү.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <span>Тооллогын огноо:</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-zinc-900"
          />
          {company && <span className="text-zinc-400">| {company}</span>}
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-zinc-600">{msg}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? "Хадгалж байна…" : "Тооллого хадгалах"}
          </button>
        </div>
      </div>

      <p className="mb-2 text-xs text-zinc-400">
        Бодит тоог оруулна. Зөрүү гарсан мөрд тохируулгын журнал автоматаар үүснэ
        (дутагдал: байгалийн хорогдол → зардал, эсвэл ажилтан → ажилчдын авлага).
      </p>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2">Бараа</th>
              <th className="px-3 py-2">Ангилал</th>
              <th className="px-3 py-2 text-right">Бүртгэлийн</th>
              <th className="px-3 py-2 text-right">Бодит тоо</th>
              <th className="px-3 py-2 text-right">Зөрүү</th>
              <th className="px-3 py-2">Шийдвэрлэлт</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((r) => {
              const diff = Math.round(((Number(r.counted) || 0) - r.book_qty) * 1000) / 1000;
              const shortage = diff < 0;
              return (
                <tr key={r.item_id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 font-medium text-zinc-800">{r.name}</td>
                  <td className="px-3 py-2 text-zinc-500">
                    {categoryLabel(r.category_code)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-500">
                    {fmtQty(r.book_qty)} {r.unit}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={r.counted}
                      onChange={(e) => update(r.item_id, "counted", e.target.value)}
                      className={cellInput}
                    />
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      diff === 0
                        ? "text-zinc-400"
                        : shortage
                          ? "font-semibold text-red-600"
                          : "font-semibold text-green-600"
                    }`}
                  >
                    {diff > 0 ? "+" : ""}
                    {fmtQty(diff)}
                  </td>
                  <td className="px-3 py-2">
                    {shortage ? (
                      <div className="flex flex-wrap items-center gap-1">
                        <select
                          value={r.resolution}
                          onChange={(e) =>
                            update(
                              r.item_id,
                              "resolution",
                              e.target.value as "natural" | "staff",
                            )
                          }
                          className="rounded border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-900"
                        >
                          <option value="natural">Байгалийн хорогдол</option>
                          <option value="staff">Ажилтанд хариуцуулах</option>
                        </select>
                        {r.resolution === "staff" && (
                          <select
                            value={r.employee_id}
                            onChange={(e) =>
                              update(r.item_id, "employee_id", e.target.value)
                            }
                            className="rounded border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-900"
                          >
                            <option value="">— ажилтан —</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
