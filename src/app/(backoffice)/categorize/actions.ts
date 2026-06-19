"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { aiClassify, type TxnToClassify, type Suggestion } from "@/lib/ai-categorize";
import {
  buildBankJournalRows,
  postingPrefix,
  type PostingTxn,
} from "@/lib/bank-journal-posting";

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

// ── Сурдаг авто-ангилал: өмнө батлагдсанаас сурч давтагдсаныг бөглөх ───────
// Логик: тодорхой кодтой (default биш) гүйлгээнээс харилцагч→код сурна.
// Дараа нь кодгүй/default кодтой давтагдсан харилцагчийн гүйлгээнд авто ононо.
export type LearnResult = { updated: number; rules: number };

export async function autoApplyLearnedCodes(): Promise<LearnResult> {
  const supabase = await requireAuth();

  type Row = {
    id: number;
    counterparty: string | null;
    income: number | null;
    expense: number | null;
    income_code: string | null;
    expense_code: string | null;
  };

  // Бүх гүйлгээ татах (PostgREST 1000 хязгаар тул хуудаслана).
  const PAGE = 1000;
  const all: Row[] = [];
  for (let offset = 0; offset < 500000; offset += PAGE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, counterparty, income, expense, income_code, expense_code")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data as Row[] | null) ?? [];
    all.push(...page);
    if (page.length < PAGE) break;
  }

  const norm = (s: string | null) => (s ?? "").trim().toLowerCase();

  // Харилцагч → код тус бүрийн давтамж (тодорхой кодоос л сурна).
  const inc = new Map<string, Map<string, number>>();
  const exp = new Map<string, Map<string, number>>();
  const bump = (m: Map<string, Map<string, number>>, k: string, code: string) => {
    let g = m.get(k);
    if (!g) {
      g = new Map();
      m.set(k, g);
    }
    g.set(code, (g.get(code) ?? 0) + 1);
  };
  for (const r of all) {
    const cp = norm(r.counterparty);
    if (!cp) continue;
    if (Number(r.income) > 0 && r.income_code && r.income_code !== DEFAULT_INCOME_CODE)
      bump(inc, cp, r.income_code);
    if (Number(r.expense) > 0 && r.expense_code && r.expense_code !== DEFAULT_EXPENSE_CODE)
      bump(exp, cp, r.expense_code);
  }
  const majority = (g: Map<string, number>): string | null => {
    let best: string | null = null;
    let bn = 0;
    for (const [code, n] of g)
      if (n > bn) {
        bn = n;
        best = code;
      }
    return best;
  };
  const incCode = new Map<string, string>();
  for (const [k, g] of inc) {
    const m = majority(g);
    if (m) incCode.set(k, m);
  }
  const expCode = new Map<string, string>();
  for (const [k, g] of exp) {
    const m = majority(g);
    if (m) expCode.set(k, m);
  }

  // Кодгүй/default гүйлгээнд сурсан кодыг оноох (кодоор бүлэглэж багц шинэчилнэ).
  const incIds = new Map<string, number[]>();
  const expIds = new Map<string, number[]>();
  for (const r of all) {
    const cp = norm(r.counterparty);
    if (!cp) continue;
    if (Number(r.income) > 0 && (!r.income_code || r.income_code === DEFAULT_INCOME_CODE)) {
      const code = incCode.get(cp);
      if (code) (incIds.get(code) ?? incIds.set(code, []).get(code)!).push(r.id);
    } else if (
      Number(r.expense) > 0 &&
      (!r.expense_code || r.expense_code === DEFAULT_EXPENSE_CODE)
    ) {
      const code = expCode.get(cp);
      if (code) (expIds.get(code) ?? expIds.set(code, []).get(code)!).push(r.id);
    }
  }

  let updated = 0;
  const CHUNK = 500;
  for (const [code, ids] of incIds) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { error } = await supabase
        .from("transactions")
        .update({ income_code: code })
        .in("id", ids.slice(i, i + CHUNK));
      if (error) throw new Error(error.message);
    }
    updated += ids.length;
  }
  for (const [code, ids] of expIds) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { error } = await supabase
        .from("transactions")
        .update({ expense_code: code })
        .in("id", ids.slice(i, i + CHUNK));
      if (error) throw new Error(error.message);
    }
    updated += ids.length;
  }

  revalidatePath("/categorize");
  return { updated, rules: incCode.size + expCode.size };
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

// ── Банкны гүйлгээг журналд (journal_entries) бичих ──────────────────────────
// Ангилсан кодоор double-entry журнал үүсгэнэ (идемпотент: CASH{yy}: устгаад дахин).
export type PostJournalResult = {
  made: number;
  skipped: number;
  skippedUncoded: number;
};

export async function postBankJournal(year: number): Promise<PostJournalResult> {
  const supabase = await requireAuth();

  // Тухайн оны бүх гүйлгээ (PostgREST 1000 хязгаар тул хуудаслана).
  const PAGE = 1000;
  const all: PostingTxn[] = [];
  for (let offset = 0; offset < 500000; offset += PAGE) {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "txn_date, description, master_code, master_name, income, expense, income_code, expense_code, account_id, exchange_rate, debit_code, credit_code",
      )
      .eq("year", year)
      .order("txn_date", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data as PostingTxn[] | null) ?? [];
    all.push(...page);
    if (page.length < PAGE) break;
  }

  const { rows, made, skipped, skippedUncoded } = buildBankJournalRows(all, year);

  // Idempotent: тухайн оны өмнө үүсгэсэн банкны журналыг устгаад дахин бичнэ.
  const prefix = postingPrefix(year);
  const { error: delErr } = await supabase
    .from("journal_entries")
    .delete()
    .like("description", `${prefix}%`);
  if (delErr) throw new Error(delErr.message);

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase
      .from("journal_entries")
      .insert(rows.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
  }

  revalidatePath("/reports/trial-balance-by-type");
  revalidatePath("/reports/balance-sheet");
  revalidatePath("/reports/income-statement");

  return { made, skipped, skippedUncoded };
}
