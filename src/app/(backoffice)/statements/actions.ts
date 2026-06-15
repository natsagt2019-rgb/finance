"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

// Гүйлгээний харьцсан данс (Дт/Кт код) гараар засах.
export async function updateTxnAccounts(
  id: number,
  debitCode: string | null,
  creditCode: string | null,
): Promise<ActionResult> {
  const supabase = await requireAuth();
  const norm = (s: string | null) => {
    const v = (s ?? "").trim();
    return v === "" ? null : v;
  };
  const { error } = await supabase
    .from("transactions")
    .update({ debit_code: norm(debitCode), credit_code: norm(creditCode) })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/statements");
  return { ok: true };
}

// Сонгосон гүйлгээнүүдийн Дт (зардлын данс)-ыг олноор оноох.
// Харилцагчгүй банкны шимтгэл зэргийг хурдан зардалд бичихэд.
export async function bulkSetDebitCode(
  ids: number[],
  code: string,
): Promise<ActionResult> {
  const supabase = await requireAuth();
  const c = (code ?? "").trim();
  if (!c) return { ok: false, error: "Зардлын данс сонгоно уу." };
  if (ids.length === 0) return { ok: false, error: "Гүйлгээ сонгоогүй байна." };

  const CHUNK = 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error } = await supabase
      .from("transactions")
      .update({ debit_code: c })
      .in("id", ids.slice(i, i + CHUNK));
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/statements");
  return { ok: true };
}
