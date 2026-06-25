"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

const PATH = "/reports/corporate-tax";

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

function num(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

// Түр зөрүүтэй дансны татварын талын дүнг хадгална (жил × данс — нэг мөр).
export async function saveTempDiff(formData: FormData): Promise<void> {
  const supabase = await requireAuth();
  const year = Number(formData.get("year"));
  const code = String(formData.get("account_code") ?? "").trim();
  const amount = num(formData.get("amount"));
  if (!year || !code) return;

  const { data: existing } = await supabase
    .from("tax_adjustments")
    .select("id")
    .eq("year", year)
    .eq("kind", "temp_diff")
    .eq("account_code", code)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("tax_adjustments")
      .update({ amount })
      .eq("id", (existing as { id: number }).id);
  } else {
    await supabase.from("tax_adjustments").insert({
      year,
      kind: "temp_diff",
      account_code: code,
      amount,
      label: String(formData.get("label") ?? "").trim(),
    });
  }
  revalidatePath(PATH);
}

// Гар нэмэгдэл/хасагдал мөр нэмнэ.
export async function addManualLine(formData: FormData): Promise<void> {
  const supabase = await requireAuth();
  const year = Number(formData.get("year"));
  const kind = String(formData.get("kind") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const amount = num(formData.get("amount"));
  if (!year || (kind !== "add" && kind !== "less") || !label) return;

  await supabase
    .from("tax_adjustments")
    .insert({ year, kind, label, amount, account_code: null });
  revalidatePath(PATH);
}

// Тохируулгын мөр устгана.
export async function deleteAdjustment(formData: FormData): Promise<void> {
  const supabase = await requireAuth();
  const id = Number(formData.get("id"));
  if (!id) return;
  await supabase.from("tax_adjustments").delete().eq("id", id);
  revalidatePath(PATH);
}
