"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createInvoice, updateInvoice } from "./actions";
import type { InvoiceRow } from "./types";

export type PartnerOption = { id: number; name: string };

type Props =
  | { mode: "create"; invoice?: undefined; partners: PartnerOption[] }
  | { mode: "edit"; invoice: InvoiceRow; partners: PartnerOption[] };

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

export function InvoiceForm({ mode, invoice, partners }: Props) {
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
            ? await updateInvoice(invoice.id, formData)
            : await createInvoice(formData);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push("/invoices");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа.",
        );
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Нэхэмж №</label>
          <input
            type="text"
            name="invoice_no"
            defaultValue={invoice?.invoice_no ?? ""}
            placeholder="INV2445 (хоосон бол автоматаар)"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>
            Харилцагч <span className="text-red-500">*</span>
          </label>
          <select
            name="partner_id"
            defaultValue={invoice?.partner_id ? String(invoice.partner_id) : ""}
            className={inputCls}
          >
            <option value="">— сонгох —</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {/* Снапшот нэр (партнер сонгоогүй ч хадгалагдсан нэрийг хадгалах) */}
          <input
            type="hidden"
            name="partner_name"
            defaultValue={invoice?.partner_name ?? ""}
          />
        </div>

        <div>
          <label className={labelCls}>
            Огноо <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="inv_date"
            required
            defaultValue={invoice?.inv_date ?? ""}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Төлөх хугацаа</label>
          <input
            type="date"
            name="due_date"
            defaultValue={invoice?.due_date ?? ""}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Хариуцагч (KAM)</label>
          <input
            type="text"
            name="responsible"
            defaultValue={invoice?.responsible ?? ""}
            placeholder="Баяраа"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Валют</label>
          <select
            name="currency"
            defaultValue={invoice?.currency ?? "MNT"}
            className={inputCls}
          >
            <option value="MNT">MNT (₮)</option>
            <option value="USD">USD ($)</option>
            <option value="CNY">CNY (¥)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Тайлбар</label>
          <input
            type="text"
            name="description"
            defaultValue={invoice?.description ?? ""}
            placeholder="06/09 бөөрөлжүүт / тээвэр…"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>
            Нийт дүн <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0"
            required
            defaultValue={invoice ? String(invoice.amount) : ""}
            placeholder="0"
            className={`${inputCls} text-right tabular-nums`}
          />
        </div>

        <div>
          <label className={labelCls}>Төлсөн дүн</label>
          <input
            type="number"
            name="paid_amount"
            step="0.01"
            min="0"
            defaultValue={invoice ? String(invoice.paid_amount) : "0"}
            placeholder="0"
            className={`${inputCls} text-right tabular-nums`}
          />
          <p className="mt-1 text-xs text-zinc-400">
            Дүнгээс хамаарч төлөв (нээлттэй/хэсэгчлэн/төлөгдсөн) автоматаар
            тодорхойлогдоно.
          </p>
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
          href="/invoices"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Болих
        </Link>
      </div>
    </form>
  );
}
