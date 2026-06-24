"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { mirrorToLedger, partnerNameById } from "@/lib/post-journal";
import type { LineInput } from "./types";

export type ActionResult =
  | { ok: true; id: number; number: string }
  | { ok: false; error: string };

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Дараагийн журналын дугаар: GL-000001 (одоо байгаа тооноос).
async function nextNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const { count } = await supabase
    .from("journals")
    .select("id", { count: "exact", head: true });
  return `GL-${String((count ?? 0) + 1).padStart(6, "0")}`;
}

// ── Гар журнал үүсгэх ───────────────────────────────────────────────────────
export async function createJournal(input: {
  date: string;
  description: string;
  reference: string;
  partner_id: number | null;
  status: "draft" | "posted";
  lines: LineInput[];
}): Promise<ActionResult> {
  const supabase = await requireAuth();

  if (!input.date) return { ok: false, error: "Огноо заавал шаардлагатай." };

  // Зөвхөн утга бүхий мөрүүд (данс + дүн).
  const lines = input.lines
    .map((l) => ({
      account_id: l.account_id,
      debit: round2(l.debit),
      credit: round2(l.credit),
      description: (l.description ?? "").trim() || null,
    }))
    .filter((l) => l.account_id != null && (l.debit !== 0 || l.credit !== 0));

  if (lines.length < 2)
    return { ok: false, error: "Дор хаяж 2 мөр (дебет, кредит) шаардлагатай." };

  for (const l of lines) {
    if (l.debit < 0 || l.credit < 0)
      return { ok: false, error: "Дүн сөрөг байж болохгүй." };
    if (l.debit !== 0 && l.credit !== 0)
      return {
        ok: false,
        error: "Нэг мөрд зөвхөн дебет ЭСВЭЛ кредит бичнэ.",
      };
  }

  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));
  if (totalDebit !== totalCredit)
    return {
      ok: false,
      error: `Баланслахгүй байна: дебет ${totalDebit.toLocaleString()} ≠ кредит ${totalCredit.toLocaleString()}.`,
    };
  if (totalDebit === 0)
    return { ok: false, error: "Нийт дүн 0 байж болохгүй." };

  const number = await nextNumber(supabase);

  const { data: jrn, error: e1 } = await supabase
    .from("journals")
    .insert({
      date: input.date,
      number,
      description: input.description.trim() || null,
      reference: input.reference.trim() || null,
      status: input.status,
      source: "manual",
      partner_id: input.partner_id,
      total_amount: totalDebit,
    })
    .select("id, number")
    .single();

  if (e1) {
    const msg = /duplicate|unique/i.test(e1.message)
      ? "Журналын дугаар давхцлаа, дахин оролдоно уу."
      : e1.message;
    return { ok: false, error: msg };
  }

  const journalId = jrn.id as number;
  const dbLines = lines.map((l, i) => ({
    journal_id: journalId,
    account_id: l.account_id,
    debit: l.debit,
    credit: l.credit,
    description: l.description,
    line_no: i + 1,
  }));

  const { error: e2 } = await supabase.from("journal_lines").insert(dbLines);
  if (e2) {
    // Толгойг буцаан устгана (мөр орохгүй бол толгой үлдэхгүй).
    await supabase.from("journals").delete().eq("id", journalId);
    return { ok: false, error: `Мөр хадгалахад алдаа: ${e2.message}` };
  }

  // Posted журналыг тайлангийн эх сурвалж (journal_entries) руу тусгана.
  if (input.status === "posted") {
    const mir = await mirrorToLedger(supabase, {
      date: input.date,
      description: input.description.trim() || null,
      partner_name: await partnerNameById(supabase, input.partner_id),
      source: "manual",
      journalId,
      lines,
    });
    if (!mir.ok) {
      await supabase.from("journal_lines").delete().eq("journal_id", journalId);
      await supabase.from("journals").delete().eq("id", journalId);
      return { ok: false, error: `Тайланд тусгахад алдаа: ${mir.error}` };
    }
  }

  revalidatePath("/journals");
  return { ok: true, id: journalId, number: jrn.number as string };
}

// Цэвэрлэгдсэн мөр (description нь null байж болно — journal_lines/GL-д хадгална).
type PreparedLine = {
  account_id: number | null;
  debit: number;
  credit: number;
  description: string | null;
};

