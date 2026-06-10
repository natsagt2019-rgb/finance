import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { AssetForm } from "../asset-form";
import { CATEGORY_SELECT, type CategoryRow } from "../types";

export default async function NewAssetPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("asset_categories")
    .select(CATEGORY_SELECT)
    .eq("is_active", true)
    .order("code", { ascending: true })
    .limit(500);
  const categories = (data as CategoryRow[] | null) ?? [];

  return (
    <div>
      <Link href="/assets?tab=assets" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Хөрөнгийн бүртгэл
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Шинэ хөрөнгө</h1>
      <p className="mt-1 text-sm text-zinc-500">Үндсэн хөрөнгийн мэдээллийг оруулна уу.</p>

      <div className="mt-6">
        <AssetForm mode="create" categories={categories} />
      </div>
    </div>
  );
}
