"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  createPartner,
  updatePartner,
  deletePartner,
  type PartnerRow,
} from "./actions";

type Props =
  | { mode: "create"; partner?: undefined }
  | { mode: "edit"; partner: PartnerRow };

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

export function PartnerForm({ mode, partner }: Props) {
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
            ? await updatePartner(partner.id, formData)
            : await createPartner(formData);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push("/partners");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа.",
        );
      }
    });
  }

  function handleDelete() {
    if (mode !== "edit") return;
    const ok = window.confirm(
      `"${partner.name}" харилцагчийг устгах уу?\n(Журнал/eBarimt/нэхэмжлэлтэй бол устгахгүй, зөвхөн идэвхгүй болгоно.)`,
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await deletePartner(partner.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/partners");
      router.refresh();
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
            Нэр <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={partner?.name ?? ""}
            placeholder="Харилцагчийн нэр"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Код</label>
          <input
            type="text"
            name="code"
            defaultValue={partner?.code ?? ""}
            placeholder="C10001-01"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Регистр</label>
          <input
            type="text"
            name="register"
            defaultValue={partner?.register ?? ""}
            placeholder="0000000"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Төрөл</label>
          <select
            name="type"
            defaultValue={partner?.type ?? "both"}
            className={inputCls}
          >
            <option value="both">Хоёул</option>
            <option value="customer">Авлага (худалдан авагч)</option>
            <option value="supplier">Өглөг (нийлүүлэгч)</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Утас</label>
          <input
            type="text"
            name="phone"
            defaultValue={partner?.phone ?? ""}
            placeholder="99000000"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Цахим шуудан</label>
          <input
            type="email"
            name="email"
            defaultValue={partner?.email ?? ""}
            placeholder="name@example.com"
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Хаяг</label>
          <input
            type="text"
            name="address"
            defaultValue={partner?.address ?? ""}
            placeholder="Хаяг"
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
          href="/partners"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Болих
        </Link>
        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="ml-auto rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            🗑 Устгах
          </button>
        )}
      </div>
    </form>
  );
}
