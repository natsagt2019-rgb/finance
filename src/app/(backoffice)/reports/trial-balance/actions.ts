"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  parseTrialBalanceExcel,
  type ParsedTbRow,
} from "@/lib/trial-balance-import";

export type TbPreviewRow = ParsedTbRow & { inChart: boolean };

export type TbPreviewResult = {
  rows: TbPreviewRow[];
  sheet: string;
  skipped: number;
  matched: number; // accounts чартад тохирсон код
  error?: string;
};

export type TbCommitResult = { added: number; year: number };

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

// accounts чартад байгаа кодуудыг олно (fs_line тулгалт энэ кодоор болно).
async function chartCodes(supabase: SupabaseClient): Promise<Set<string>> {
  const set = new Set<string>();
  const { data } = await supabase
    .from("accounts")
    .select("code")
    .eq("is_active", true)
    .limit(5000);
  for (const r of (data as { code: string }[] | null) ?? []) set.add(r.code);
  return set;
}

// ── Урьдчилан харах: файл уншаад мөрүүдийг буцаана ────────────────────────
export async function previewTrialBalance(
  formData: FormData,
): Promise<TbPreviewResult> {
  const supabase = await requireAuth();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { rows: [], sheet: "", skipped: 0, matched: 0, error: "Файл сонгоно уу." };
  }

  let parsed;
  try {
    parsed = parseTrialBalanceExcel(await file.arrayBuffer());
  } catch (e) {
    return {
      rows: [],
      sheet: "",
      skipped: 0,
      matched: 0,
      error: e instanceof Error ? e.message : "Excel уншихад алдаа гарлаа.",
    };
  }

  const codes = await chartCodes(supabase);
  const rows: TbPreviewRow[] = parsed.rows.map((r) => ({
    ...r,
    inChart: codes.has(r.code),
  }));
  const matched = rows.filter((r) => r.inChart).length;

  return { rows, sheet: parsed.sheet, skipped: parsed.skipped, matched };
}

// ── Батлах: trial_balances руу бичнэ (тухайн он/period-ийг солино) ────────
export async function commitTrialBalance(
  year: number,
  rows: ParsedTbRow[],
): Promise<TbCommitResult> {
  const supabase = await requireAuth();
  const period = "annual";

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Он буруу байна.");
  }
  if (rows.length === 0) throw new Error("Импортлох мөр алга.");

  // Тухайн он/period-ийн хуучин өгөгдлийг арилгаад дахин бичнэ.
  const { error: delErr } = await supabase
    .from("trial_balances")
    .delete()
    .eq("year", year)
    .eq("period", period);
  if (delErr) throw new Error(delErr.message);

  const payload = rows.map((r) => ({
    year,
    period,
    account_code: r.code,
    account_name: r.name || null,
    opening_balance: r.opening,
    closing_balance: r.closing,
  }));

  const CHUNK = 500;
  let added = 0;
  for (let i = 0; i < payload.length; i += CHUNK) {
    const slice = payload.slice(i, i + CHUNK);
    const { error } = await supabase.from("trial_balances").insert(slice);
    if (error) throw new Error(error.message);
    added += slice.length;
  }

  revalidatePath("/reports/balance-sheet");
  revalidatePath("/reports/income-statement");
  revalidatePath("/reports/equity-changes");
  return { added, year };
}
