"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { postJournal } from "@/lib/post-journal";
import type { LineInput } from "@/app/(backoffice)/journals/types";

type ActionResult = { ok: true; message: string } | { ok: false; error: string };

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

// Дансны код → accounts.id map (журналд account_id хэрэгтэй).
async function codeToId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  codes: string[],
): Promise<Map<string, number>> {
  const clean = [...new Set(codes.filter(Boolean))];
  const map = new Map<string, number>();
  if (clean.length === 0) return map;
  const { data } = await supabase
    .from("accounts")
    .select("id, code")
    .in("code", clean);
  for (const a of (data as { id: number; code: string }[] | null) ?? [])
    map.set(a.code, a.id);
  return map;
}

// ── 1. Банкны гүйлгээний Дт/Кт данс солих ──────────────────────────────────
export async function setTransactionAccounts(
  partnerId: number,
  txnId: number,
  debitCode: string,
  creditCode: string,
): Promise<ActionResult> {
  const supabase = await requireAuth();
  const dt = debitCode.trim();
  const kt = creditCode.trim();
  if (!dt && !kt) return { ok: false, error: "Данс оруулна уу." };

  // Кодууд бодит данс мөн эсэхийг шалгана.
  const ids = await codeToId(supabase, [dt, kt]);
  if (dt && !ids.has(dt)) return { ok: false, error: `Данс ${dt} олдсонгүй.` };
  if (kt && !ids.has(kt)) return { ok: false, error: `Данс ${kt} олдсонгүй.` };

  const { error } = await supabase
    .from("transactions")
    .update({ debit_code: dt || null, credit_code: kt || null })
    .eq("id", txnId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/partners/${partnerId}`);
  return { ok: true, message: "Данс шинэчлэгдлээ." };
}

// ── 2. Холбогдоогүй eBarimt-ыг харилцагчтай холбох ─────────────────────────
export async function linkVatToPartner(
  partnerId: number,
  vatIds: number[],
): Promise<ActionResult> {
  const supabase = await requireAuth();
  if (!vatIds.length) return { ok: false, error: "Баримт сонгоно уу." };

  const { error, count } = await supabase
    .from("vat_records")
    .update({ partner_id: partnerId }, { count: "exact" })
    .in("id", vatIds);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/partners/${partnerId}`);
  return { ok: true, message: `${count ?? vatIds.length} баримт холбогдлоо.` };
}

// Холбогдоогүй eBarimt (partner_id null). type: 'in' худалдан авалт | 'out' борлуулалт.
export async function listUnmatchedVat(
  type: "in" | "out" = "in",
): Promise<
  {
    id: number;
    date: string;
    partner_name: string | null;
    ddtd: string | null;
    amount: number;
    vat_amount: number;
    total_amount: number;
  }[]
