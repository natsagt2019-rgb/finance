import { createClient } from "@/lib/supabase/server";
import { loadPayableItems } from "@/lib/aging-load";
import { buildAgingDetail } from "@/lib/receivables-calc";
import { AgingDetailView } from "@/components/aging-detail-view";

// Өглөгийн насжилтын дэлгэрэнгүй тайлан — нээлттэй өглөг бүрийг (журналын FIFO
// хэсэг) харилцагчаар бүлэглэж, огноо/хоног/бүлгээр нь жагсаана.

export default async function PayablesAgingDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; minDays?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const minDays = Math.max(0, Number(sp.minDays) || 0);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });

  const supabase = await createClient();
  let items = await loadPayableItems(supabase, today);
  if (q) {
    const term = q.toLowerCase();
    items = items.filter((it) => it.partnerName.toLowerCase().includes(term));
  }

  const sum = buildAgingDetail(items, today, minDays);

  return (
    <AgingDetailView
      title="Өглөгийн насжилтын дэлгэрэнгүй"
      subtitle="Нээлттэй өглөг бүрийг (журналын FIFO хэсэг) харилцагчаар нь насжилтаар задалж жагсаав."
      emoji="📤"
      accent="amber"
      sum={sum}
      today={today}
      q={q}
      minDays={minDays}
      emptyText="Нээлттэй өглөг олдсонгүй."
    />
  );
}
