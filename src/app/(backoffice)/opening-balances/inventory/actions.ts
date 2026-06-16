"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeFifo, type MoveLite } from "@/lib/inventory-calc";
import { OPENING_SOURCES, openDateFor } from "../shared";
import type { SyncResult } from "../sync-button";

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Барааны эхний үлдэгдэл (нээлтийн огноо хүртэлх FIFO өртөг) → Дт бараа
// материалын данс. source='opening-inventory'. Контр тал (Кт) нь дансны
// табын өмчийн эхлэлээр тэнцэнэ.
export async function syncInventoryOpening(year: number): Promise<SyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Нэвтрэх шаардлагатай" };

  const date = openDateFor(year);

  const [{ data: settings }, { data: accRows }, { data: itemRows }, { data: moveRows }] =
    await Promise.all([
      supabase.from("inv_settings").select("category_accounts").eq("id", 1).maybeSingle(),
      supabase.from("accounts").select("id, code").limit(5000),
      supabase.from("inv_items").select("id, category_code").limit(10000),
      supabase
        .from("inv_moves")
        .select("item_id, date, type, qty, unit_cost")
        .lte("date", date)
        .limit(100000),
    ]);

  const catAccounts =
    ((settings as { category_accounts: Record<string, number> } | null)
      ?.category_accounts) ?? {};
  const codeById = new Map(
    ((accRows as { id: number; code: string }[] | null) ?? []).map((a) => [a.id, a.code]),
  );
  const catOfItem = new Map(
    ((itemRows as { id: number; category_code: string }[] | null) ?? []).map((i) => [
      i.id,
      i.category_code,
    ]),
  );

  // Барааны id-аар хөдөлгөөнийг бүлэглэнэ.
  const movesByItem = new Map<number, MoveLite[]>();
  for (const m of (moveRows as
    | { item_id: number; date: string; type: MoveLite["type"]; qty: number; unit_cost: number }[]
    | null) ?? []) {
    const arr = movesByItem.get(m.item_id) ?? [];
    arr.push({
      id: arr.length + 1,
      date: m.date,
      type: m.type,
      qty: Number(m.qty) || 0,
      unit_cost: Number(m.unit_cost) || 0,
    });
    movesByItem.set(m.item_id, arr);
  }

  // Данс код → нийт FIFO өртөг.
  const valueByAcct = new Map<string, number>();
  let unmapped = 0;
  for (const [itemId, moves] of movesByItem) {
    const { valueRemaining } = computeFifo(moves);
    if (valueRemaining < 0.005) continue;
    const catCode = catOfItem.get(itemId);
    const acctId = catCode ? catAccounts[catCode] : undefined;
    const code = acctId != null ? codeById.get(acctId) : undefined;
    if (!code) {
      unmapped++;
      continue;
    }
    valueByAcct.set(code, (valueByAcct.get(code) ?? 0) + valueRemaining);
  }

  const entries = [...valueByAcct.entries()]
    .filter(([, v]) => r2(v) >= 0.005)
    .map(([code, v]) => ({
      txn_date: date,
      description: "Барааны эхний үлдэгдэл",
      amount: r2(v),
      debit_code: code,
      credit_code: null,
      is_opening: true,
      source: OPENING_SOURCES.inventory,
    }));

  await supabase
    .from("journal_entries")
    .delete()
    .eq("is_opening", true)
    .eq("txn_date", date)
    .eq("source", OPENING_SOURCES.inventory);

  if (entries.length > 0) {
    const { error } = await supabase.from("journal_entries").insert(entries);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/opening-balances/inventory");
  revalidatePath("/opening-balances/financial-statement");
  const warn =
    unmapped > 0
      ? ` (${unmapped} барааны ангилал дансанд холбогдоогүй — «Бараа материал» → тохиргоо)`
      : "";
  return {
    ok: true,
    message: `✓ ${entries.length} данс журналд тусгалаа (${date})${warn}.`,
  };
}
