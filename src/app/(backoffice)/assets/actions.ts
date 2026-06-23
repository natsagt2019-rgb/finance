"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { computeAsset, resolveUsefulLife } from "@/lib/asset-calc";
import { buildDisposalJournal, type DisposalType } from "@/lib/asset-disposal";
import { VAT_RATE, loadCompany } from "@/lib/company";
import { postJournal } from "@/lib/post-journal";

type Supa = Awaited<ReturnType<typeof createClient>>;

// Сарын сүүлийн өдөр (элэгдлийн журналын огноо).
function monthEndDate(year: number, month: number): string {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

// ── Элэгдлийг GL журналд бичих: Дт элэгдлийн зардал / Кт хуримтлагдсан элэгдэл ──
// Идемпотент: тухайн сарын өмнөх asset_depr журналыг устгаад дахин бичнэ.
// Ангилалд expense_account_code эсвэл accum_account_code тохируулаагүй хөрөнгийг
// алгасна (журналд орохгүй ч снапшот хадгалагдсан хэвээр).
async function postDepreciationJournal(
  supabase: Supa,
  year: number,
  month: number,
  assetIds: number[],
  amountByAsset: Map<number, number>,
): Promise<{ posted: boolean; error?: string }> {
  if (assetIds.length === 0) return { posted: false };

  // Хөрөнгө → ангилал → данс.
  const { data: assets } = await supabase
    .from("assets")
    .select("id, category_id")
    .in("id", assetIds);
  const catIdByAsset = new Map<number, number | null>();
  for (const a of (assets as { id: number; category_id: number | null }[] | null) ?? [])
    catIdByAsset.set(a.id, a.category_id);

  const catIds = [
    ...new Set([...catIdByAsset.values()].filter((x): x is number => x != null)),
  ];
  if (catIds.length === 0) return { posted: false };

  const { data: cats } = await supabase
    .from("asset_categories")
    .select("id, expense_account_code, accum_account_code")
    .in("id", catIds);
  const catById = new Map<
    number,
    { exp: string | null; acc: string | null }
  >();
  for (const c of (cats as
    | { id: number; expense_account_code: string | null; accum_account_code: string | null }[]
    | null) ?? [])
    catById.set(c.id, { exp: c.expense_account_code, acc: c.accum_account_code });

  // (Дт зардал, Кт хуримтлагдсан) хосоор дүнг нэгтгэх.
  const pairs = new Map<string, { exp: string; acc: string; amt: number }>();
  for (const assetId of assetIds) {
    const amt = Math.round((amountByAsset.get(assetId) ?? 0) * 100) / 100;
    if (amt <= 0) continue;
    const catId = catIdByAsset.get(assetId);
    const cat = catId != null ? catById.get(catId) : null;
    if (!cat?.exp || !cat?.acc) continue; // данс тохируулаагүй → алгасна
    const key = `${cat.exp}|${cat.acc}`;
    const p = pairs.get(key) ?? { exp: cat.exp, acc: cat.acc, amt: 0 };
    p.amt += amt;
    pairs.set(key, p);
  }
  if (pairs.size === 0) return { posted: false };

  // Дансны код → id.
  const codes = [
    ...new Set([...pairs.values()].flatMap((p) => [p.exp, p.acc])),
  ];
  const { data: accs } = await supabase
    .from("accounts")
    .select("id, code")
    .in("code", codes);
  const idByCode = new Map<string, number>();
  for (const a of (accs as { id: number; code: string }[] | null) ?? [])
    idByCode.set(a.code, a.id);

  const lines: { account_id: number; debit: number; credit: number; description: string }[] = [];
  for (const p of pairs.values()) {
    const expId = idByCode.get(p.exp);
    const accId = idByCode.get(p.acc);
    if (expId == null || accId == null) {
      return {
        posted: false,
        error: `Дансны код олдсонгүй: ${expId == null ? p.exp : p.acc}. accounts хүснэгтэд нэмнэ үү.`,
      };
    }
    lines.push({ account_id: expId, debit: p.amt, credit: 0, description: "Сарын элэгдэл" });
    lines.push({ account_id: accId, debit: 0, credit: p.amt, description: "Сарын элэгдэл" });
  }

  // Идемпотент: тухайн сарын өмнөх элэгдлийн журналыг устгана.
  const date = monthEndDate(year, month);
  const { data: oldJ } = await supabase
    .from("journals")
    .select("id")
    .eq("source", "asset_depr")
    .eq("date", date);
  const oldIds = (oldJ as { id: number }[] | null)?.map((j) => j.id) ?? [];
  if (oldIds.length > 0) {
    await supabase.from("journal_entries").delete().in("journal_id", oldIds);
    await supabase.from("journal_lines").delete().in("journal_id", oldIds);
    await supabase.from("journals").delete().in("id", oldIds);
  }

  const res = await postJournal(supabase, {
    date,
    description: `Сарын элэгдэл ${year}-${String(month).padStart(2, "0")}`,
    reference: null,
    partner_id: null,
    source: "asset_depr",
    lines,
  });
  if (!res.ok) return { posted: false, error: res.error };
  return { posted: true };
}

export type ActionResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

// Бүх action нэвтэрсэн хэрэглэгч шаардана.
async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return { supabase, user };
}

