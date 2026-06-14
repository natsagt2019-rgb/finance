"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { CASH_DOC, type CashType } from "@/lib/cash-calc";
import {
  buildCashJournalLines,
  type CashJournalSettings,
  type EntryForJournal,
} from "@/lib/cash-journal";
import { postJournal } from "@/lib/post-journal";
import type { CashSettings } from "./types";

export type ActionResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

type Supa = Awaited<ReturnType<typeof createClient>>;

async function requireAuth(): Promise<Supa> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

function num(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// ── Касс: нэмэх / засах / устгах ────────────────────────────────────────────
function readRegister(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const accId = num(formData.get("account_id"));
  return {
    name: get("name"),
    currency: get("currency") || "MNT",
    account_id: accId > 0 ? accId : null,
    company: get("company") || null,
    note: get("note") || null,
  };
}

export async function createRegister(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAuth();
  const v = readRegister(formData);
  if (!v.name) return { ok: false, error: "Кассын нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("cash_registers")
    .insert(v)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/cash");
  return { ok: true, id: data.id as number };
}

export async function updateRegister(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await requireAuth();
  const v = readRegister(formData);
  if (!v.name) return { ok: false, error: "Кассын нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("cash_registers")
    .update(v)
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/cash");
  return { ok: true, id: data.id as number };
}

export async function deleteRegister(id: number): Promise<ActionResult> {
  const supabase = await requireAuth();

  // Баримттай касс — зөөлөн устгал (түүх хадгална).
  const { data, error } = await supabase
    .from("cash_registers")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/cash");
  return { ok: true, id: data.id as number };
}

// ── Тохиргоо татаж журналын данс resolve хийх ───────────────────────────────
async function loadSettings(supabase: Supa): Promise<CashSettings | null> {
  const { data } = await supabase
    .from("cash_settings")
    .select(
      "id, default_income_account_id, default_expense_account_id, auto_journal",
    )
    .eq("id", 1)
    .maybeSingle();
  return (data as CashSettings | null) ?? null;
}

function toJournalSettings(s: CashSettings | null): CashJournalSettings {
  return {
    defaultIncomeAccountId: s?.default_income_account_id ?? null,
    defaultExpenseAccountId: s?.default_expense_account_id ?? null,
  };
}

// Дараагийн баримтын дугаар: КО100001 / КЗ100001 (төрөл тус бүрд дараалсан).
export async function nextDocNo(
  supabase: Supa,
  type: CashType,
): Promise<string> {
  const { count } = await supabase
    .from("cash_entries")
    .select("id", { count: "exact", head: true })
    .eq("type", type);
  return `${CASH_DOC[type]}${100001 + (count ?? 0)}`;
}

// ── Баримт үүсгэх (орлого/зарлага) ──────────────────────────────────────────
export type EntryInput = {
  date: string;
  type: CashType;
  register_id: number;
  amount: number;
  rate: number;
  partner_id: number | null;
  partner_name: string | null;
  partner_register: string | null;
  counter_account_id: number | null;
  doc_no: string | null;
  description: string | null;
  description_en: string | null;
  payer: string | null;
  contract: string | null;
  project: string | null;
  company: string | null;
};

export async function createEntry(input: EntryInput): Promise<ActionResult> {
  const supabase = await requireAuth();

  if (!input.date) return { ok: false, error: "Огноо заавал шаардлагатай." };
  if (!input.register_id) return { ok: false, error: "Касс сонгоно уу." };
  const amount = r2(input.amount);
  if (amount <= 0) return { ok: false, error: "Дүн 0-ээс их байх ёстой." };
  const rate = Number(input.rate) > 0 ? Number(input.rate) : 1;
  const amountMnt = r2(amount * rate);

  // Кассын данс (журналд хэрэгтэй).
  const { data: reg, error: regErr } = await supabase
    .from("cash_registers")
    .select("id, name, account_id")
    .eq("id", input.register_id)
    .single();
  if (regErr || !reg) return { ok: false, error: "Касс олдсонгүй." };

  // Баримтын дугаар: гараар оруулсныг хүндэтгэх, үгүй бол авто дараалал.
  const docNo = input.doc_no?.trim() || (await nextDocNo(supabase, input.type));

  // 1) Баримтын мөр (эхлээд журналгүй).
  const { data: ent, error: entErr } = await supabase
    .from("cash_entries")
    .insert({
      date: input.date,
      type: input.type,
      register_id: input.register_id,
      amount,
      rate,
      amount_mnt: amountMnt,
      partner_id: input.partner_id,
      partner_name: input.partner_name,
      partner_register: input.partner_register,
      counter_account_id: input.counter_account_id,
      doc_no: docNo,
      description: input.description,
      description_en: input.description_en,
      payer: input.payer,
      contract: input.contract,
      project: input.project,
      company: input.company,
    })
    .select("id")
    .single();
  if (entErr) return { ok: false, error: entErr.message };
  const entryId = ent.id as number;

  // 2) Журнал (auto_journal асаалттай бол).
  const settings = await loadSettings(supabase);
  if (settings?.auto_journal !== false && amountMnt > 0) {
    const forJournal: EntryForJournal = {
      type: input.type,
      amount_mnt: amountMnt,
      cash_account_id: (reg.account_id as number | null) ?? null,
      counter_account_id: input.counter_account_id,
    };
    const built = buildCashJournalLines(forJournal, toJournalSettings(settings));
    if (!built.ok) {
      // Журнал бичиж чадахгүй бол баримтыг устгаад алдаа буцаана.
      await supabase.from("cash_entries").delete().eq("id", entryId);
      return { ok: false, error: built.error };
    }
    const desc = input.description
      ? `${built.description} — ${input.description}`
      : `${built.description} (${reg.name})`;
    const posted = await postJournal(supabase, {
      date: input.date,
      description: desc,
      reference: docNo,
      partner_id: input.partner_id,
      source: "cash",
      lines: built.lines,
    });
    if (!posted.ok) {
      await supabase.from("cash_entries").delete().eq("id", entryId);
      return { ok: false, error: posted.error };
    }
    await supabase
      .from("cash_entries")
      .update({ journal_id: posted.id })
      .eq("id", entryId);
  }

  revalidatePath("/cash");
  revalidatePath("/journals");
  return { ok: true, id: entryId };
}

// ── Баримт устгах (холбоотой журнал хамт) ───────────────────────────────────
export async function deleteEntry(id: number): Promise<ActionResult> {
  const supabase = await requireAuth();
  const { data: ent } = await supabase
    .from("cash_entries")
    .select("id, journal_id")
    .eq("id", id)
    .single();
  if (!ent) return { ok: false, error: "Баримт олдсонгүй." };

  if (ent.journal_id)
    await supabase.from("journals").delete().eq("id", ent.journal_id);

  const { error } = await supabase.from("cash_entries").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/cash");
  revalidatePath("/journals");
  return { ok: true, id };
}

// ── Тохиргоо хадгалах ────────────────────────────────────────────────────────
export async function saveSettings(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAuth();

  const accId = (k: string): number | null => {
    const n = num(formData.get(k));
    return n > 0 ? n : null;
  };

  const { error } = await supabase.from("cash_settings").upsert(
    {
      id: 1,
      default_income_account_id: accId("default_income_account_id"),
      default_expense_account_id: accId("default_expense_account_id"),
      auto_journal: formData.get("auto_journal") === "on",
    },
    { onConflict: "id" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/cash");
  return { ok: true, id: 1 };
}
