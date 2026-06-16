"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Журналын нэг бичилтийн харилцагч/дүнг засна (journal_entries.id-аар).
// Тооцооны үлдэгдлийн тайлангаас гүйлгээ дээр дарж засахад ашиглана.

export type EntryEditResult = { ok: true; message: string } | { ok: false; error: string };

export async function updateJournalEntry(
  id: number,
  partnerName: string,
  amount: number,
): Promise<EntryEditResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нэвтрэх шаардлагатай" };

  const pn = (partnerName ?? "").trim();
  const amt = Math.round((Number(amount) || 0) * 100) / 100;
  if (amt <= 0) return { ok: false, error: "Дүн 0-ээс их байх ёстой." };

  const { error } = await supabase
    .from("journal_entries")
    .update({ partner_name: pn || null, amount: amt })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/reports/partner-statement");
  return { ok: true, message: "Хадгаллаа." };
}
