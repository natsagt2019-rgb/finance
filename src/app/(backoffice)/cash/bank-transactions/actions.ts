"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

// Харилцахын гүйлгээний тайлан дээр харилцагчийн нэрийг гараар засах.
// Зөвхөн counterparty талбарыг өөрчилнө (Дт/Кт код, дүнг хөндөхгүй).
export async function updateTxnCounterparty(
  id: number,
  name: string,
): Promise<ActionResult> {
  const supabase = await requireAuth();
  const v = (name ?? "").trim().replace(/\s+/g, " ");
  const { error } = await supabase
    .from("transactions")
    .update({ counterparty: v === "" ? null : v })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/cash/bank-transactions");
  return { ok: true };
}
