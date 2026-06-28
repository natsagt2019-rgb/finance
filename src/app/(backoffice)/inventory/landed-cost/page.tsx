import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { ITEM_SELECT, type ItemRow } from "../types";
import { LandedCostClient, type PickItem, type AccountOpt } from "./landed-cost-client";

export const metadata = { title: "Гаалийн өртөг тооцоо" };

export default async function LandedCostPage() {
  const supabase = await createClient();

  // Бараа (идэвхтэй).
  const items: ItemRow[] = [];
  for (let off = 0; off < 100000; off += 1000) {
    const { data } = await supabase
      .from("inv_items")
      .select(ITEM_SELECT)
      .eq("is_active", true)
      .order("name")
      .range(off, off + 999);
    const page = (data as ItemRow[] | null) ?? [];
    items.push(...page);
    if (page.length < 1000) break;
  }
  const picks: PickItem[] = items.map((i) => ({
    id: i.id, sku: i.sku, name: i.name, category_code: i.category_code, unit: i.unit,
  }));

  // Төлбөрийн данс — мөнгөн хөрөнгө (касс/банк, код 11xxx).
  const { data: accData } = await supabase
    .from("accounts")
    .select("id, code, name")
    .eq("is_active", true)
    .like("code", "11%")
    .order("code", { ascending: true })
    .limit(200);
  const accounts = (accData as AccountOpt[] | null) ?? [];

  return (
    <div>
      <div className="mb-4 print:hidden">
        <Link href="/inventory?tab=moves" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Хөдөлгөөн
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-zinc-900 print:hidden">Гаалийн өртөг тооцоо</h1>
      <p className="mt-1 text-sm text-zinc-500 print:hidden">
        Импортын FOB үнэ дээр гаалийн татвар, тээвэр, хадгалалтын зардлыг барааны
        өртөгт шингээж (landed cost) тооцоолно. Импортын НӨАТ нөхөгдөх тул өртөгт
        ороогүй. Тооцоог хэвлэх эсвэл барааг орлогод авна.
      </p>

      <div className="mt-6">
        <LandedCostClient items={picks} accounts={accounts} />
      </div>
    </div>
  );
}