function num(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// ── Хөрөнгө: нэмэх / засах / устгах ─────────────────────────────────────────
function readAsset(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const statusRaw = get("status");
  const categoryId = num(formData.get("category_id"));
  const locationId = num(formData.get("location_id"));
  const life = num(formData.get("useful_life_years"));
  return {
    name: get("name"),
    code: get("code") || null,
    category_id: categoryId > 0 ? categoryId : null,
    company: get("company") || null,
    acquired_date: get("acquired_date") || null,
    cost: num(formData.get("cost")),
    salvage_value: num(formData.get("salvage_value")),
    useful_life_years: life > 0 ? life : null,
    location: get("location") || null,
    location_id: locationId > 0 ? locationId : null,
    barcode: get("barcode") || null,
    responsible: get("responsible") || null,
    opening_date: get("opening_date") || null,
    opening_accum_depreciation: num(formData.get("opening_accum_depreciation")),
    status: statusRaw === "disposed" ? "disposed" : "active",
    disposed_date: get("disposed_date") || null,
    disposal_note: get("disposal_note") || null,
  };
}

export async function createAsset(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readAsset(formData);
  if (!v.name) return { ok: false, error: "Хөрөнгийн нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("assets")
    .insert(v)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: data.id as number };
}

export async function updateAsset(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readAsset(formData);
  if (!v.name) return { ok: false, error: "Хөрөнгийн нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("assets")
    .update(v)
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: data.id as number };
}

export async function deleteAsset(id: number): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("assets")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: data.id as number };
}

// ── Элэгдэл тооцоо: тухайн сарын мөрүүдийг бодож хадгалах ────────────────────
// depreciation-tab-аас ирэх нэг мөрийн оролт (хөрөнгийн id хангалттай).
export type DepreciationInputRow = {
  asset_id: number;
  asset_name: string;
  category_name: string | null;
  company: string | null;
  cost: number;
  salvage_value: number;
  useful_life_years: number;
  acquired_date: string | null;
  opening_date: string | null;
  opening_accum_depreciation: number;
};

export async function saveDepreciation(
  year: number,
  month: number,
  rows: DepreciationInputRow[],
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  if (month < 1 || month > 12) return { ok: false, error: "Сар буруу." };

  const records = rows.map((r) => {
    const c = computeAsset(
      {
        cost: r.cost,
        salvageValue: r.salvage_value,
        usefulLifeYears: r.useful_life_years,
        acquiredDate: r.acquired_date,
        openingDate: r.opening_date,
        openingAccumDepreciation: r.opening_accum_depreciation,
      },
      year,
      month,
    );
    return {
      asset_id: r.asset_id,
      year,
      month,
      asset_name: r.asset_name,
      category_name: r.category_name,
      company: r.company,
      cost: r.cost,
      monthly_depreciation: c.monthlyDepreciation,
      accumulated_depreciation: c.accumulatedDepreciation,
      net_book_value: c.netBookValue,
      is_active: true,
    };
  });

  if (records.length === 0) return { ok: false, error: "Хадгалах мөр алга." };

  const { error } = await supabase
    .from("asset_depreciation")
    .upsert(records, { onConflict: "asset_id,year,month" });

  if (error) return { ok: false, error: error.message };

  // ── GL журнал: Дт элэгдлийн зардал / Кт хуримтлагдсан элэгдэл ──
  const amountByAsset = new Map<number, number>();
  for (const r of records)
    amountByAsset.set(r.asset_id, r.monthly_depreciation);
  const jr = await postDepreciationJournal(
    supabase,
    year,
    month,
    rows.map((r) => r.asset_id),
    amountByAsset,
  );
  if (jr.error) return { ok: false, error: `Журнал: ${jr.error}` };

  revalidatePath("/assets");
  revalidatePath("/reports/trial-balance");
  return { ok: true, id: records.length };
}

