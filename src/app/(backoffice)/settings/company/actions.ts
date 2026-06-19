"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

function str(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

// Үндсэн байгууллагын мэдээллийг хадгална (нэг мөр, id=1 — upsert).
export async function saveCompany(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нэвтрэх шаардлагатай" };

  const name = str(formData.get("name"));
  if (!name) return { ok: false, error: "Байгууллагын нэр заавал." };

  const row = {
    id: 1,
    name,
    name_upper: str(formData.get("name_upper")) || name.toUpperCase(),
    address: str(formData.get("address")),
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
    web: str(formData.get("web")),
    register: str(formData.get("register")),
    tax_id: str(formData.get("tax_id")),
    bank_name: str(formData.get("bank_name")),
    bank_account: str(formData.get("bank_account")),
    bank_iban: str(formData.get("bank_iban")),
    director: str(formData.get("director")),
    accountant: str(formData.get("accountant")),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("company_settings")
    .upsert(row, { onConflict: "id" });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/company");
  revalidatePath("/dashboard");
  return { ok: true };
}
