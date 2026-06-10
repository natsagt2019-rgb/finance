"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_TYPES, type AccountType } from "./types";

export type ActionResult =
  | { ok: true; id: number; name: string }
  | { ok: false; error: string };

// Бүх action нэвтэрсэн хэрэглэгч шаардана.
async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return { supabase, user };
}

function readForm(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const typeRaw = get("type").toLowerCase() as AccountType;
  const type: AccountType = ACCOUNT_TYPES.includes(typeRaw) ? typeRaw : "asset";
  const parentRaw = get("parent_id");
  const tempPct = Number(get("temp_percent"));
  return {
    code: get("code"),
    name: get("name"),
    name_en: get("name_en") || null,
    note: get("note") || null,
    fs_line: get("fs_line") || null,
    type,
    parent_id: parentRaw ? Number(parentRaw) : null,
    account_number: get("account_number") || null,
    currency: get("currency") || "MNT",
    nature: get("nature") || null,
    journal_type: get("journal_type") || null,
    department_code: get("department_code") || null,
    department_name: get("department_name") || null,
    bank_name: get("bank_name") || null,
    bank_account: get("bank_account") || null,
    is_temp: formData.get("is_temp") != null,
    temp_percent: Number.isFinite(tempPct) ? tempPct : 0,
    is_cogs: formData.get("is_cogs") != null,
  };
}

// ── Шинэ данс нэмэх ────────────────────────────────────────────────────────
export async function createAccount(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readForm(formData);

  if (!v.code) return { ok: false, error: "Код заавал шаардлагатай." };
  if (!v.name) return { ok: false, error: "Нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("accounts")
    .insert(v)
    .select("id, name")
    .single();

  if (error) {
    const msg = /duplicate|unique/i.test(error.message)
      ? `"${v.code}" кодтой данс аль хэдийн байна.`
      : error.message;
    return { ok: false, error: msg };
  }

  revalidatePath("/accounts");
  return { ok: true, id: data.id as number, name: data.name as string };
}

// ── Данс засах ─────────────────────────────────────────────────────────────
export async function updateAccount(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readForm(formData);
  const isInactive = formData.get("is_inactive") != null;

  if (!v.code) return { ok: false, error: "Код заавал шаардлагатай." };
  if (!v.name) return { ok: false, error: "Нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("accounts")
    .update({ ...v, is_active: !isInactive })
    .eq("id", id)
    .select("id, name")
    .single();

  if (error) {
    const msg = /duplicate|unique/i.test(error.message)
      ? `"${v.code}" кодтой данс аль хэдийн байна.`
      : error.message;
    return { ok: false, error: msg };
  }

  revalidatePath("/accounts");
  return { ok: true, id: data.id as number, name: data.name as string };
}

// ── Данс устгах (зөөлөн устгал — is_active=false) ──────────────────────────
export async function deleteAccount(id: number): Promise<ActionResult> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("accounts")
    .update({ is_active: false })
    .eq("id", id)
    .select("id, name")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/accounts");
  return { ok: true, id: data.id as number, name: data.name as string };
}
