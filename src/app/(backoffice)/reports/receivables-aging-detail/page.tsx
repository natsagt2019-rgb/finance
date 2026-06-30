import { createClient } from "@/lib/supabase/server";
import { loadReceivableItems } from "@/lib/aging-load";
import { buildAgingDetail } from "@/lib/receivables-calc";
import { AgingDetailView } from "@/components/aging-detail-view";

// Авлагын насжилтын дэлгэрэнгүй тайлан — нээлттэй авлага бүрийг (нэхэмжлэх/FIFO
// хэсэг) харилцагчаар бүлэглэж, огноо/хоног/бүлгээр нь жагсаана.

export default async function ReceivablesAgingDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; minDays?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const minDays = Math.max(0, Number(sp.minDays) || 0);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });

  const supabase = await createClient();
  let items = await loadReceivableItems(supabase, today);
  if (q) {
    const term = q.toLowerCase();
    items = items.filter((it) => it.partnerName.toLowerCase().includes(term));
  }

  const sum = buildAgingDetail(items, today, minDays);

  return (
    <AgingDetailView
      title="Авлагын насжилтын дэлгэрэнгүй"
      subtitle="Нээлттэй авлага бүрийг (нэхэмжлэх / журналын FIFO хэсэг) харилцагчаар нь насжилтаар задалж жагсаав."
      emoji="📥"
      accent="blue"
      sum={sum}
      today={today}
      q={q}
      minDays={minDays}
      emptyText="Нээлттэй авлага олдсонгүй."
    />
  );
}
