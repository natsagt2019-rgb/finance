import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import {
  LandedCostClient,
  type AccountOpt,
  type AssetCat,
} from "../../inventory/landed-cost/landed-cost-client";

export const metadata = { title: "Гаалийн импорт — Үндсэн хөрөнгө" };

// Импортоор худалдан авсан үндсэн хөрөнгийг landed-cost-оор орлого авах
// тусгай хуудас. Барааны landed-cost-той ижил client-ийг зөвхөн «Үндсэн
// хөрөнгө» горимд (lockMode) ашиглана.
export default async function AssetCustomsImportPage() {
  const supabase = await createClient();

  // Данс (төлбөр + нэмэлт зардлын эх данс).
  const { data: accData } = await supabase
    .from("accounts")
    .select("id, code, name")
    .eq("is_active", true)
    .order("code", { ascending: true })
    .limit(3000);
  const accounts = (accData as AccountOpt[] | null) ?? [];

  // Үндсэн хөрөнгийн ангилал (данс кодтой).
  const { data: catData } = await supabase
    .from("asset_categories")
    .select("id, name, account_code")
    .order("code", { ascending: true })
    .limit(500);
  const assetCats = (
    (catData as { id: number; name: string; account_code: string | null }[] | null) ?? []
  ).filter((c) => c.account_code) as AssetCat[];

  return (
    <div>
      <div className="mb-4 print:hidden">
        <Link href="/assets" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Хөрөнгийн бүртгэл
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-zinc-900 print:hidden">
        Гаалийн импорт — Үндсэн хөрөнгө
      </h1>
      <p className="mt-1 text-sm text-zinc-500 print:hidden">
        Импортоор худалдан авсан үндсэн хөрөнгийн FOB үнэ дээр гаалийн татвар,
        тээвэр, хадгалалтыг шингээж (landed cost) ширхэг бүрд хөрөнгийн карт
        үүсгэнэ. Импортын НӨАТ нөхөгдөх тул өртөгт ороогүй.
      </p>

      <div className="mt-6">
        <LandedCostClient
          items={[]}
          accounts={accounts}
          assetCats={assetCats}
          defaultMode="asset"
          lockMode
        />
      </div>
    </div>
  );
}