// ── Хасалт / Борлуулалт ─────────────────────────────────────────────────────
// Стандарт чартын тогтмол данс (категориос хамаарахгүй):
const ACC_GAIN = "620500"; // ҮХ борлуулсны олз
const ACC_LOSS = "820100"; // ҮХ хассаны гарз
const ACC_VAT = "330100"; // НӨАТ-ын өглөг

// Журналыг бүрэн устгах (entries + lines + journal).
async function deleteJournalFull(supabase: Supa, journalId: number): Promise<void> {
  await supabase.from("journal_entries").delete().eq("journal_id", journalId);
  await supabase.from("journal_lines").delete().eq("journal_id", journalId);
  await supabase.from("journals").delete().eq("id", journalId);
}

// Хасах огнооноос (он, сар) гаргах.
function ymOf(date: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})/.exec(date);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

// Хөрөнгийг хасах / борлуулах: GL журнал бичээд төлвийг disposed болгоно.
// Идемпотент: дахин дуудвал өмнөх журналыг устгаад шинээр бичнэ.
export async function disposeAsset(
  assetId: number,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const type = (get("disposal_type") === "sale" ? "sale" : "writeoff") as DisposalType;
  const disposedDate = get("disposed_date");
  if (!disposedDate) return { ok: false, error: "Хасах огноо заавал шаардлагатай." };
  const ym = ymOf(disposedDate);
  if (!ym) return { ok: false, error: "Хасах огноо буруу форматтай." };
  const note = get("disposal_note") || null;
  const settlement = get("settlement_code") || "110200";
  const partnerRaw = get("partner_id");
  const partnerId = partnerRaw ? Number(partnerRaw) : null;
  const noVat = get("no_vat") === "1";
  const proceedsInput = num(formData.get("proceeds"));

  // Хөрөнгө + ангилал.
  const { data: aRaw, error: ae } = await supabase
    .from("assets")
    .select(
      "id, cost, salvage_value, useful_life_years, acquired_date, opening_date, " +
        "opening_accum_depreciation, category_id, disposal_journal_id",
    )
    .eq("id", assetId)
    .single();
  if (ae || !aRaw) return { ok: false, error: ae?.message ?? "Хөрөнгө олдсонгүй." };
  const aData = aRaw as unknown as {
    id: number;
    cost: number;
    salvage_value: number;
    useful_life_years: number | null;
    acquired_date: string | null;
    opening_date: string | null;
    opening_accum_depreciation: number;
    category_id: number | null;
    disposal_journal_id: number | null;
  };

  const catRes = aData.category_id
    ? await supabase
        .from("asset_categories")
        .select("account_code, accum_account_code, useful_life_years")
        .eq("id", aData.category_id)
        .single()
    : { data: null };
  const cat = catRes.data as unknown as {
    account_code: string | null;
    accum_account_code: string | null;
    useful_life_years: number | null;
  } | null;

  const assetAcc = cat?.account_code ?? null;
  const accumAcc = cat?.accum_account_code ?? null;
  if (!assetAcc || !accumAcc)
    return {
      ok: false,
      error:
        "Ангилалд хөрөнгийн данс ба хуримтлагдсан элэгдлийн данс тохируулна уу (Тохиргоо таб).",
    };

  // Хасах огнооны сар хүртэлх хуримтлагдсан элэгдэл (asset-calc.ts).
  const life = resolveUsefulLife(
    aData.useful_life_years as number | null,
    cat?.useful_life_years as number | null,
  );
  const calc = computeAsset(
    {
      cost: Number(aData.cost) || 0,
      salvageValue: Number(aData.salvage_value) || 0,
      usefulLifeYears: life,
      acquiredDate: aData.acquired_date as string | null,
      openingDate: aData.opening_date as string | null,
      openingAccumDepreciation: Number(aData.opening_accum_depreciation) || 0,
    },
    ym.year,
    ym.month,
  );

  // НӨАТ: борлуулалт ба компани НӨАТ төлөгч бол 10% (no_vat сонголтоор алгасна).
  const company = await loadCompany();
  const vat =
    type === "sale" && !noVat && company.isVatPayer
      ? Math.round(proceedsInput * VAT_RATE * 100) / 100
      : 0;

  const built = buildDisposalJournal({
    type,
    cost: Number(aData.cost) || 0,
    accumulated: calc.accumulatedDepreciation,
    proceeds: type === "sale" ? proceedsInput : 0,
    vat,
    accounts: {
      asset: assetAcc,
      accum: accumAcc,
      gain: ACC_GAIN,
      loss: ACC_LOSS,
      vatPayable: ACC_VAT,
      settlement,
    },
  });
  if (!built.ok) return { ok: false, error: built.error };

  // Дансны код → id.
  const codes = [...new Set(built.lines.map((l) => l.code))];
  const { data: accs } = await supabase.from("accounts").select("id, code").in("code", codes);
  const idByCode = new Map<string, number>();
  for (const a of (accs as { id: number; code: string }[] | null) ?? [])
    idByCode.set(a.code, a.id);
  const lines = built.lines.map((l) => ({
    account_id: idByCode.get(l.code),
    debit: l.debit,
    credit: l.credit,
    description: l.description,
  }));
  const missing = lines.find((l) => l.account_id == null);
  if (missing) {
    const code = built.lines.find((l) => idByCode.get(l.code) == null)?.code;
    return { ok: false, error: `Дансны код олдсонгүй: ${code}. accounts хүснэгтэд нэмнэ үү.` };
  }

  // Идемпотент: өмнөх хасалтын журналыг устгана.
  const prevJid = aData.disposal_journal_id as number | null;
  if (prevJid) await deleteJournalFull(supabase, prevJid);

  const typeLabel = type === "sale" ? "борлуулалт" : "хасалт";
  const res = await postJournal(supabase, {
    date: disposedDate,
    description: `Үндсэн хөрөнгө ${typeLabel}${note ? ` — ${note}` : ""}`,
    reference: `DISP-${assetId}`,
    partner_id: partnerId,
    source: "asset_disposal",
    lines: lines as { account_id: number; debit: number; credit: number; description: string }[],
  });
  if (!res.ok) return { ok: false, error: `Журнал: ${res.error}` };

  // Хөрөнгийн төлвийг шинэчилнэ.
  const { error: ue } = await supabase
    .from("assets")
    .update({
      status: "disposed",
      disposed_date: disposedDate,
      disposal_note: note,
      disposal_type: type,
      disposal_proceeds: type === "sale" ? proceedsInput : 0,
      disposal_vat: vat,
      disposal_journal_id: res.id,
    })
    .eq("id", assetId);
  if (ue) return { ok: false, error: ue.message };

  revalidatePath("/assets");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/reports/trial-balance");
  return { ok: true, id: res.id };
}

