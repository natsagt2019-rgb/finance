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

export async function createLocation(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Нэр заавал шаардлагатай." };
  const { data, error } = await supabase
    .from("inv_locations")
    .insert({
      code: String(formData.get("code") ?? "").trim() || null,
      name,
      keeper: String(formData.get("keeper") ?? "").trim() || null,
      note: String(formData.get("note") ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory/locations");
  return { ok: true, id: data.id as number };
}

export async function deleteLocation(id: number): Promise<ActionResult> {
  const supabase = await requireAuth();
  const { error } = await supabase.from("inv_locations").update({ is_active: false }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory/locations");
  return { ok: true };
}
