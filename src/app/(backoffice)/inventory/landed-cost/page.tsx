import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { ITEM_SELECT, type ItemRow } from "../types";
import { LandedCostClient, type PickItem, type AccountOpt, type AssetCat } from "./landed-cost-client";

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

  // Данс — төлбөрийн (банк/касс) ба нэмэлт зардлын эх данс (УТЗ 140200 /
  // УТТ 140300 г.м)-д ашиглах учир бүх идэвхтэй данс.
  const { data: accData } = await supabase
    .from("accounts")
    .select("id, code, name")
    .eq("is_active", true)
    .order("code", { ascending: true })
    .limit(3000);
  const accounts = (accData as AccountOpt[] | null) ?? [];

  // Үндсэн хөрөнгийн ангилал (данс кодтой) — «Үндсэн хөрөнгө» горимд ашиглана.
  const { data: catData } = await supabase
    .from("asset_categories")
    .select("id, name, account_code")
    .order("code", { ascending: true })
    .limit(500);
  const assetCats = (
    (catData as { id: number; name: string; account_code: string | null }[] | null) ?? []
  ).filter((c) => c.account_code) as AssetCat[];

  const { data: partData } = await supabase
    .from("partners")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(5000);
  const partners = (partData as { id: number; name: string }[] | null) ?? [];

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
        <LandedCostClient items={picks} accounts={accounts} assetCats={assetCats} partners={partners} defaultMode="inv" lockMode />
      </div>
    </div>
  );
}
