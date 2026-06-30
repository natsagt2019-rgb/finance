"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { CATEGORIES } from "@/lib/inventory-calc";
import { createItem, updateItem } from "./actions";
import { COMPANIES, type ItemRow } from "./types";

type Props =
  | { mode: "create"; item?: undefined; defaultCompany?: string }
  | { mode: "edit"; item: ItemRow; defaultCompany?: undefined };

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

export function ItemForm({ mode, item, defaultCompany }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res =
          mode === "edit"
            ? await updateItem(item.id, formData)
            : await createItem(formData);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push("/inventory?tab=items");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>
            Барааны нэр <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={item?.name ?? ""}
            placeholder="Дизель түлш (ДТ)"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Код / Артикул</label>
          <input
            type="text"
            name="sku"
            defaultValue={item?.sku ?? ""}
            placeholder="DT-001"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Ангилал</label>
          <select
            name="category_code"
            defaultValue={item?.category_code ?? "150100"}
            className={inputCls}
          >
            {CATEGORIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Хэмжих нэгж</label>
          <input
            type="text"
            name="unit"
            defaultValue={item?.unit ?? "ш"}
            placeholder="л, кг, ш"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Доод нөөц (reorder point)</label>
          <input
            type="number"
            name="reorder_point"
            step="0.01"
            min="0"
            defaultValue={item ? String(item.reorder_point) : "0"}
            className={`${inputCls} text-right tabular-nums`}
          />
        </div>

        <div>
          <label className={labelCls}>Компани</label>
          <select
            name="company"
            defaultValue={item?.company ?? defaultCompany ?? ""}
            className={inputCls}
          >
            <option value="">— сонгох —</option>
            {COMPANIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Тэмдэглэл</label>
          <input
            type="text"
            name="note"
            defaultValue={item?.note ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? "Хадгалж байна…" : mode === "edit" ? "Хадгалах" : "Нэмэх"}
        </button>
        <Link
          href="/inventory?tab=items"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Болих
        </Link>
      </div>
    </form>
  );
}
