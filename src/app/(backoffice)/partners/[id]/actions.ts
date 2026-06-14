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

// Холбогдоогүй ирсэн eBarimt (partner_id null, type='in').
export async function listUnmatchedVat(): Promise<
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
  const { data } = await supabase
    .from("vat_records")
    .select("id, date, partner_name, ddtd, amount, vat_amount, total_amount")
    .is("partner_id", null)
    .eq("type", "in")
    .order("date", { ascending: false })
    .limit(500);
  return (data as never) ?? [];
}

// ── 3a. Ирсэн нэхэмжлэхээс (eBarimt худалдан авалт) өглөг үүсгэх ────────────
export async function createPayableFromVat(input: {
  partnerId: number;
  vatIds: number[];
  dtCode: string; // зардлын данс (7xxx)
  ktCode: string; // өглөгийн данс (default 3310)
  splitVat: boolean; // НӨАТ-ыг тусдаа өглөгт холбох
  vatAccCode: string; // НӨАТ-ын өглөгийн данс (3152)
}): Promise<ActionResult> {
  const supabase = await requireAuth();
  const dt = input.dtCode.trim();
  const kt = (input.ktCode || "3310").trim();
  const vatAcc = (input.vatAccCode || "3152").trim();
  if (!dt) return { ok: false, error: "Зардлын данс (Дт) оруулна уу." };
  if (!input.vatIds.length) return { ok: false, error: "Баримт сонгоно уу." };

  const ids = await codeToId(supabase, [dt, kt, vatAcc, "1352"]);
  const dtId = ids.get(dt);
  const ktId = ids.get(kt);
  const vatDrId = ids.get("1352");
  const vatCrId = input.splitVat ? ids.get(vatAcc) : ktId;
  if (!dtId) return { ok: false, error: `Данс ${dt} олдсонгүй.` };
  if (!ktId) return { ok: false, error: `Данс ${kt} олдсонгүй.` };

  const { data: vats } = await supabase
    .from("vat_records")
    .select("id, date, partner_name, ddtd, amount, vat_amount")
    .in("id", input.vatIds);
  const rows = (vats as
    | { id: number; date: string; partner_name: string | null; ddtd: string | null; amount: number; vat_amount: number }[]
    | null) ?? [];

  let created = 0;
  for (const v of rows) {
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
      description: `Ирсэн нэхэмжлэл — ${v.partner_name ?? ""}${v.ddtd ? ` (${v.ddtd})` : ""}`,
      reference: v.ddtd,
      partner_id: input.partnerId,
      source: "payable",
      lines,
    });
    if (res.ok) created++;
  }

  revalidatePath(`/partners/${input.partnerId}`);
  if (created === 0) return { ok: false, error: "Журнал үүсгэгдсэнгүй." };
  return { ok: true, message: `${created} ирсэн нэхэмжлэл өглөг болж бүртгэгдлээ.` };
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
  const vatAcc = (input.vatAccCode || "3152").trim();
  if (!dt) return { ok: false, error: "Зардлын данс (Дт) оруулна уу." };
  if (!input.txnIds.length) return { ok: false, error: "Гүйлгээ сонгоно уу." };

  const ids = await codeToId(supabase, [dt, kt, vatAcc, "1352"]);
  const dtId = ids.get(dt);
  const ktId = ids.get(kt);
  const vatDrId = ids.get("1352");
  const vatCrId = ids.get(vatAcc);
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
      const crId = vatCrId ?? ktId;
      lines = [
        { account_id: dtId, debit: net, credit: 0, description: t.description ?? "" },
        { account_id: ktId, debit: 0, credit: net, description: "" },
        { account_id: vatDrId, debit: vat, credit: 0, description: "Оруулсан НӨАТ" },
        { account_id: crId, debit: 0, credit: vat, description: "НӨАТ" },
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
