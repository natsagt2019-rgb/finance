import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { MergeClient, type NameRow } from "./merge-client";

// Харилцагчийн нэр нэгтгэх — журналд бичигдсэн нэрийн хувилбаруудыг (галиглал,
// зөв бичиг, зайтай) нэг харилцагч руу нэгтгэнэ. journal_partner_names RPC.

export default async function PartnerMergePage() {
  const supabase = await createClient();

  const { data: nameData } = await supabase.rpc("journal_partner_names");
  const rows = ((nameData as NameRow[] | null) ?? []).map((r) => ({
    partner_name: r.partner_name,
    entries: Number(r.entries) || 0,
    total: Number(r.total) || 0,
    matched: !!r.matched,
  }));

  const { data: pData } = await supabase
    .from("partners")
    .select("name")
    .eq("is_active", true)
    .order("name")
    .limit(5000);
  const partnerNames = ((pData as { name: string }[] | null) ?? []).map((p) => p.name);

  const unmatched = rows.filter((r) => !r.matched).length;

  return (
    <div>
      <Link href="/partners" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Харилцагчид
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Харилцагчийн нэр нэгтгэх</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Журналд өөр өөр бичигдсэн нэрсийг (галиглал, зөв бичиг, зайтай хувилбар) нэг
        харилцагч руу нэгтгэнэ. Нийт {rows.length} нэр, {unmatched} нь таараагүй. Нэгтгэх нэрийг
        сонгоход журналын бичилт шинэчлэгдэж, тухайн харилцагчид alias болж нэмэгдэнэ.
      </p>

      <div className="mt-6">
        <MergeClient rows={rows} partnerNames={partnerNames} />
      </div>
    </div>
  );
}
