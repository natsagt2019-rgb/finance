import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PartnerForm } from "../../partner-form";
import type { PartnerRow } from "../../actions";

export default async function EditPartnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("partners")
    .select("id, code, name, register, type, phone, email, address, is_active")
    .eq("id", Number(id))
    .single();

  if (error || !data) notFound();
  const partner = data as PartnerRow;

  return (
    <div>
      <Link href="/partners" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Харилцагчид
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
        Харилцагч засах
      </h1>
      <p className="mt-1 text-sm text-zinc-500">{partner.name}</p>

      <div className="mt-6">
        <PartnerForm mode="edit" partner={partner} />
      </div>
    </div>
  );
}
