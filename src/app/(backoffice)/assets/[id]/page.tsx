import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AssetForm } from "../asset-form";
import {
  ASSET_SELECT,
  CATEGORY_SELECT,
  type AssetRow,
  type CategoryRow,
} from "../types";

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: assetData }, { data: catData }] = await Promise.all([
    supabase.from("assets").select(ASSET_SELECT).eq("id", Number(id)).single(),
    supabase
      .from("asset_categories")
      .select(CATEGORY_SELECT)
      .eq("is_active", true)
      .order("code", { ascending: true })
      .limit(500),
  ]);

  const asset = assetData as AssetRow | null;
  if (!asset) notFound();
  const categories = (catData as CategoryRow[] | null) ?? [];

  return (
    <div>
      <Link href="/assets?tab=assets" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Хөрөнгийн бүртгэл
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
        Хөрөнгө засах — {asset.name}
      </h1>

      <div className="mt-6">
        <AssetForm mode="edit" asset={asset} categories={categories} />
      </div>
    </div>
  );
}
