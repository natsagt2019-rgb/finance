import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { InvoiceForm, type PartnerOption } from "../invoice-form";

export default async function NewInvoicePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("partners")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(2000);

  const partners = (data as PartnerOption[] | null) ?? [];

  return (
    <div>
      <Link
        href="/invoices"
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Нэхэмжлэхийн тайлан
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
        Шинэ нэхэмжлэх
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Нэхэмжлэлийн мэдээллийг оруулна уу.
      </p>

      <div className="mt-6">
        <InvoiceForm mode="create" partners={partners} />
      </div>
    </div>
  );
}
