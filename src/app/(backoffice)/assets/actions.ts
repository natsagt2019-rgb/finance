"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { computeAsset } from "@/lib/asset-calc";

export type ActionResult =
  | { ok: true; id: number }
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

function num(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// ── Хөрөнгө: нэмэх / засах / устгах ─────────────────────────────────────────
function readAsset(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const statusRaw = get("status");
  const categoryId = num(formData.get("category_id"));
  const life = num(formData.get("useful_life_years"));
  return {
    name: get("name"),
    code: get("code") || null,
    category_id: categoryId > 0 ? categoryId : null,
    company: get("company") || null,
    acquired_date: get("acquired_date") || null,
    cost: num(formData.get("cost")),
    salvage_value: num(formData.get("salvage_value")),
    useful_life_years: life > 0 ? life : null,
    location: get("location") || null,
    responsible: get("responsible") || null,
    opening_date: get("opening_date") || null,
    opening_accum_depreciation: num(formData.get("opening_accum_depreciation")),
    status: statusRaw === "disposed" ? "disposed" : "active",
    disposed_date: get("disposed_date") || null,
    disposal_note: get("disposal_note") || null,
  };
}

export async function createAsset(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readAsset(formData);
  if (!v.name) return { ok: false, error: "Хөрөнгийн нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("assets")
    .insert(v)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: data.id as number };
}

export async function updateAsset(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readAsset(formData);
  if (!v.name) return { ok: false, error: "Хөрөнгийн нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("assets")
    .update(v)
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: data.id as number };
}

export async function deleteAsset(id: number): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("assets")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: data.id as number };
}

// ── Элэгдэл тооцоо: тухайн сарын мөрүүдийг бодож хадгалах ────────────────────
// depreciation-tab-аас ирэх нэг мөрийн оролт (хөрөнгийн id хангалттай).
export type DepreciationInputRow = {
  asset_id: number;
  asset_name: string;
  category_name: string | null;
  company: string | null;
  cost: number;
  salvage_value: number;
  useful_life_years: number;
  acquired_date: string | null;
  opening_date: string | null;
  opening_accum_depreciation: number;
};

export async function saveDepreciation(
  year: number,
  month: number,
  rows: DepreciationInputRow[],
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  if (month < 1 || month > 12) return { ok: false, error: "Сар буруу." };

  const records = rows.map((r) => {
    const c = computeAsset(
      {
        cost: r.cost,
        salvageValue: r.salvage_value,
        usefulLifeYears: r.useful_life_years,
        acquiredDate: r.acquired_date,
        openingDate: r.opening_date,
        openingAccumDepreciation: r.opening_accum_depreciation,
      },
      year,
      month,
    );
    return {
      asset_id: r.asset_id,
      year,
      month,
      asset_name: r.asset_name,
      category_name: r.category_name,
      company: r.company,
      cost: r.cost,
      monthly_depreciation: c.monthlyDepreciation,
      accumulated_depreciation: c.accumulatedDepreciation,
      net_book_value: c.netBookValue,
      is_active: true,
    };
  });

  if (records.length === 0) return { ok: false, error: "Хадгалах мөр алга." };

  const { error } = await supabase
    .from("asset_depreciation")
    .upsert(records, { onConflict: "asset_id,year,month" });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: records.length };
}

// ── Ангилал: нэмэх / засах / устгах ─────────────────────────────────────────
function readCategory(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const life = num(formData.get("useful_life_years"));
  return {
    code: get("code") || null,
    name: get("name"),
    useful_life_years: life > 0 ? life : 10,
    account_code: get("account_code") || null,
    accum_account_code: get("accum_account_code") || null,
  };
}

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readCategory(formData);
  if (!v.name) return { ok: false, error: "Ангиллын нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("asset_categories")
    .insert(v)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: data.id as number };
}

export async function updateCategory(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readCategory(formData);
  if (!v.name) return { ok: false, error: "Ангиллын нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("asset_categories")
    .update(v)
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: data.id as number };
}

export async function deleteCategory(id: number): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("asset_categories")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: data.id as number };
}
