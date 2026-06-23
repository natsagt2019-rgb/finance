"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true; id?: number } | { ok: false; error: string };

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

function num(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// Барааны үнэ нэмэх (харилцагчийн тусгай үнэ дэмжсэн; valid_from-оор түүх).
export async function createPrice(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAuth();
  const itemId = Number(formData.get("item_id"));
  if (!itemId) return { ok: false, error: "Бараа сонгоно уу." };
  const partnerRaw = String(formData.get("partner_id") ?? "").trim();
  const partnerId = partnerRaw ? Number(partnerRaw) : null;
  const sale = num(formData.get("sale_price"));
  const cost = num(formData.get("cost_price"));
  if (sale <= 0 && cost <= 0) return { ok: false, error: "Зарах эсвэл өртгийн үнэ оруулна уу." };
  const validFrom = String(formData.get("valid_from") ?? "").trim() || null;

  const { data, error } = await supabase
    .from("inv_prices")
    .insert({
      item_id: itemId,
      partner_id: partnerId,
      sale_price: sale,
      cost_price: cost,
      valid_from: validFrom ?? undefined,
      note: String(formData.get("note") ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory/prices");
  return { ok: true, id: data.id as number };
}

export async function deletePrice(id: number): Promise<ActionResult> {
  const supabase = await requireAuth();
  const { error } = await supabase.from("inv_prices").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory/prices");
  return { ok: true };
}
