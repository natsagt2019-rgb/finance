"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type PartnerType = "customer" | "supplier" | "both";

export type PartnerRow = {
  id: number;
  code: string | null;
  name: string;
  register: string | null;
  type: PartnerType;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
};

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
  const typeRaw = get("type").toLowerCase();
  const type: PartnerType =
    typeRaw === "customer" || typeRaw === "supplier" ? typeRaw : "both";
  return {
    code: get("code") || null,
    name: get("name"),
    register: get("register") || null,
    type,
    phone: get("phone") || null,
    email: get("email") || null,
    address: get("address") || null,
  };
}

// ── Шинэ харилцагч нэмэх ──────────────────────────────────────────────────
export async function createPartner(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readForm(formData);

  if (!v.name) return { ok: false, error: "Нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("partners")
    .insert(v)
    .select("id, name")
    .single();

  if (error) {
    const msg = /duplicate|unique/i.test(error.message)
      ? `"${v.code}" код аль хэдийн бүртгэлтэй байна.`
      : error.message;
    return { ok: false, error: msg };
  }

  revalidatePath("/partners");
  return { ok: true, id: data.id as number, name: data.name as string };
}

// ── Харилцагч засах ───────────────────────────────────────────────────────
export async function updatePartner(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readForm(formData);

  if (!v.name) return { ok: false, error: "Нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("partners")
    .update(v)
    .eq("id", id)
    .select("id, name")
    .single();

  if (error) {
    const msg = /duplicate|unique/i.test(error.message)
      ? `"${v.code}" код аль хэдийн бүртгэлтэй байна.`
      : error.message;
    return { ok: false, error: msg };
  }

  revalidatePath("/partners");
  return { ok: true, id: data.id as number, name: data.name as string };
}
