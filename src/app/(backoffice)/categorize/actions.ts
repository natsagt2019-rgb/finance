"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { aiClassify, type TxnToClassify, type Suggestion } from "@/lib/ai-categorize";

export type UncatTxn = {
  id: number;
  txn_date: string;
  description: string | null;
  counterparty: string | null;
  income: number | null;
  expense: number | null;
};

export type SuggestedRow = UncatTxn & {
  direction: "income" | "expense";
  suggestion: Suggestion;
};

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

// ── Шалгах шаардлагатай гүйлгээ татах ─────────────────────────────────────
// Импорт нь гүйлгээ бүрт код онооно — дүрэм тодорхойгүй үед default код
// (орлого 1.1.1, зарлага 1.2.1) хэрэглэдэг тул хоосон код бараг үүсэхгүй.
// Тиймээс "шалгах шаардлагатай" = код хоосон ЭСВЭЛ default кодтой гүйлгээ.
// Эдгээрийг AI-аар дахин нарийвчлан ангилна.
const DEFAULT_INCOME_CODE = "1.1.1";
const DEFAULT_EXPENSE_CODE = "1.2.1";

export async function loadUncategorized(limit = 100): Promise<UncatTxn[]> {
  const supabase = await requireAuth();
  const orFilter = [
    `and(income.gt.0,income_code.is.null)`,
    `and(income.gt.0,income_code.eq.${DEFAULT_INCOME_CODE})`,
    `and(expense.gt.0,expense_code.is.null)`,
    `and(expense.gt.0,expense_code.eq.${DEFAULT_EXPENSE_CODE})`,
  ].join(",");

  const { data, error } = await supabase
    .from("transactions")
    .select("id, txn_date, description, counterparty, income, expense")
    .or(orFilter)
    .order("txn_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as UncatTxn[] | null) ?? [];
}

// ── AI-аар ангилал санал болгох ──────────────────────────────────────────
export async function suggestCategories(
  txns: UncatTxn[],
): Promise<SuggestedRow[]> {
  await requireAuth();
  if (txns.length === 0) return [];

  const toClassify: TxnToClassify[] = txns.map((t) => ({
    description: t.description ?? "",
    counterparty: t.counterparty ?? "",
    amount: (t.income ?? 0) || (t.expense ?? 0),
    direction: (t.income ?? 0) > 0 ? "income" : "expense",
  }));

  const suggestions = await aiClassify(toClassify);

  return txns.map((t, i) => ({
    ...t,
    direction: toClassify[i].direction,
    suggestion: suggestions[i],
  }));
}

// ── Батлагдсан ангиллыг хадгалах ─────────────────────────────────────────
export async function applyCategories(
  updates: { id: number; direction: "income" | "expense"; code: string }[],
): Promise<{ updated: number }> {
  const supabase = await requireAuth();
  let updated = 0;
  for (const u of updates) {
    if (!u.code) continue;
    const patch =
      u.direction === "income"
        ? { income_code: u.code }
        : { expense_code: u.code };
    const { error } = await supabase
      .from("transactions")
      .update(patch)
      .eq("id", u.id);
    if (error) throw new Error(error.message);
    updated++;
  }
  revalidatePath("/categorize");
  revalidatePath("/reports/cashflow");
  return { updated };
}
