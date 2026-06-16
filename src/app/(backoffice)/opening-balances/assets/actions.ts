"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { OPENING_SOURCES, openDateFor } from "../shared";
import type { SyncResult } from "../sync-button";

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Үндсэн хөрөнгийн эхний үлдэгдлийг журналд тусгана:
//   Дт  хөрөнгийн данс (Σ өртөг)
//   Кт  хуримтлагдсан элэгдлийн данс (Σ opening_accum_depreciation)
// source='opening-asset'. Тухайн огнооны хуучин тусгалыг бүхэлд нь солино.
export async function syncAssetOpening(year: number): Promise<SyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Нэвтрэх шаардлагатай" };

  const date = openDateFor(year);

  const [{ data: assetRows }, { data: catRows }] = await Promise.all([
    supabase
      .from("assets")
      .select("category_id, cost, opening_accum_depreciation")
      .eq("is_active", true)
      .eq("status", "active")
      .limit(10000),
    supabase
      .from("asset_categories")
      .select("id, account_code, accum_account_code")
      .limit(2000),
  ]);

  const cat = new Map(
    (
      (catRows as
        | { id: number; account_code: string | null; accum_account_code: string | null }[]
        | null) ?? []
    ).map((c) => [c.id, c]),
  );

  // Данс код → Дт (өртөг) ба Кт (хуримтлагдсан элэгдэл) нийлбэр.
  const costByAcct = new Map<string, number>();
  const accumByAcct = new Map<string, number>();
  let missing = 0;
  for (const a of (assetRows as
    | { category_id: number | null; cost: number; opening_accum_depreciation: number }[]
    | null) ?? []) {
    const c = a.category_id != null ? cat.get(a.category_id) : undefined;
    const acct = c?.account_code;
    if (!acct) {
      missing++;
      continue;
    }
    costByAcct.set(acct, (costByAcct.get(acct) ?? 0) + (Number(a.cost) || 0));
    const accumAcct = c?.accum_account_code;
    const accum = Number(a.opening_accum_depreciation) || 0;
    if (accumAcct && accum > 0)
      accumByAcct.set(accumAcct, (accumByAcct.get(accumAcct) ?? 0) + accum);
  }

  const entries: {
    txn_date: string;
    description: string;
    amount: number;
    debit_code: string | null;
    credit_code: string | null;
    is_opening: boolean;
    source: string;
  }[] = [];
  for (const [code, amt] of costByAcct) {
    if (r2(amt) < 0.005) continue;
    entries.push({
      txn_date: date,
      description: "Үндсэн хөрөнгийн эхний үлдэгдэл — өртөг",
      amount: r2(amt),
      debit_code: code,
      credit_code: null,
      is_opening: true,
      source: OPENING_SOURCES.assets,
    });
  }
  for (const [code, amt] of accumByAcct) {
    if (r2(amt) < 0.005) continue;
    entries.push({
      txn_date: date,
      description: "Үндсэн хөрөнгийн эхний үлдэгдэл — хуримтлагдсан элэгдэл",
      amount: r2(amt),
      debit_code: null,
      credit_code: code,
      is_opening: true,
      source: OPENING_SOURCES.assets,
    });
  }

  await supabase
    .from("journal_entries")
    .delete()
    .eq("is_opening", true)
    .eq("txn_date", date)
    .eq("source", OPENING_SOURCES.assets);

  if (entries.length > 0) {
    const { error } = await supabase.from("journal_entries").insert(entries);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/opening-balances/assets");
  revalidatePath("/opening-balances/financial-statement");
  const warn = missing > 0 ? ` (${missing} хөрөнгө дансгүй ангилалд тул орхигдсон)` : "";
  return {
    ok: true,
    message: `✓ ${entries.length} данс журналд тусгалаа (${date})${warn}.`,
  };
}
