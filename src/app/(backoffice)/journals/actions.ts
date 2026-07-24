"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { mirrorToLedger, partnerNameById } from "@/lib/post-journal";
import { fetchUsedJournalRefs } from "@/lib/ebarimt-link";
import type { LineInput, TxnLink, UnlinkedTxn, UnlinkedEbarimt } from "./types";

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

// Валют + ханшийг цэгцэлнэ. MNT бол ханш үргэлж 1. Гадаад валютын ханш ≤0 бол алдаа.
function resolveFx(
  currency?: string,
  exchange_rate?: number,
): { ok: true; currency: string; rate: number } | { ok: false; error: string } {
  const cur = (currency || "MNT").toUpperCase();
  if (cur === "MNT") return { ok: true, currency: "MNT", rate: 1 };
  const rate = Number(exchange_rate) || 0;
  if (rate <= 0)
    return { ok: false, error: `${cur} валютын ханш (0-ээс их) шаардлагатай.` };
  return { ok: true, currency: cur, rate };
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

// ── Журналд ороогүй (холбогдоогүй) касс/банк гүйлгээ татах ───────────────────
// GL дансны кодоор (ж: 110201) тухайн касс/банкны дэд бүртгэлээс журналд хараахан
// ороогүй гүйлгээнүүдийг буцаана. Банк: кодлогдоогүй (Дт/Кт дутуу) БА гараар
// холбоогүй. Касс: journal_id хоосон.
export async function unlinkedTxnsForAccount(code: string): Promise<UnlinkedTxn[]> {
  const supabase = await requireAuth();
  const out: UnlinkedTxn[] = [];

  // ── Банк ──
  const { data: ba } = await supabase
    .from("bank_accounts")
    .select("account_no")
    .eq("gl_code", code);
  const accountNos = ((ba as { account_no: string }[] | null) ?? []).map((x) => x.account_no);
  if (accountNos.length) {
    const { data: txns } = await supabase
      .from("transactions")
      .select("id, txn_date, description, income, expense, exchange_rate")
      .in("account_id", accountNos)
      .is("journal_id", null)
      .or("debit_code.is.null,debit_code.eq.,credit_code.is.null,credit_code.eq.")
      .order("txn_date", { ascending: false })
      .limit(500);
    for (const t of (txns as {
      id: number; txn_date: string; description: string | null;
      income: number | null; expense: number | null; exchange_rate: number | null;
    }[] | null) ?? []) {
      const inc = Number(t.income) || 0;
      const exp = Number(t.expense) || 0;
      const rate = Number(t.exchange_rate) || 1;
      out.push({
        source: "bank", id: t.id, date: (t.txn_date ?? "").slice(0, 10),
        description: t.description ?? "", direction: inc > 0 ? "in" : "out",
        amount: Math.round((inc || exp) * rate * 100) / 100,
      });
    }
  }

  // ── Касс ──
  const { data: acc } = await supabase.from("accounts").select("id").eq("code", code).maybeSingle();
  const accId = (acc as { id: number } | null)?.id;
  if (accId) {
    const { data: regs } = await supabase.from("cash_registers").select("id").eq("account_id", accId);
    const regIds = ((regs as { id: number }[] | null) ?? []).map((r) => r.id);
    if (regIds.length) {
      const { data: ces } = await supabase
        .from("cash_entries")
        .select("id, date, description, type, amount_mnt")
        .in("register_id", regIds)
        .is("journal_id", null)
        .order("date", { ascending: false })
        .limit(500);
      for (const e of (ces as {
        id: number; date: string; description: string | null; type: string; amount_mnt: number;
      }[] | null) ?? []) {
        out.push({
          source: "cash", id: e.id, date: e.date, description: e.description ?? "",
          direction: e.type === "in" ? "in" : "out", amount: Number(e.amount_mnt),
        });
      }
    }
  }

  // ── eBarimt (журналд ороогүй = ДДТД нь журналын reference-д байхгүй) ──
  // Худ.авалт (type=in) → мөнгө гарна (Кт), борлуулалт (type=out) → мөнгө орно (Дт).
  const usedRefs = await fetchUsedJournalRefs(supabase);
  const { data: vats } = await supabase
    .from("vat_records")
    .select("id, date, type, ddtd, partner_name, total_amount")
    .not("ddtd", "is", null)
    .order("date", { ascending: false })
    .limit(500);
  for (const v of (vats as {
    id: number; date: string; type: string; ddtd: string | null;
    partner_name: string | null; total_amount: number;
  }[] | null) ?? []) {
    if (!v.ddtd || usedRefs.has(v.ddtd)) continue;
    out.push({
      source: "vat",
      id: v.id,
      date: (v.date ?? "").slice(0, 10),
      description: `${v.partner_name ?? ""}${v.ddtd ? ` · ${v.ddtd.slice(0, 18)}` : ""}`.trim(),
      direction: v.type === "in" ? "out" : "in",
      amount: Number(v.total_amount) || 0,
    });
  }

  return out;
}

// ── Журналд ороогүй и-баримт (бүрэн дүнгээр) — журналын форм руу «дуудах» ──────
// Журналын reference-д ДДТД нь байхгүй бол «ороогүй» гэж үзнэ. Хамгийн сүүлийн
// огноогоор эрэмбэлж 1000-г буцаана (net/НӨАТ/нийт дүн задаргаатай).
export async function unlinkedEbarimt(): Promise<UnlinkedEbarimt[]> {
  const supabase = await requireAuth();

  const usedRefs = await fetchUsedJournalRefs(supabase);

  const { data: vats } = await supabase
    .from("vat_records")
    .select(
      "id, date, type, ddtd, partner_id, partner_name, amount, vat_amount, total_amount",
    )
    .not("ddtd", "is", null)
    .order("date", { ascending: false })
    .limit(1000);

  const out: UnlinkedEbarimt[] = [];
  for (const v of (vats as {
    id: number; date: string; type: string; ddtd: string | null;
    partner_id: number | null; partner_name: string | null;
    amount: number | null; vat_amount: number | null; total_amount: number | null;
  }[] | null) ?? []) {
    if (!v.ddtd || usedRefs.has(v.ddtd)) continue;
    out.push({
      id: v.id,
      date: (v.date ?? "").slice(0, 10),
      type: v.type === "in" ? "in" : "out",
      ddtd: v.ddtd,
      partner_id: v.partner_id,
      partner_name: v.partner_name,
      net: Number(v.amount) || 0,
      vat: Number(v.vat_amount) || 0,
      total: Number(v.total_amount) || 0,
    });
  }
  return out;
}

// Сонгосон дэд бүртгэлийн гүйлгээнүүдийг журналд холбоно (journal_id тэмдэглэнэ).
async function linkTxns(
  supabase: Awaited<ReturnType<typeof createClient>>,
  journalId: number,
  links: TxnLink[],
): Promise<void> {
  const bankIds = links.filter((l) => l.source === "bank").map((l) => l.id);
  const cashIds = links.filter((l) => l.source === "cash").map((l) => l.id);
  const vatIds = links.filter((l) => l.source === "vat").map((l) => l.id);
  if (bankIds.length)
    await supabase.from("transactions").update({ journal_id: journalId }).in("id", bankIds);
  if (cashIds.length)
    await supabase.from("cash_entries").update({ journal_id: journalId }).in("id", cashIds);
  // eBarimt: vat_records-д journal_id багана байхгүй тул журналын reference-ийг
  // тухайн ДДТД болгож тэмдэглэнэ (ингэснээр дахин «холбогдоогүй» жагсаалтад гарахгүй).
  if (vatIds.length) {
    const { data: vr } = await supabase
      .from("vat_records")
      .select("ddtd")
      .in("id", vatIds);
    const ddtd = ((vr as { ddtd: string | null }[] | null) ?? [])
      .map((v) => v.ddtd)
      .find((d): d is string => !!d);
    if (ddtd)
      await supabase.from("journals").update({ reference: ddtd }).eq("id", journalId);
  }
}

// ── Гар журнал үүсгэх ───────────────────────────────────────────────────────
export async function createJournal(input: {
  date: string;
  description: string;
  reference: string;
  partner_id: number | null;
  status: "draft" | "posted";
  lines: LineInput[];
  currency?: string;
  exchange_rate?: number;
  // «Түр» тэмдэглэгээ — журнал батлагдаж тайланд орно, гэхдээ дараа шүүж
  // эцэслэн батлахаар тэмдэглэгдэнэ.
  needs_review?: boolean;
}): Promise<ActionResult> {
  const supabase = await requireAuth();

  if (!input.date) return { ok: false, error: "Огноо заавал шаардлагатай." };

  const fx = resolveFx(input.currency, input.exchange_rate);
  if (!fx.ok) return fx;

  // Мөрүүд журналын валютаар оруулагдана — тэнцэл шалгаад ₮ рүү хөрвүүлнэ.
  const prep = prepareLines(input.lines);
  if (!prep.ok) return prep;
  const fxTotal = prep.total; // валютаараа нийт
  const lines = prep.lines.map((l) => ({
    account_id: l.account_id,
    debit: round2(l.debit * fx.rate),
    credit: round2(l.credit * fx.rate),
    description: l.description,
  }));
  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0)); // ₮ нийт

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
      currency: fx.currency,
      exchange_rate: fx.rate,
      fx_amount: fx.currency === "MNT" ? null : fxTotal,
      needs_review: input.needs_review ?? false,
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

  // Сонгосон касс/банк гүйлгээг журналд холбоно (давхар бичихээс сэргийлнэ).
  const links = input.lines.map((l) => l.link).filter((l): l is TxnLink => !!l);
  if (links.length) await linkTxns(supabase, journalId, links);

  revalidatePath("/journals");
  revalidatePath("/statements");
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
    currency?: string;
    exchange_rate?: number;
    needs_review?: boolean;
  },
): Promise<ActionResult> {
  const supabase = await requireAuth();
  if (!input.date) return { ok: false, error: "Огноо заавал шаардлагатай." };

  // Гар бичилт ба харилцагчийн хуудсаас (eBarimt/банк) үүсгэсэн журнал засагдана.
  // Бусад автомат модулийн (НӨАТ/цалин/ҮХ/бараа/банкны нэгдсэн) журналыг эх
  // модулиар нь засна.
  const EDITABLE_SOURCES = new Set(["manual", "payable", "receivable", "expense"]);
  const { data: existing, error: ge } = await supabase
    .from("journals")
    .select("id, number, source")
    .eq("id", id)
    .single();
  if (ge || !existing) return { ok: false, error: "Журнал олдсонгүй." };
  if (!EDITABLE_SOURCES.has(existing.source))
    return {
      ok: false,
      error: "Энэ журнал автомат модулиас үүссэн тул энд засагдахгүй. Эх модулиар нь засна.",
    };

  const fx = resolveFx(input.currency, input.exchange_rate);
  if (!fx.ok) return fx;

  // Мөрүүд журналын валютаар — тэнцэл шалгаад ₮ рүү хөрвүүлнэ.
  const prep = prepareLines(input.lines);
  if (!prep.ok) return prep;
  const fxTotal = prep.total;
  const mntLines = prep.lines.map((l) => ({
    account_id: l.account_id,
    debit: round2(l.debit * fx.rate),
    credit: round2(l.credit * fx.rate),
    description: l.description,
  }));
  const mntTotal = round2(mntLines.reduce((s, l) => s + l.debit, 0));

  const { error: e1 } = await supabase
    .from("journals")
    .update({
      date: input.date,
      description: input.description.trim() || null,
      reference: input.reference.trim() || null,
      status: input.status,
      partner_id: input.partner_id,
      total_amount: mntTotal,
      currency: fx.currency,
      exchange_rate: fx.rate,
      fx_amount: fx.currency === "MNT" ? null : fxTotal,
      needs_review: input.needs_review ?? false,
    })
    .eq("id", id);
  if (e1) return { ok: false, error: e1.message };

  // Мөрүүдийг бүхэлд нь солино (₮-өөр).
  await supabase.from("journal_lines").delete().eq("journal_id", id);
  const { error: e2 } = await supabase.from("journal_lines").insert(
    mntLines.map((l, i) => ({
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
  // Хуучин холбоосыг салгаад (журналд ороогүй болгоод) шинээр холбоно.
  await supabase.from("transactions").update({ journal_id: null }).eq("journal_id", id);
  await supabase.from("cash_entries").update({ journal_id: null }).eq("journal_id", id);
  if (input.status === "posted") {
    const mir = await mirrorToLedger(supabase, {
      date: input.date,
      description: input.description.trim() || null,
      partner_name: await partnerNameById(supabase, input.partner_id),
      source: existing.source,
      journalId: id,
      lines: mntLines,
    });
    if (!mir.ok) return { ok: false, error: `Тайланд тусгахад алдаа: ${mir.error}` };
  }
  const links = input.lines.map((l) => l.link).filter((l): l is TxnLink => !!l);
  if (links.length) await linkTxns(supabase, id, links);

  revalidatePath("/journals");
  revalidatePath("/statements");
  return { ok: true, id, number: (existing.number as string) ?? "" };
}

// ── Журнал устгах (мөрүүд cascade-аар устана) ───────────────────────────────
export async function deleteJournal(id: number): Promise<ActionResult> {
  const supabase = await requireAuth();
  // Холбосон касс/банк гүйлгээг салгана (журналд ороогүй болж дахин холбогдох боломжтой).
  await supabase.from("transactions").update({ journal_id: null }).eq("journal_id", id);
  await supabase.from("cash_entries").update({ journal_id: null }).eq("journal_id", id);
  // journal_entries ба journal_lines хоёул CASCADE-аар устана.
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

// ── «Түр» тэмдэглэгээг арилгах (эцэслэн батлах) — жагсаалтын формоос дуудна ──
// Журнал аль хэдийн батлагдаж тайланд орсон; зөвхөн тэмдэглэгээ арилна.
export async function confirmJournalReview(formData: FormData): Promise<void> {
  const supabase = await requireAuth();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id) || id <= 0) return;
  await supabase.from("journals").update({ needs_review: false }).eq("id", id);
  revalidatePath("/journals");
}
