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

// Ангилал → данс зураглалын нэг мөрийг хадгалах (нэмэх/засах).
// gl_code хоосон бол тухайн мөрийг устгана.
export async function saveCategoryMap(
  company: string,
  categoryCode: string,
  side: string,
  glCode: string,
  note: string | null,
): Promise<ActionResult> {
  const supabase = await requireAuth();
  const co = (company ?? "").trim();
  const cat = (categoryCode ?? "").trim();
  const gl = (glCode ?? "").trim();
  if (!co || !cat) return { ok: false, error: "Компани / ангилал дутуу." };

  if (!gl) {
    const { error } = await supabase
      .from("category_gl_map")
      .delete()
      .eq("company", co)
      .eq("category_code", cat);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/settings/category-map");
    return { ok: true };
  }

  const { error } = await supabase
    .from("category_gl_map")
    .upsert(
      { company: co, category_code: cat, side, gl_code: gl, note },
      { onConflict: "company,category_code" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/category-map");
  revalidatePath("/statements");
  return { ok: true };
}