// Хасалт/борлуулалтыг буцаах: журналыг устгаж, хөрөнгийг идэвхжүүлнэ.
export async function reverseDisposal(assetId: number): Promise<ActionResult> {
  const { supabase } = await requireAuth();

  const { data: aData, error: ae } = await supabase
    .from("assets")
    .select("id, disposal_journal_id")
    .eq("id", assetId)
    .single();
  if (ae || !aData) return { ok: false, error: ae?.message ?? "Хөрөнгө олдсонгүй." };

  const jid = aData.disposal_journal_id as number | null;
  if (jid) await deleteJournalFull(supabase, jid);

  const { error: ue } = await supabase
    .from("assets")
    .update({
      status: "active",
      disposed_date: null,
      disposal_type: null,
      disposal_proceeds: 0,
      disposal_vat: 0,
      disposal_journal_id: null,
    })
    .eq("id", assetId);
  if (ue) return { ok: false, error: ue.message };

  revalidatePath("/assets");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/reports/trial-balance");
  return { ok: true, id: assetId };
}

// ── Ангилал: нэмэх / засах / устгах ─────────────────────────────────────────
function readCategory(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const life = num(formData.get("useful_life_years"));
  return {
    code: get("code") || null,
    name: get("name"),
    useful_life_years: life > 0 ? life : 10,
    account_code: get("account_code") || null,
    accum_account_code: get("accum_account_code") || null,
    expense_account_code: get("expense_account_code") || null,
  };
}

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readCategory(formData);
  if (!v.name) return { ok: false, error: "Ангиллын нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("asset_categories")
    .insert(v)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: data.id as number };
}

export async function updateCategory(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readCategory(formData);
  if (!v.name) return { ok: false, error: "Ангиллын нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("asset_categories")
    .update(v)
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: data.id as number };
}

export async function deleteCategory(id: number): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("asset_categories")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: data.id as number };
}

// ── Байршил: нэмэх / засах / устгах ─────────────────────────────────────────
function readLocation(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  return { code: get("code") || null, name: get("name") };
}

export async function createLocation(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readLocation(formData);
  if (!v.name) return { ok: false, error: "Байршлын нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("asset_locations")
    .insert(v)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: data.id as number };
}

export async function updateLocation(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readLocation(formData);
  if (!v.name) return { ok: false, error: "Байршлын нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("asset_locations")
    .update(v)
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: data.id as number };
}

export async function deleteLocation(id: number): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("asset_locations")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/assets");
  return { ok: true, id: data.id as number };
}
