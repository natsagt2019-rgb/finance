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
  aliases: string[] | null;
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

// Дараагийн харилцагчийн код: одоо байгаа "C{дугаар}-01" хэлбэрийн дундаж
// дугаарын дээдийг +1 болгож үүсгэнэ (эхлэл C10001-01).
async function computeNextPartnerCode(
  supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"],
): Promise<string> {
  const { data } = await supabase
    .from("partners")
    .select("code")
    .not("code", "is", null)
    .limit(100000);
  let max = 10000;
  for (const r of (data as { code: string | null }[] | null) ?? []) {
    const m = /^C(\d+)-\d+$/.exec((r.code ?? "").trim());
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return `C${max + 1}-01`;
}

// Форм дээр дараагийн кодыг урьдчилан харуулахад ашиглана.
export async function getNextPartnerCode(): Promise<string> {
  const { supabase } = await requireAuth();
  return computeNextPartnerCode(supabase);
}

function readForm(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const typeRaw = get("type").toLowerCase();
  const type: PartnerType =
    typeRaw === "customer" || typeRaw === "supplier" ? typeRaw : "both";
  // Нэрний хувилбарууд (alias): мөр эсвэл таслалаар тусгаарлана.
  const aliasList = get("aliases")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    code: get("code") || null,
    name: get("name"),
    register: get("register") || null,
    type,
    phone: get("phone") || null,
    email: get("email") || null,
    address: get("address") || null,
    aliases: aliasList.length ? aliasList : null,
  };
}

// ── Шинэ харилцагч нэмэх ──────────────────────────────────────────────────
export async function createPartner(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readForm(formData);

  if (!v.name) return { ok: false, error: "Нэр заавал шаардлагатай." };

  // Код: "auto" сонголт эсвэл хоосон бол автоматаар олгоно.
  const auto =
    String(formData.get("code_mode") ?? "").trim() === "auto" || !v.code;

  // Автомат үед давхардвал (зэрэг үүсгэлт) дугаарыг ахиулж дахин оролдоно.
  for (let attempt = 0; ; attempt++) {
    if (auto) v.code = await computeNextPartnerCode(supabase);

    const { data, error } = await supabase
      .from("partners")
      .insert(v)
      .select("id, name")
      .single();

    if (!error) {
      revalidatePath("/partners");
      return { ok: true, id: data.id as number, name: data.name as string };
    }

    const dup = /duplicate|unique/i.test(error.message);
    if (auto && dup && attempt < 5) continue; // дугаар ахиулж дахин оролдоно
    return {
      ok: false,
      error: dup
        ? `"${v.code}" код аль хэдийн бүртгэлтэй байна.`
        : error.message,
    };
  }
}

// ── Харилцагч устгах ──────────────────────────────────────────────────────
// Журнал/eBarimt/нэхэмжлэлтэй холбоотой бол устгахгүй, ЗӨВХӨН идэвхгүй болгоно
// (тайлангийн түүх хадгалагдана). Холбоосгүй бол бүрмөсөн устгана.
export type DeleteResult =
  | { ok: true; name: string; deactivated: boolean; refs: number }
  | { ok: false; error: string };

export async function deletePartner(id: number): Promise<DeleteResult> {
  const { supabase } = await requireAuth();
  const { data: p } = await supabase
    .from("partners")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!p) return { ok: false, error: "Харилцагч олдсонгүй." };
  const name = (p as { name: string }).name;

  // Холбоос шалгах (partner_id-аар).
  let refs = 0;
  for (const t of ["vat_records", "journals", "invoices"]) {
    const { count } = await supabase
      .from(t)
      .select("id", { count: "exact", head: true })
      .eq("partner_id", id);
    refs += count ?? 0;
  }

  if (refs > 0) {
    const { error } = await supabase
      .from("partners")
      .update({ is_active: false })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/partners");
    return { ok: true, name, deactivated: true, refs };
  }

  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/partners");
  return { ok: true, name, deactivated: false, refs: 0 };
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