> {
  const supabase = await requireAuth();
  // Бүх холбогдоогүй баримтыг хуудаслаж авна (PostgREST 1000-cap-аас болж
  // .limit(500) хийвэл хуучин сарын баримт таслагддаг байсан).
  const out: unknown[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("vat_records")
      .select("id, date, partner_name, ddtd, amount, vat_amount, total_amount")
      .is("partner_id", null)
      .eq("type", type)
      .order("date", { ascending: false })
      .range(from, from + 999);
    if (error) break;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out as never;
}

// ── 3a. Ирсэн нэхэмжлэхээс (eBarimt худалдан авалт) өглөг үүсгэх ────────────
export async function createPayableFromVat(input: {
  partnerId: number;
  vatIds: number[];
  dtCode: string; // зардлын данс (7xxx)
  ktCode: string; // өглөгийн данс (default 3310)
  splitVat: boolean; // (ашиглагдахгүй) — худ.авалтын НӨАТ үргэлж Кт өглөгт нэгтгэнэ
  vatAccCode: string; // (ашиглагдахгүй) — НӨАТ 330100 руу орохгүй
  description?: string; // гүйлгээний утга (хоосон бол автомат)
}): Promise<ActionResult> {
  const supabase = await requireAuth();
  const dt = input.dtCode.trim();
  const kt = (input.ktCode || "3310").trim();
  const desc = (input.description || "").trim();
  if (!dt) return { ok: false, error: "Зардлын данс (Дт) оруулна уу." };
  if (!input.vatIds.length) return { ok: false, error: "Баримт сонгоно уу." };

  // Оруулсан НӨАТ-ын (буцаан авах) данс — 130600 «НӨАТ-ын авлага».
  // Худалдан авалтад НӨАТ ҮРГЭЛЖ Дт 130600 / Кт өглөг (нийлүүлэгчид өгөх нийт
  // өглөгт НӨАТ багтана). 330100 (гарцын/борлуулалтын НӨАТ) руу КРЕДИТЛЭХГҮЙ —
  // тэр нь худалдан авалтад буруу тул splitVat/vatAccCode-ыг эндээс үл хэрэгснэ.
  const ids = await codeToId(supabase, [dt, kt, "130600"]);
  const dtId = ids.get(dt);
  const ktId = ids.get(kt);
  const vatDrId = ids.get("130600");
  const vatCrId = ktId;
  if (!dtId) return { ok: false, error: `Данс ${dt} олдсонгүй.` };
  if (!ktId) return { ok: false, error: `Данс ${kt} олдсонгүй.` };

  const { data: vats } = await supabase
    .from("vat_records")
    .select("id, date, partner_name, ddtd, amount, vat_amount")
    .in("id", input.vatIds);
  const rows = (vats as
    | { id: number; date: string; partner_name: string | null; ddtd: string | null; amount: number; vat_amount: number }[]
    | null) ?? [];

  // Давхар бичилтээс хамгаалалт: тухайн ДДТД-ээр журнал аль хэдийн байвал алгасна.
  const journaled = await journaledDdtds(supabase, rows);

  let created = 0;
  let skipped = 0;
  for (const v of rows) {
    if (v.ddtd && journaled.has(v.ddtd)) { skipped++; continue; }
    const net = Number(v.amount) || 0;
    const vat = Number(v.vat_amount) || 0;
    if (net <= 0 && vat <= 0) continue;

    const lines: LineInput[] = [
      { account_id: dtId, debit: net, credit: 0, description: "Зардал" },
      { account_id: ktId, debit: 0, credit: net, description: "Өглөг" },
    ];
    if (vat > 0 && vatDrId && vatCrId) {
      lines.push({ account_id: vatDrId, debit: vat, credit: 0, description: "Оруулсан НӨАТ" });
      lines.push({ account_id: vatCrId, debit: 0, credit: vat, description: "НӨАТ өглөг" });
    }

    const res = await postJournal(supabase, {
      date: v.date,
      description:
        desc || `Ирсэн нэхэмжлэл — ${v.partner_name ?? ""}${v.ddtd ? ` (${v.ddtd})` : ""}`,
      reference: v.ddtd,
      partner_id: input.partnerId,
      source: "payable",
      lines,
    });
    if (res.ok) created++;
  }

  revalidatePath(`/partners/${input.partnerId}`);
  if (created === 0)
    return {
      ok: false,
      error: skipped > 0 ? `Бүгд өмнө нь журналлагдсан (${skipped} алгассан).` : "Журнал үүсгэгдсэнгүй.",
    };
  return {
    ok: true,
    message: `${created} ирсэн нэхэмжлэл өглөг болж бүртгэгдлээ.${skipped ? ` (${skipped} өмнө нь бичигдсэн — алгассан)` : ""}`,
  };
}

// Тухайн ДДТД-ээр аль хэдийн журнал үүссэн эсэх (reference талбараар).
async function journaledDdtds(
  supabase: Awaited<ReturnType<typeof requireAuth>>,
  rows: { ddtd: string | null }[],
): Promise<Set<string>> {
  const ddtds = rows.map((v) => v.ddtd).filter((d): d is string => !!d);
  if (!ddtds.length) return new Set();
  const { data } = await supabase.from("journals").select("reference").in("reference", ddtds);
  return new Set(((data as { reference: string | null }[] | null) ?? []).map((j) => j.reference).filter((r): r is string => !!r));
}

// ── 3c. Гарсан нэхэмжлэхээс (eBarimt борлуулалт) авлага/орлого үүсгэх ────────
export async function createReceivableFromVat(input: {
  partnerId: number;
  vatIds: number[];
  drCode: string; // авлагын данс (default 130100)
  revCode: string; // орлогын данс (default 610100)
  splitVat: boolean; // НӨАТ-ыг тусад нь өглөгт бичих
  vatAccCode: string; // НӨАТ-ын өглөгийн данс (default 330100)
  description?: string; // гүйлгээний утга (хоосон бол автомат)
}): Promise<ActionResult> {
  const supabase = await requireAuth();
  const dr = (input.drCode || "130100").trim();
  const rev = (input.revCode || "610100").trim();
  const vatAcc = (input.vatAccCode || "330100").trim();
  const desc = (input.description || "").trim();
  if (!input.vatIds.length) return { ok: false, error: "Баримт сонгоно уу." };

  const ids = await codeToId(supabase, [dr, rev, vatAcc]);
  const drId = ids.get(dr);
  const revId = ids.get(rev);
  const vatCrId = ids.get(vatAcc);
  if (!drId) return { ok: false, error: `Данс ${dr} олдсонгүй.` };
  if (!revId) return { ok: false, error: `Данс ${rev} олдсонгүй.` };

  const { data: vats } = await supabase
    .from("vat_records")
    .select("id, date, partner_name, ddtd, amount, vat_amount")
    .in("id", input.vatIds);
  const rows = (vats as
    | { id: number; date: string; partner_name: string | null; ddtd: string | null; amount: number; vat_amount: number }[]
    | null) ?? [];

  // Давхар бичилтээс хамгаалалт: тухайн ДДТД-ээр журнал аль хэдийн байвал алгасна.
  const journaled = await journaledDdtds(supabase, rows);

  let created = 0;
  let skipped = 0;
  for (const v of rows) {
    if (v.ddtd && journaled.has(v.ddtd)) { skipped++; continue; }
    const net = Number(v.amount) || 0;
    const vat = Number(v.vat_amount) || 0;
    const total = net + vat;
    if (total <= 0) continue;

    // Дт Авлага (нийт) / Кт Орлого (НӨАТ-гүй) / Кт НӨАТ-ын өглөг (НӨАТ).
    const lines: LineInput[] = [
      { account_id: drId, debit: total, credit: 0, description: "Авлага" },
    ];
    if (input.splitVat && vat > 0 && vatCrId) {
      lines.push({ account_id: revId, debit: 0, credit: net, description: "Борлуулалтын орлого" });
      lines.push({ account_id: vatCrId, debit: 0, credit: vat, description: "Төлбөл зохих НӨАТ" });
    } else {
      lines.push({ account_id: revId, debit: 0, credit: total, description: "Борлуулалтын орлого" });
    }

    const res = await postJournal(supabase, {
      date: v.date,
      description:
        desc || `Борлуулалт — ${v.partner_name ?? ""}${v.ddtd ? ` (${v.ddtd})` : ""}`,
      reference: v.ddtd,
      partner_id: input.partnerId,
      source: "receivable",
      lines,
    });
    if (res.ok) created++;
  }

  revalidatePath(`/partners/${input.partnerId}`);
  if (created === 0)
    return {
      ok: false,
      error: skipped > 0 ? `Бүгд өмнө нь журналлагдсан (${skipped} алгассан).` : "Журнал үүсгэгдсэнгүй.",
    };
  return {
    ok: true,
    message: `${created} борлуулалт авлага/орлого болж бүртгэгдлээ.${skipped ? ` (${skipped} өмнө нь бичигдсэн — алгассан)` : ""}`,
  };
}

// ── 3d. Холбогдоогүй eBarimt-ыг сонгосон харилцагчид холбоод журнал үүсгэх ───
// Холбогдоогүй баримтыг (partner_id null) сонгосон харилцагчид оноож, дараа нь
// зардал/өглөг (in) эсвэл авлага/орлого (out) журнал үүсгэнэ. Данс хоосон бол
// зөвхөн холбоно (журнал үүсгэхгүй).
export async function processUnmatchedVat(input: {
  partnerId: number;
  vatIds: number[];
  kind: "in" | "out";
  dtCode: string; // in: зардлын данс | out: авлагын данс
  ktCode: string; // in: өглөгийн данс | out: орлогын данс
  splitVat: boolean;
  vatAccCode: string;
  description?: string;
}): Promise<ActionResult> {
  const supabase = await requireAuth();
  if (!input.vatIds.length) return { ok: false, error: "Баримт сонгоно уу." };
  if (!input.partnerId) return { ok: false, error: "Харилцагч сонгоно уу." };

  // 1) Сонгосон харилцагчид холбоно.
  const { error: le } = await supabase
    .from("vat_records")
    .update({ partner_id: input.partnerId })
    .in("id", input.vatIds);
  if (le) return { ok: false, error: `Холбоход алдаа: ${le.message}` };

  // 2) Данс өгсөн бол журнал үүсгэнэ.
  const hasAccounts = input.dtCode.trim() && input.ktCode.trim();
  if (!hasAccounts) {
    revalidatePath(`/partners/${input.partnerId}`);
    return { ok: true, message: `${input.vatIds.length} баримт холбогдлоо (журнал үүсгээгүй).` };
  }

  if (input.kind === "in") {
    return createPayableFromVat({
      partnerId: input.partnerId,
      vatIds: input.vatIds,
      dtCode: input.dtCode,
      ktCode: input.ktCode,
      splitVat: input.splitVat,
      vatAccCode: input.vatAccCode,
      description: input.description,
    });
  }
  return createReceivableFromVat({
    partnerId: input.partnerId,
    vatIds: input.vatIds,
    drCode: input.dtCode,
    revCode: input.ktCode,
    splitVat: input.splitVat,
    vatAccCode: input.vatAccCode,
    description: input.description,
  });
}

// ── 3b. Банкны зарлагыг зардалд бичих (журнал авто) ────────────────────────
export async function recordBankExpense(input: {
  partnerId: number;
  txnIds: number[];
  dtCode: string; // зардлын данс
  ktCode: string; // Кт данс (банк/өглөг)
  hasVat: boolean; // нийт дүнд НӨАТ багтсан (1/11)
  vatAccCode: string; // НӨАТ-ын данс
}): Promise<ActionResult> {
  const supabase = await requireAuth();
  const dt = input.dtCode.trim();
  const kt = (input.ktCode || "3310").trim();
  if (!dt) return { ok: false, error: "Зардлын данс (Дт) оруулна уу." };
  if (!input.txnIds.length) return { ok: false, error: "Гүйлгээ сонгоно уу." };

  const ids = await codeToId(supabase, [dt, kt, "130600"]);
  const dtId = ids.get(dt);
  const ktId = ids.get(kt);
  const vatDrId = ids.get("130600");
  if (!dtId) return { ok: false, error: `Данс ${dt} олдсонгүй.` };
  if (!ktId) return { ok: false, error: `Данс ${kt} олдсонгүй.` };

  const { data: txns } = await supabase
    .from("transactions")
    .select("id, txn_date, description, expense")
    .in("id", input.txnIds);
  const rows = (txns as
    | { id: number; txn_date: string; description: string | null; expense: number | null }[]
    | null) ?? [];

  let done = 0;
  for (const t of rows) {
    const total = Number(t.expense) || 0;
    if (total <= 0) continue;

    // Гүйлгээний ангиллыг (Дт/Кт) шинэчилнэ.
    await supabase
      .from("transactions")
      .update({ debit_code: dt, credit_code: kt })
      .eq("id", t.id);

    const date = (t.txn_date || "").slice(0, 10);
    let lines: LineInput[];
    if (input.hasVat && vatDrId) {
      const vat = Math.round(total / 11);
      const net = total - vat;
      // Оруулсан НӨАТ: Дт 130600 / Кт төлбөрийн (Кт) данс. НӨАТ-ыг мөн Кт данс руу
      // нэгтгэснээр банк/өглөг нийт дүнгээр (net+vat) хаагдана. 330100 руу орохгүй.
      lines = [
        { account_id: dtId, debit: net, credit: 0, description: t.description ?? "" },
        { account_id: ktId, debit: 0, credit: net, description: "" },
        { account_id: vatDrId, debit: vat, credit: 0, description: "Оруулсан НӨАТ" },
        { account_id: ktId, debit: 0, credit: vat, description: "НӨАТ" },
      ];
    } else {
      lines = [
        { account_id: dtId, debit: total, credit: 0, description: t.description ?? "" },
        { account_id: ktId, debit: 0, credit: total, description: "" },
      ];
    }

    const res = await postJournal(supabase, {
      date,
      description: t.description || "Банкны зарлага — зардал",
      reference: null,
      partner_id: input.partnerId,
      source: "expense",
      lines,
    });
    if (res.ok) done++;
  }

  revalidatePath(`/partners/${input.partnerId}`);
  if (done === 0) return { ok: false, error: "Журнал үүсгэгдсэнгүй." };
  return { ok: true, message: `${done} гүйлгээ зардалд бичигдлээ.` };
}
