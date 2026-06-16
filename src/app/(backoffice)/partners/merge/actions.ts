"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Журналд бичигдсэн харилцагчийн нэрийн хувилбарыг өөр (canonical) нэр рүү нэгтгэнэ:
//   1) journal_entries.partner_name-г бөөнөөр шинэчилнэ.
//   2) Зорилтот нэр partners-д байвал эх нэрийг alias болгож нэмнэ (ирээдүйд авто-таних).

export type MergeResult = { ok: true; message: string } | { ok: false; error: string };

export async function mergePartnerName(
  fromName: string,
  toName: string,
): Promise<MergeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нэвтрэх шаардлагатай" };

  const from = (fromName ?? "").trim();
  const to = (toName ?? "").trim();
  if (!from || !to) return { ok: false, error: "Эх ба зорилтот нэр шаардлагатай." };
  if (from === to) return { ok: false, error: "Ижил нэр байна." };

  // 1) Журналыг нэгтгэх.
  const { error, count } = await supabase
    .from("journal_entries")
    .update({ partner_name: to }, { count: "exact" })
    .eq("partner_name", from);
  if (error) return { ok: false, error: error.message };

  // 2) Зорилтот харилцагчид alias болгож нэмэх (байвал).
  const { data: p } = await supabase
    .from("partners")
    .select("id, aliases")
    .eq("name", to)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (p) {
    const cur = Array.isArray((p as { aliases: unknown }).aliases)
      ? ((p as { aliases: string[] }).aliases ?? [])
      : [];
    const norm = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();
    if (!cur.some((a) => norm(String(a)) === norm(from))) {
      cur.push(from);
      await supabase.from("partners").update({ aliases: cur }).eq("id", (p as { id: number }).id);
    }
  }

  revalidatePath("/partners/merge");
  revalidatePath("/reports/balance-turnover");
  return { ok: true, message: `${count ?? 0} бичилт “${to}” болж нэгдлээ.` };
}
