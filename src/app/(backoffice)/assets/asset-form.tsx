"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createAsset, updateAsset } from "./actions";
import { COMPANIES, type AssetRow, type CategoryRow } from "./types";

type Props = {
  categories: CategoryRow[];
} & (
  | { mode: "create"; asset?: undefined }
  | { mode: "edit"; asset: AssetRow }
);

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

export function AssetForm({ mode, asset, categories }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(asset?.status ?? "active");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res =
          mode === "edit"
            ? await updateAsset(asset.id, formData)
            : await createAsset(formData);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push("/assets?tab=assets");
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
            Хөрөнгийн нэр <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={asset?.name ?? ""}
            placeholder="Toyota Land Cruiser 200"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Карт / нэгжийн дугаар</label>
          <input
            type="text"
            name="code"
            defaultValue={asset?.code ?? ""}
            placeholder="ҮХ-0001"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Ангилал</label>
          <select
            name="category_id"
            defaultValue={asset?.category_id ? String(asset.category_id) : ""}
            className={inputCls}
          >
            <option value="">— сонгох —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `${c.code} — ` : ""}
                {c.name} ({c.useful_life_years} жил)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Компани</label>
          <select
            name="company"
            defaultValue={asset?.company ?? ""}
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

        <div>
          <label className={labelCls}>Орсон огноо</label>
          <input
            type="date"
            name="acquired_date"
            defaultValue={asset?.acquired_date ?? ""}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-zinc-400">Элэгдэл энэ сараас эхэлнэ.</p>
        </div>

        <div>
          <label className={labelCls}>Анхны өртөг (₮)</label>
          <input
            type="number"
            name="cost"
            step="0.01"
            min="0"
            defaultValue={asset ? String(asset.cost) : "0"}
            className={`${inputCls} text-right tabular-nums`}
          />
        </div>

        <div>
          <label className={labelCls}>Үлдэгдэл өртөг (₮)</label>
          <input
            type="number"
            name="salvage_value"
            step="0.01"
            min="0"
            defaultValue={asset ? String(asset.salvage_value) : "0"}
            className={`${inputCls} text-right tabular-nums`}
          />
          <p className="mt-1 text-xs text-zinc-400">Хаягдлын/үлдэх өртөг (0 байж болно).</p>
        </div>

        <div>
          <label className={labelCls}>Ашиглалтын хугацаа (жил)</label>
          <input
            type="number"
            name="useful_life_years"
            step="0.5"
            min="0"
            defaultValue={asset?.useful_life_years ? String(asset.useful_life_years) : ""}
            placeholder="хоосон бол ангиллаас"
            className={`${inputCls} text-right tabular-nums`}
          />
        </div>

        <div>
          <label className={labelCls}>Байршил</label>
          <input
            type="text"
            name="location"
            defaultValue={asset?.location ?? ""}
            placeholder="Төв оффис"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Хариуцагч</label>
          <input
            type="text"
            name="responsible"
            defaultValue={asset?.responsible ?? ""}
            placeholder="Б. Бат"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Төлөв</label>
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputCls}
          >
            <option value="active">Идэвхтэй</option>
            <option value="disposed">Актласан / хассан</option>
          </select>
        </div>

        {status === "disposed" && (
          <>
            <div>
              <label className={labelCls}>Актласан огноо</label>
              <input
                type="date"
                name="disposed_date"
                defaultValue={asset?.disposed_date ?? ""}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Акт / тэмдэглэл</label>
              <input
                type="text"
                name="disposal_note"
                defaultValue={asset?.disposal_note ?? ""}
                placeholder="Актын дугаар, шалтгаан"
                className={inputCls}
              />
            </div>
          </>
        )}
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
          href="/assets?tab=assets"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Болих
        </Link>
      </div>
    </form>
  );
}
