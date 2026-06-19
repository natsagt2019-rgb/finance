"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createInvoice, updateInvoice } from "./actions";
import type { InvoiceRow, InvoiceLine } from "./types";

export type PartnerOption = { id: number; name: string };

// НӨАТ хувь — серверийн @/lib/company VAT_RATE-тэй ижил (client тул локалаар).
const VAT_RATE = 0.1;

type Props = { vatPayer: boolean } & (
  | { mode: "create"; invoice?: undefined; partners: PartnerOption[]; initialLines?: undefined }
  | { mode: "edit"; invoice: InvoiceRow; partners: PartnerOption[]; initialLines: InvoiceLine[] }
);

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

function parseNum(s: string): number {
  const n = Number(String(s ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

type LineState = { description: string; qty: string; unit_price: string };

export function InvoiceForm({ mode, invoice, partners, initialLines, vatPayer }: Props) {
  const router = useRouter();
  const vatRate = vatPayer ? VAT_RATE : 0; // НӨАТ төлөгч биш бол НӨАТ тооцохгүй
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const printAfterRef = useRef(false);

  const [lines, setLines] = useState<LineState[]>(() =>
    (initialLines ?? []).map((l) => ({
      description: l.description,
      qty: String(l.qty),
      unit_price: String(l.unit_price),
    })),
  );
  // Мөргүй нэхэмжлэлд гар оруулсан нийт дүн (хуучин зан).
  const [manualAmount, setManualAmount] = useState<string>(
    invoice ? String(invoice.amount) : "",
  );

  const hasLines = lines.some(
    (l) => l.description.trim() || parseNum(l.qty) || parseNum(l.unit_price),
  );

  const totals = useMemo(() => {
    const net = lines.reduce(
      (s, l) => s + parseNum(l.qty) * parseNum(l.unit_price),
      0,
    );
    const vat = net * vatRate;
    return { net, vat, gross: net + vat };
  }, [lines, vatRate]);

  // Сервер рүү илгээх нийт дүн (gross).
  const grossAmount = hasLines ? Math.round(totals.gross) : parseNum(manualAmount);

  function addLine() {
    setLines((ls) => [...ls, { description: "", qty: "1", unit_price: "" }]);
  }
  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, j) => j !== i));
  }
  function updateLine(i: number, patch: Partial<LineState>) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    // Мөрүүдийг JSON-оор (хоосон мөрийг хасч) дамжуулна.
    const payload = lines
      .map((l) => ({
        description: l.description.trim(),
        qty: parseNum(l.qty),
        unit_price: parseNum(l.unit_price),
      }))
      .filter((l) => l.description || l.qty || l.unit_price);
    formData.set("lines", JSON.stringify(payload));
    const printAfter = printAfterRef.current;
    printAfterRef.current = false;

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
        if (printAfter) {
          router.push(`/invoices/${res.id}/print`);
          return;
        }
        router.push("/invoices");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6"
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
      </div>

      {/* ── Мөрүүд (line items) ─────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
          <span className="text-sm font-medium text-zinc-700">
            Мөрүүд <span className="font-normal text-zinc-400">(заавал биш)</span>
          </span>
          <button
            type="button"
            onClick={addLine}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            + Мөр нэмэх
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="px-3 py-3 text-xs text-zinc-400">
            {vatPayer
              ? "Мөр нэмбэл нийт дүн автоматаар бодогдоно (НӨАТ-гүй дүн × 1.1)."
              : "Мөр нэмбэл нийт дүн мөрүүдийн нийлбэрээр бодогдоно (НӨАТ-гүй)."}{" "}
            Мөргүй бол доорх «Нийт дүн»-г гараар бичнэ.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Тодорхойлолт</th>
                  <th className="w-20 px-2 py-2 text-right">Тоо</th>
                  <th className="w-32 px-2 py-2 text-right">Нэгж үнэ</th>
                  <th className="w-32 px-2 py-2 text-right">Дүн (НӨАТ-гүй)</th>
                  <th className="w-10 px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {lines.map((l, i) => {
                  const lineAmt = parseNum(l.qty) * parseNum(l.unit_price);
                  return (
                    <tr key={i}>
                      <td className="px-3 py-1.5">
                        <input
                          value={l.description}
                          onChange={(e) => updateLine(i, { description: e.target.value })}
                          placeholder="Үйлчилгээ / бараа"
                          className="w-full rounded border border-zinc-200 px-2 py-1 text-sm focus:border-zinc-900 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={l.qty}
                          onChange={(e) => updateLine(i, { qty: e.target.value })}
                          inputMode="decimal"
                          className="w-full rounded border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums focus:border-zinc-900 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={l.unit_price}
                          onChange={(e) => updateLine(i, { unit_price: e.target.value })}
                          inputMode="decimal"
                          placeholder="0"
                          className="w-full rounded border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums focus:border-zinc-900 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-zinc-600">
                        {fmt(lineAmt)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          title="Мөр устгах"
                          className="rounded px-1.5 text-red-500 hover:bg-red-50"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-zinc-200 text-sm">
                {vatPayer && (
                  <>
                    <tr>
                      <td colSpan={3} className="px-3 py-1.5 text-right text-zinc-500">
                        Дүн (НӨАТ-гүй)
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-medium text-zinc-700">
                        {fmt(totals.net)}
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-3 py-1.5 text-right text-zinc-500">
                        НӨАТ (10%)
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-zinc-600">
                        {fmt(totals.vat)}
                      </td>
                      <td></td>
                    </tr>
                  </>
                )}
                <tr className="bg-zinc-50 font-semibold text-zinc-900">
                  <td colSpan={3} className="px-3 py-2 text-right">
                    {vatPayer ? "Нийт дүн (НӨАТ-тай)" : "Нийт дүн"}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.gross)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>
            Нийт дүн <span className="text-red-500">*</span>
          </label>
          {hasLines ? (
            <input
              type="text"
              readOnly
              value={fmt(grossAmount)}
              className={`${inputCls} cursor-not-allowed bg-zinc-50 text-right tabular-nums`}
            />
          ) : (
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0"
              required
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              placeholder="0"
              className={`${inputCls} text-right tabular-nums`}
            />
          )}
          {hasLines && (
            <p className="mt-1 text-xs text-zinc-400">
              Мөрүүдээс автоматаар бодогдсон (НӨАТ-тай).
            </p>
          )}
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

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? "Хадгалж байна…" : mode === "edit" ? "Хадгалах" : "Нэмэх"}
        </button>
        <button
          type="submit"
          disabled={isPending}
          onClick={() => {
            printAfterRef.current = true;
          }}
          title="Хадгалаад стандарт загвараар хэвлэх хуудас руу шилжинэ"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          🖨 Хадгалаад хэвлэх
        </button>
        {mode === "edit" && (
          <Link
            href={`/invoices/${invoice.id}/print`}
            target="_blank"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            🖨 Хэвлэх (шинэ цонх)
          </Link>
        )}
        <Link
          href="/invoices"
          className="ml-auto rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Болих
        </Link>
      </div>
    </form>
  );
}
