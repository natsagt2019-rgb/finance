"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Банкны гүйлгээний харьцсан (offset) дансыг засна.
//   Орлого (Дт банк / Кт харьцсан) → credit_code.
//   Зарлага (Дт харьцсан / Кт банк) → debit_code.

export type Result = { ok: true } | { ok: false; error: string };

export async function setCounterAccount(
  txnId: number,
  code: string,
  isIncome: boolean,
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нэвтрэх шаардлагатай" };

  const c = (code ?? "").trim();
  if (!c) return { ok: false, error: "Данс оруулна уу." };

  const { data: acc } = await supabase
    .from("accounts")
    .select("code")
    .eq("code", c)
    .limit(1)
    .maybeSingle();
  if (!acc) return { ok: false, error: `Данс ${c} олдсонгүй.` };

  const patch = isIncome ? { credit_code: c } : { debit_code: c };
  const { error } = await supabase.from("transactions").update(patch).eq("id", txnId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/cash/bank-journal");
  return { ok: true };
}

// Олон гүйлгээний харьцсан дансыг нэг дор солих. Чиглэлийг (орлого/зарлага) тус
// бүрд нь тодорхойлж credit_code/debit_code-ийг зөв шинэчилнэ.
export async function setCounterAccountBulk(
  txnIds: number[],
  code: string,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нэвтрэх шаардлагатай" };

  const c = (code ?? "").trim();
  if (!c) return { ok: false, error: "Данс оруулна уу." };
  if (!txnIds.length) return { ok: false, error: "Гүйлгээ сонгоно уу." };

  const { data: acc } = await supabase
    .from("accounts")
    .select("code")
    .eq("code", c)
    .limit(1)
    .maybeSingle();
  if (!acc) return { ok: false, error: `Данс ${c} олдсонгүй.` };

  const { data: txns } = await supabase
    .from("transactions")
    .select("id, income")
    .in("id", txnIds);
  const incomeIds: number[] = [];
  const expenseIds: number[] = [];
  for (const t of (txns as { id: number; income: number | null }[] | null) ?? [])
    ((Number(t.income) || 0) > 0 ? incomeIds : expenseIds).push(t.id);

  if (incomeIds.length) {
    const { error } = await supabase
      .from("transactions")
      .update({ credit_code: c })
      .in("id", incomeIds);
    if (error) return { ok: false, error: error.message };
  }
  if (expenseIds.length) {
    const { error } = await supabase
      .from("transactions")
      .update({ debit_code: c })
      .in("id", expenseIds);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/cash/bank-journal");
  return { ok: true, count: incomeIds.length + expenseIds.length };
}
