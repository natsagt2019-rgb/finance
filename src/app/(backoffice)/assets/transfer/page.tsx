import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { BulkTransfer } from "./bulk-transfer";
import {
  ASSET_SELECT,
  LOCATION_SELECT,
  type AssetRow,
  type LocationRow,
} from "../types";

export default async function BulkTransferPage() {
  const supabase = await createClient();
  const [{ data: assetData }, { data: locData }] = await Promise.all([
    supabase
      .from("assets")
      .select(ASSET_SELECT)
      .eq("is_active", true)
      .eq("status", "active")
      .order("name", { ascending: true })
      .limit(5000),
    supabase
      .from("asset_locations")
      .select(LOCATION_SELECT)
      .eq("is_active", true)
      .order("code", { ascending: true })
      .limit(500),
  ]);
  const assets = (assetData as AssetRow[] | null) ?? [];
  const locations = (locData as LocationRow[] | null) ?? [];

  return (
    <div>
      <Link href="/assets?tab=assets" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Хөрөнгийн бүртгэл
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
        Эзэмшил шилжүүлэх / олноор
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Олон хөрөнгийг нэг дор шинэ эд хариуцагч эсвэл байршил руу шилжүүлнэ.
      </p>

      <div className="mt-6">
        <BulkTransfer assets={assets} locations={locations} />
      </div>
    </div>
  );
}
