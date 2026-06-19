import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { InvoiceForm, type PartnerOption } from "../../invoice-form";
import {
  INVOICE_SELECT,
  INVOICE_LINE_SELECT,
  type InvoiceRow,
  type InvoiceLine,
} from "../../types";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data, error }, { data: partnerRows }, { data: lineRows }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select(INVOICE_SELECT)
        .eq("id", Number(id))
        .single(),
      supabase
        .from("partners")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(2000),
      supabase
        .from("invoice_lines")
        .select(INVOICE_LINE_SELECT)
        .eq("invoice_id", Number(id))
        .order("sort", { ascending: true }),
    ]);

  if (error || !data) notFound();
  const invoice = data as unknown as InvoiceRow;
  const partners = (partnerRows as PartnerOption[] | null) ?? [];
  const initialLines = (lineRows as InvoiceLine[] | null) ?? [];

  return (
    <div>
      <Link
        href="/invoices"
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Нэхэмжлэхийн тайлан
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
        Нэхэмжлэх засах
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {invoice.invoice_no || `#${invoice.id}`} — {invoice.partner_name ?? ""}
      </p>

      <div className="mt-6">
        <InvoiceForm
          mode="edit"
          invoice={invoice}
          partners={partners}
          initialLines={initialLines}
        />
      </div>
    </div>
  );
}