// Оролтын мөрүүдийг цэвэрлэж, баланс/валид шалгана.
function prepareLines(
  raw: LineInput[],
): { ok: true; lines: PreparedLine[]; total: number } | { ok: false; error: string } {
  const lines = raw
    .map((l) => ({
      account_id: l.account_id,
      debit: round2(l.debit),
      credit: round2(l.credit),
      description: (l.description ?? "").trim() || null,
    }))
    .filter((l) => l.account_id != null && (l.debit !== 0 || l.credit !== 0));

  if (lines.length < 2)
    return { ok: false, error: "Дор хаяж 2 мөр (дебет, кредит) шаардлагатай." };
  for (const l of lines) {
    if (l.debit < 0 || l.credit < 0)
      return { ok: false, error: "Дүн сөрөг байж болохгүй." };
    if (l.debit !== 0 && l.credit !== 0)
      return { ok: false, error: "Нэг мөрд зөвхөн дебет ЭСВЭЛ кредит бичнэ." };
  }
  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));
  if (totalDebit !== totalCredit)
    return {
      ok: false,
      error: `Баланслахгүй байна: дебет ${totalDebit.toLocaleString()} ≠ кредит ${totalCredit.toLocaleString()}.`,
    };
  if (totalDebit === 0) return { ok: false, error: "Нийт дүн 0 байж болохгүй." };
  return { ok: true, lines, total: totalDebit };
}

// ── Гар журнал засах (зөвхөн source='manual') ───────────────────────────────
export async function updateJournal(
  id: number,
  input: {
    date: string;
    description: string;
    reference: string;
    partner_id: number | null;
    status: "draft" | "posted";
    lines: LineInput[];
  },
): Promise<ActionResult> {
  const supabase = await requireAuth();
  if (!input.date) return { ok: false, error: "Огноо заавал шаардлагатай." };

  // Зөвхөн гараар үүсгэсэн журнал засагдана (автомат журналыг модуль удирдана).
  const { data: existing, error: ge } = await supabase
    .from("journals")
    .select("id, number, source")
    .eq("id", id)
    .single();
  if (ge || !existing) return { ok: false, error: "Журнал олдсонгүй." };
  if (existing.source !== "manual")
    return {
      ok: false,
      error: "Зөвхөн гар бичилт (manual) засагдана. Автомат журналыг эх модулиар нь засна.",
    };

  const prep = prepareLines(input.lines);
  if (!prep.ok) return prep;

  const { error: e1 } = await supabase
    .from("journals")
    .update({
      date: input.date,
      description: input.description.trim() || null,
      reference: input.reference.trim() || null,
      status: input.status,
      partner_id: input.partner_id,
      total_amount: prep.total,
    })
    .eq("id", id);
  if (e1) return { ok: false, error: e1.message };

  // Мөрүүдийг бүхэлд нь солино.
  await supabase.from("journal_lines").delete().eq("journal_id", id);
  const { error: e2 } = await supabase.from("journal_lines").insert(
    prep.lines.map((l, i) => ({
      journal_id: id,
      account_id: l.account_id,
      debit: l.debit,
      credit: l.credit,
      description: l.description,
      line_no: i + 1,
    })),
  );
  if (e2) return { ok: false, error: `Мөр хадгалахад алдаа: ${e2.message}` };

  // Ерөнхий дэвтрийн тусгалыг дахин үүсгэнэ (хуучныг устгаад posted бол тусгана).
  await supabase.from("journal_entries").delete().eq("journal_id", id);
  if (input.status === "posted") {
    const mir = await mirrorToLedger(supabase, {
      date: input.date,
      description: input.description.trim() || null,
      partner_name: await partnerNameById(supabase, input.partner_id),
      source: "manual",
      journalId: id,
      lines: prep.lines,
    });
    if (!mir.ok) return { ok: false, error: `Тайланд тусгахад алдаа: ${mir.error}` };
  }

  revalidatePath("/journals");
  return { ok: true, id, number: (existing.number as string) ?? "" };
}

// ── Журнал устгах (мөрүүд cascade-аар устана) ───────────────────────────────
export async function deleteJournal(id: number): Promise<ActionResult> {
  const supabase = await requireAuth();
  // Эхлээд ерөнхий дэвтрийн тусгалыг устгана (FK байхгүй тул гараар).
  await supabase.from("journal_entries").delete().eq("journal_id", id);
  const { data, error } = await supabase
    .from("journals")
    .delete()
    .eq("id", id)
    .select("id, number")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/journals");
  return { ok: true, id: data.id as number, number: (data.number as string) ?? "" };
}
