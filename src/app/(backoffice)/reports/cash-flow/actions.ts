"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { aggregateCashFlow, type CashFlowTxn } from "@/lib/cashflow-rebuild";

export type RebuildResult =
  | { ok: true; lines: number; income: number; expense: number; unmapped: string[] }
  | { ok: false; error: string };

// ── Мөнгөн гүйлгээний тайланг (cash_flow_lines) журнал/гүйлгээнээс дахин дүгнэх ─
// transactions-аас (income_code/expense_code) E-balance cf_code-оор нэгтгэж
// тухайн оны cash_flow_lines-ийг дахин бичнэ. Валютыг ханшаар MNT болгоно.
// Шинээр гүйлгээ кодлогдох/импортлогдох бүрд дарж тайланг шинэчилнэ.
export async function rebuildCashFlow(year: number): Promise<RebuildResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нэвтрэх шаардлагатай" };

  // Тухайн оны бүх валютын гүйлгээ (PostgREST 1000 хязгаар тул хуудаслана).
  const PAGE = 1000;
  const all: CashFlowTxn[] = [];
  for (let offset = 0; offset < 500000; offset += PAGE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("income, expense, exchange_rate, income_code, expense_code")
      .eq("year", year)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const page = (data as CashFlowTxn[] | null) ?? [];
    all.push(...page);
    if (page.length < PAGE) break;
  }

  const { rows, income, expense, unmapped } = aggregateCashFlow(all);

  // Idempotent: тухайн оны annual мөрүүдийг устгаад дахин бичнэ.
  const { error: delErr } = await supabase
    .from("cash_flow_lines")
    .delete()
    .eq("year", year)
    .eq("period", "annual");
  if (delErr) return { ok: false, error: delErr.message };

  if (rows.length > 0) {
    const { error: insErr } = await supabase
      .from("cash_flow_lines")
      .insert(rows.map((r) => ({ year, period: "annual", ...r })));
    if (insErr) return { ok: false, error: insErr.message };
  }

  revalidatePath("/reports/cash-flow");
  return { ok: true, lines: rows.length, income, expense, unmapped };
}
