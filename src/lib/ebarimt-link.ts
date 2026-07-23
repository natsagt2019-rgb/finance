import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

// Журналын reference-д бичигдсэн бүх утгын багц. И-баримтын ДДТД энэ багцад
// байвал уг баримтыг журналын гүйлгээнд «холбогдсон» гэж үзнэ (vat_records-д
// холбоосын багана байдаггүй тул холбоос = reference ≡ ДДТД дүрмээр тодорхойлно).
//
// PostgREST нэг хүсэлтэд max-rows (1000) л буцаадаг тул .range()-ээр бүрэн
// хуудаслаж татна — эс бөгөөс 1000-аас олон журнал байхад холбоос дутуу тоологдоно.
export async function fetchUsedJournalRefs(
  supabase: SupabaseServer,
): Promise<Set<string>> {
  const PAGE = 1000;
  const refs = new Set<string>();
  for (let from = 0; from < 1_000_000; from += PAGE) {
    const { data, error } = await supabase
      .from("journals")
      .select("reference")
      .not("reference", "is", null)
      .range(from, from + PAGE - 1);
    if (error) break;
    const rows = (data as { reference: string | null }[] | null) ?? [];
    for (const r of rows) if (r.reference) refs.add(r.reference);
    if (rows.length < PAGE) break;
  }
  return refs;
}
