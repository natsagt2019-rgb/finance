"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const BANK_TYPES = ["tdb", "golomt", "mbank"];

function str(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

// Банкны данс нэмэх/засах (id байвал засна).
export async function saveBankAccount(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAuth();

  const idRaw = str(formData.get("id"));
  const account_no = str(formData.get("account_no"));
  const bank_type = str(formData.get("bank_type"));
  if (!account_no) return { ok: false, error: "Дансны дугаар заавал." };
  if (!BANK_TYPES.includes(bank_type))
    return { ok: false, error: "Банкны төрөл буруу." };

  const row = {
    account_no,
    bank_type,
    label: str(formData.get("label")) || account_no,
    gl_code: str(formData.get("gl_code")) || null,
    currency: str(formData.get("currency")) || "MNT",
    is_active: true,
  };

  const res = idRaw
    ? await supabase.from("bank_accounts").update(row).eq("id", Number(idRaw))
    : await supabase.from("bank_accounts").insert(row);
  if (res.error) return { ok: false, error: res.error.message };

  revalidatePath("/settings/bank-accounts");
  revalidatePath("/import");
  return { ok: true };
}

// Банкны данс устгах.
export async function deleteBankAccount(id: number): Promise<ActionResult> {
  const supabase = await requireAuth();
  const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/bank-accounts");
  revalidatePath("/import");
  return { ok: true };
}
