import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { loadCompany } from "@/lib/company";
import { AssetForm } from "../asset-form";
import { AcquirePanel } from "../acquire-panel";
import { DisposePanel } from "../dispose-panel";
import { MovePanel } from "../move-panel";
import {
  ASSET_SELECT,
  CATEGORY_SELECT,
  LOCATION_SELECT,
  MOVEMENT_SELECT,
  type AssetRow,
  type CategoryRow,
  type LocationRow,
  type MovementRow,
} from "../types";

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: assetData }, { data: catData }, { data: locData }, { data: movData }, company] =
    await Promise.all([
      supabase.from("assets").select(ASSET_SELECT).eq("id", Number(id)).single(),
      supabase
        .from("asset_categories")
        .select(CATEGORY_SELECT)
        .eq("is_active", true)
        .order("code", { ascending: true })
        .limit(500),
      supabase
        .from("asset_locations")
        .select(LOCATION_SELECT)
        .eq("is_active", true)
        .order("code", { ascending: true })
        .limit(500),
      supabase
        .from("asset_movements")
        .select(MOVEMENT_SELECT)
        .eq("asset_id", Number(id))
        .order("moved_date", { ascending: false })
        .order("id", { ascending: false })
        .limit(200),
      loadCompany(),
    ]);

  const asset = assetData as AssetRow | null;
  if (!asset) notFound();
  const categories = (catData as CategoryRow[] | null) ?? [];
  const locations = (locData as LocationRow[] | null) ?? [];
  const movements = (movData as MovementRow[] | null) ?? [];
  const category = categories.find((c) => c.id === asset.category_id) ?? null;

  return (
    <div>
      <Link href="/assets?tab=assets" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Хөрөнгийн бүртгэл
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
        Хөрөнгө засах — {asset.name}
      </h1>

      {/* Анхан шатны баримтууд (Сангийн сайдын 347-р тушаал) — хэвлэх */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-500">Анхан шатны баримт:</span>
        {[
          { f: "ux-1", label: "ҮХ-1 Хүлээн авах" },
          { f: "ux-2", label: "ҮХ-2 Их засвар" },
          { f: "ux-3", label: "ҮХ-3 Ашиглалтаас хасах" },
          { f: "ux-4", label: "ҮХ-4 Дотоод шилжүүлэг" },
        ].map(({ f, label }) => (
          <Link
            key={f}
            href={`/assets/${asset.id}/document/${f}`}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            🖨 {label}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <AssetForm mode="edit" asset={asset} categories={categories} locations={locations} />
      </div>

      <div className="mt-6 max-w-2xl space-y-6">
        <AcquirePanel asset={asset} category={category} isVatPayer={company.isVatPayer} />
        <MovePanel asset={asset} locations={locations} movements={movements} />
        <DisposePanel asset={asset} category={category} isVatPayer={company.isVatPayer} />
      </div>
    </div>
  );
}
