"use server";

import { revalidatePath } from "next/cache";
import * as xlsx from "xlsx";

import { createClient } from "@/lib/supabase/server";
import { computeAsset, resolveUsefulLife, revisionInput } from "@/lib/asset-calc";
import { buildDisposalJournal, type DisposalType } from "@/lib/asset-disposal";
import { buildAcquisitionJournal } from "@/lib/asset-acquisition";
import { buildRevaluationJournal } from "@/lib/asset-revision";
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
    // journal_lines ба journal_entries хоёул journals-аас CASCADE устана.
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

// ── Excel импорт: хөрөнгийг бөөнөөр оруулах ─────────────────────────────────
// Загварын дагуу. Ангиллыг нэрээр, байршлыг нэрээр тааруулна. Ижил нэртэй
// идэвхтэй хөрөнгө байвал алгасна (давхардлаас сэргийлж).
function importToISO(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const m = String(v).trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null;
}

export type ImportResult =
  | { ok: true; inserted: number; skipped: number }
  | { ok: false; error: string };

export async function importAssets(formData: FormData): Promise<ImportResult> {
  const { supabase } = await requireAuth();
  const file = formData.get("file");
  if (!file || typeof file === "string")
    return { ok: false, error: "Файл сонгоогүй байна." };

  let grid: unknown[][];
  try {
    const buf = Buffer.from(await (file as File).arrayBuffer());
    const wb = xlsx.read(buf, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    grid = xlsx.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  } catch (e) {
    return { ok: false, error: `Уншихад алдаа: ${(e as Error).message}` };
  }

  const headerRow = (grid[0] ?? []).map((c) => String(c ?? "").trim().toLowerCase());
  const find = (...keys: string[]) =>
    headerRow.findIndex((h) => keys.some((k) => h.includes(k)));
  const idx = {
    name: find("нэр"),
    code: find("карт", "код"),
    barcode: find("баар"),
    cat: find("ангилал"),
    company: find("компани"),
    acquired: find("орсон огноо", "огноо"),
    cost: find("анхны өртөг", "өртөг"),
    salvage: find("үлдэгдэл өртөг"),
    life: find("ашиглах", "хугацаа"),
    location: find("байршил"),
    resp: find("хариуцагч"),
  };
  if (idx.name < 0)
    return { ok: false, error: "«Нэр» багана олдсонгүй. Загварыг ашиглана уу." };

  const [{ data: catData }, { data: locData }, { data: existing }] = await Promise.all([
    supabase.from("asset_categories").select("id, name").eq("is_active", true).limit(2000),
    supabase.from("asset_locations").select("id, name").eq("is_active", true).limit(2000),
    supabase.from("assets").select("name").eq("is_active", true).limit(20000),
  ]);
  const catByName = new Map<string, number>();
  for (const c of (catData as { id: number; name: string }[] | null) ?? [])
    catByName.set(c.name.trim().toLowerCase(), c.id);
  const locByName = new Map<string, number>();
  for (const l of (locData as { id: number; name: string }[] | null) ?? [])
    locByName.set(l.name.trim().toLowerCase(), l.id);
  const existingNames = new Set(
    ((existing as { name: string }[] | null) ?? []).map((a) => a.name.trim().toLowerCase()),
  );

  const toInsert: Record<string, unknown>[] = [];
  let skipped = 0;
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i] ?? [];
    const name = String(row[idx.name] ?? "").trim();
    if (!name) continue;
    if (existingNames.has(name.toLowerCase())) { skipped++; continue; }
    existingNames.add(name.toLowerCase());
    const catName = idx.cat >= 0 ? String(row[idx.cat] ?? "").trim().toLowerCase() : "";
    const locName = idx.location >= 0 ? String(row[idx.location] ?? "").trim() : "";
    const locId = locByName.get(locName.toLowerCase()) ?? null;
    const life = idx.life >= 0 ? num(String(row[idx.life] ?? "")) : 0;
    toInsert.push({
      name,
      code: idx.code >= 0 ? String(row[idx.code] ?? "").trim() || null : null,
      barcode: idx.barcode >= 0 ? String(row[idx.barcode] ?? "").trim() || null : null,
      category_id: catByName.get(catName) ?? null,
      company: idx.company >= 0 ? String(row[idx.company] ?? "").trim() || null : null,
      acquired_date: idx.acquired >= 0 ? importToISO(row[idx.acquired]) : null,
      cost: idx.cost >= 0 ? num(String(row[idx.cost] ?? "")) : 0,
      salvage_value: idx.salvage >= 0 ? num(String(row[idx.salvage] ?? "")) : 0,
      useful_life_years: life > 0 ? life : null,
      location: locId ? null : locName || null,
      location_id: locId,
      responsible: idx.resp >= 0 ? String(row[idx.resp] ?? "").trim() || null : null,
      status: "active",
      is_active: true,
    });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("assets").insert(toInsert);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/assets");
  return { ok: true, inserted: toInsert.length, skipped };
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
  revision_date?: string | null;
  revision_cost?: number | null;
  revision_accum?: number | null;
  revision_life_months?: number | null;
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
        ...revisionInput(r),
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

// Тухайн сарын элэгдлийг устгах: снапшот (asset_depreciation) + GL журналыг цуцлана.
export async function deleteDepreciation(
  year: number,
  month: number,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  if (month < 1 || month > 12) return { ok: false, error: "Сар буруу." };

  // 1) Снапшотуудыг устгах.
  const { data: delSnaps } = await supabase
    .from("asset_depreciation")
    .delete()
    .eq("year", year)
    .eq("month", month)
    .select("id");
  const removed = (delSnaps as { id: number }[] | null)?.length ?? 0;

  // 2) Тухайн сарын элэгдлийн GL журналыг устгах.
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

  revalidatePath("/assets");
  revalidatePath("/reports/trial-balance");
  return { ok: true, id: removed };
}

// ── Хасалт / Борлуулалт ─────────────────────────────────────────────────────
// Стандарт чартын тогтмол данс (категориос хамаарахгүй):
const ACC_GAIN = "620500"; // ҮХ борлуулсны олз
const ACC_LOSS = "820100"; // ҮХ хассаны гарз
const ACC_VAT = "330100"; // НӨАТ-ын өглөг

// Журналыг бүрэн устгах — journal_lines ба journal_entries CASCADE-аар дагана.
async function deleteJournalFull(supabase: Supa, journalId: number): Promise<void> {
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
        "opening_accum_depreciation, category_id, disposal_journal_id, " +
        "revision_date, revision_cost, revision_accum, revision_life_months",
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
    revision_date: string | null;
    revision_cost: number | null;
    revision_accum: number | null;
    revision_life_months: number | null;
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
      ...revisionInput(aData),
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

// ── Худалдан авалт ──────────────────────────────────────────────────────────
const ACC_INPUT_VAT = "130600"; // НӨАТ-ын авлага (худалдан авалтын)

// Хөрөнгийн худалдан авалтыг GL журналд бичих. Идемпотент (дахин бичвэл өмнөхийг устгана).
export async function acquireAsset(
  assetId: number,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const settlement = get("settlement_code") || "310100";
  const partnerRaw = get("partner_id");
  const partnerId = partnerRaw ? Number(partnerRaw) : null;
  const noVat = get("no_vat") === "1";
  const note = get("note") || null;
  // НӨАТ данс: 130600 (шууд хасах) эсвэл 180500 (хойшлуулах — барилга/тоног).
  const vatAccount = get("vat_account") || ACC_INPUT_VAT;
  // Импорт: өртгийн доторх гаалийн татвар, хураамж + гаалийн тооцооны данс.
  const customs = Math.max(num(formData.get("customs")), 0);
  const customsSettlement = get("customs_settlement") || settlement;

  // Хөрөнгө + ангилал.
  const { data: aRaw, error: ae } = await supabase
    .from("assets")
    .select("id, cost, acquired_date, category_id, acquisition_journal_id")
    .eq("id", assetId)
    .single();
  if (ae || !aRaw) return { ok: false, error: ae?.message ?? "Хөрөнгө олдсонгүй." };
  const aData = aRaw as unknown as {
    id: number;
    cost: number;
    acquired_date: string | null;
    category_id: number | null;
    acquisition_journal_id: number | null;
  };

  const catRes = aData.category_id
    ? await supabase
        .from("asset_categories")
        .select("account_code")
        .eq("id", aData.category_id)
        .single()
    : { data: null };
  const assetAcc =
    (catRes.data as unknown as { account_code: string | null } | null)?.account_code ?? null;
  if (!assetAcc)
    return {
      ok: false,
      error: "Ангилалд хөрөнгийн данс тохируулна уу (Тохиргоо таб).",
    };

  const date = get("acquired_date") || aData.acquired_date;
  if (!date) return { ok: false, error: "Худалдан авсан огноо заавал шаардлагатай." };

  // НӨАТ: компани НӨАТ төлөгч бол 10% (no_vat сонголтоор алгасна).
  const company = await loadCompany();
  const cost = Number(aData.cost) || 0;
  const vat = !noVat && company.isVatPayer ? Math.round(cost * VAT_RATE * 100) / 100 : 0;

  const built = buildAcquisitionJournal({
    cost,
    vat,
    customs,
    accounts: { asset: assetAcc, inputVat: vatAccount, settlement, customsSettlement },
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
  if (lines.some((l) => l.account_id == null)) {
    const code = built.lines.find((l) => idByCode.get(l.code) == null)?.code;
    return { ok: false, error: `Дансны код олдсонгүй: ${code}. accounts хүснэгтэд нэмнэ үү.` };
  }

  // Идемпотент: өмнөх худалдан авалтын журналыг устгана.
  const prevJid = aData.acquisition_journal_id;
  if (prevJid) await deleteJournalFull(supabase, prevJid);

  const res = await postJournal(supabase, {
    date,
    description: `Үндсэн хөрөнгө худалдан авалт${note ? ` — ${note}` : ""}`,
    reference: `ACQ-${assetId}`,
    partner_id: partnerId,
    source: "asset_acquisition",
    lines: lines as { account_id: number; debit: number; credit: number; description: string }[],
  });
  if (!res.ok) return { ok: false, error: `Журнал: ${res.error}` };

  const { error: ue } = await supabase
    .from("assets")
    .update({ acquisition_vat: vat, acquisition_customs: customs, acquisition_journal_id: res.id })
    .eq("id", assetId);
  if (ue) return { ok: false, error: ue.message };

  revalidatePath("/assets");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/reports/trial-balance");
  return { ok: true, id: res.id };
}

// Худалдан авалтыг буцаах: журналыг устгана.
export async function reverseAcquisition(assetId: number): Promise<ActionResult> {
  const { supabase } = await requireAuth();

  const { data: aRaw, error: ae } = await supabase
    .from("assets")
    .select("id, acquisition_journal_id")
    .eq("id", assetId)
    .single();
  if (ae || !aRaw) return { ok: false, error: ae?.message ?? "Хөрөнгө олдсонгүй." };
  const jid = (aRaw as unknown as { acquisition_journal_id: number | null }).acquisition_journal_id;
  if (jid) await deleteJournalFull(supabase, jid);

  const { error: ue } = await supabase
    .from("assets")
    .update({ acquisition_vat: 0, acquisition_customs: 0, acquisition_journal_id: null })
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

// ── Хөдөлгөөн: эзэмшил шилжүүлэх / дотоод хөдөлгөөн ──────────────────────────
// Журналгүй — зөвхөн бүртгэл. Хөдөлгөөнийг asset_movements-д түүх болгон бичээд
// хөрөнгийн одоогийн хариуцагч/байршлыг шинэчилнэ.
export async function moveAsset(
  assetId: number,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const moveType = get("move_type") === "internal" ? "internal" : "custody";
  const movedDate = get("moved_date");
  if (!movedDate) return { ok: false, error: "Хөдөлгөөний огноо заавал шаардлагатай." };
  const note = get("note") || null;
  const toResponsibleRaw = get("to_responsible");
  const toLocRaw = num(formData.get("to_location_id"));
  const toLocationId = toLocRaw > 0 ? toLocRaw : null;

  // Хөрөнгийн одоогийн утга.
  const { data: aRaw, error: ae } = await supabase
    .from("assets")
    .select("id, responsible, location_id")
    .eq("id", assetId)
    .single();
  if (ae || !aRaw) return { ok: false, error: ae?.message ?? "Хөрөнгө олдсонгүй." };
  const cur = aRaw as unknown as {
    responsible: string | null;
    location_id: number | null;
  };

  // Шинэ утгууд (хоосон бол хэвээр).
  const toResponsible = toResponsibleRaw || cur.responsible;
  const newLocationId = toLocationId ?? cur.location_id;

  const noResponsibleChange = (toResponsible ?? null) === (cur.responsible ?? null);
  const noLocationChange = newLocationId === cur.location_id;
  if (noResponsibleChange && noLocationChange)
    return { ok: false, error: "Өөрчлөлт алга — хариуцагч эсвэл байршлыг солино уу." };

  // Хөдөлгөөний түүх.
  const { error: me } = await supabase.from("asset_movements").insert({
    asset_id: assetId,
    moved_date: movedDate,
    move_type: moveType,
    from_responsible: cur.responsible,
    to_responsible: toResponsible,
    from_location_id: cur.location_id,
    to_location_id: newLocationId,
    note,
  });
  if (me) return { ok: false, error: me.message };

  // Хөрөнгийн одоогийн хариуцагч/байршлыг шинэчилнэ.
  const { error: ue } = await supabase
    .from("assets")
    .update({ responsible: toResponsible, location_id: newLocationId })
    .eq("id", assetId);
  if (ue) return { ok: false, error: ue.message };

  revalidatePath("/assets");
  revalidatePath(`/assets/${assetId}`);
  return { ok: true, id: assetId };
}

// Олон хөрөнгийг нэг дор шилжүүлэх — бүгдэд нэг зорилтот хариуцагч/байршил.
export async function moveAssetsBulk(
  assetIds: number[],
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const ids = [...new Set(assetIds.filter((n) => Number.isFinite(n) && n > 0))];
  if (ids.length === 0) return { ok: false, error: "Хөрөнгө сонгоогүй байна." };

  const moveType = get("move_type") === "internal" ? "internal" : "custody";
  const movedDate = get("moved_date");
  if (!movedDate) return { ok: false, error: "Хөдөлгөөний огноо заавал шаардлагатай." };
  const note = get("note") || null;
  const toResponsible = get("to_responsible") || null;
  const toLocRaw = num(formData.get("to_location_id"));
  const toLocationId = toLocRaw > 0 ? toLocRaw : null;

  if (moveType === "custody" && !toResponsible)
    return { ok: false, error: "Шинэ эд хариуцагч оруулна уу." };
  if (moveType === "internal" && toLocationId == null)
    return { ok: false, error: "Шинэ байршил сонгоно уу." };

  // Сонгосон хөрөнгүүдийн одоогийн утга.
  const { data: rows, error: re } = await supabase
    .from("assets")
    .select("id, responsible, location_id")
    .in("id", ids);
  if (re) return { ok: false, error: re.message };
  const cur =
    (rows as { id: number; responsible: string | null; location_id: number | null }[] | null) ?? [];

  // Хөдөлгөөний түүх (мөр бүрт хуучин утгаар).
  const movements = cur.map((a) => ({
    asset_id: a.id,
    moved_date: movedDate,
    move_type: moveType,
    from_responsible: a.responsible,
    to_responsible: moveType === "custody" ? toResponsible : a.responsible,
    from_location_id: a.location_id,
    to_location_id: moveType === "internal" ? toLocationId : a.location_id,
    note,
  }));
  const { error: me } = await supabase.from("asset_movements").insert(movements);
  if (me) return { ok: false, error: me.message };

  // Зорилтот талбарыг бүгдэд нэг дор шинэчилнэ.
  const patch =
    moveType === "custody" ? { responsible: toResponsible } : { location_id: toLocationId };
  const { error: ue } = await supabase.from("assets").update(patch).in("id", ids);
  if (ue) return { ok: false, error: ue.message };

  revalidatePath("/assets");
  return { ok: true, id: ids.length };
}

// ── Revision: засвар / дахин үнэлгээ / ашиглах хугацаа өөрчлөх ───────────────
const ACC_SURPLUS = "520100"; // дахин үнэлгээний нөөц
const ACC_REVAL_LOSS = "820900"; // дахин үнэлгээний гарз (бууралт)

function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

// Хөрөнгийн элэгдлийн суурийг R огнооноос проспектив өөрчилнө. Идемпотент биш —
// аль хэдийн revision байгаа бол эхлээд буцаах шаардлагатай.
export async function applyRevision(
  assetId: number,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const kind = get("revision_kind");
  if (!["repair", "revaluation", "life"].includes(kind))
    return { ok: false, error: "Revision төрөл буруу." };
  const date = get("revision_date");
  const ym = ymOf(date);
  if (!ym) return { ok: false, error: "Хүчинтэй болох огноо буруу." };
  const lifeMonths = num(formData.get("life_months"));
  if (lifeMonths <= 0) return { ok: false, error: "Үлдэх хугацаа (сар) оруулна уу." };
  const note = get("note") || null;

  const { data: aRaw, error: ae } = await supabase
    .from("assets")
    .select(
      "id, cost, salvage_value, useful_life_years, acquired_date, opening_date, " +
        "opening_accum_depreciation, category_id, revision_date",
    )
    .eq("id", assetId)
    .single();
  if (ae || !aRaw) return { ok: false, error: ae?.message ?? "Хөрөнгө олдсонгүй." };
  const a = aRaw as unknown as {
    cost: number;
    salvage_value: number;
    useful_life_years: number | null;
    acquired_date: string | null;
    opening_date: string | null;
    opening_accum_depreciation: number;
    category_id: number | null;
    revision_date: string | null;
  };
  if (a.revision_date)
    return {
      ok: false,
      error: "Энэ хөрөнгөд аль хэдийн засвар/үнэлгээ бүртгэгдсэн. Эхлээд буцаана уу.",
    };

  const catRes = a.category_id
    ? await supabase
        .from("asset_categories")
        .select("account_code, accum_account_code, useful_life_years")
        .eq("id", a.category_id)
        .single()
    : { data: null };
  const cat = catRes.data as unknown as {
    account_code: string | null;
    accum_account_code: string | null;
    useful_life_years: number | null;
  } | null;

  // R-ийн ӨМНӨХ сар хүртэлх хуримтлагдсан элэгдэл (анхны хуваариар).
  const life = resolveUsefulLife(a.useful_life_years, cat?.useful_life_years);
  const pm = prevMonth(ym.year, ym.month);
  const cost = Number(a.cost) || 0;
  const accumBefore = computeAsset(
    {
      cost,
      salvageValue: Number(a.salvage_value) || 0,
      usefulLifeYears: life,
      acquiredDate: a.acquired_date,
      openingDate: a.opening_date,
      openingAccumDepreciation: Number(a.opening_accum_depreciation) || 0,
    },
    pm.year,
    pm.month,
  ).accumulatedDepreciation;

  let revCost: number;
  let revAccum: number;
  let journalLines:
    | { code: string; debit: number; credit: number; description: string }[]
    | null = null;

  if (kind === "life") {
    revCost = cost;
    revAccum = accumBefore;
  } else if (kind === "repair") {
    const repairNet = num(formData.get("repair_amount"));
    if (repairNet <= 0) return { ok: false, error: "Засварын дүн оруулна уу." };
    if (!cat?.account_code)
      return { ok: false, error: "Ангилалд хөрөнгийн данс тохируулна уу." };
    const settlement = get("settlement_code") || "310100";
    const noVat = get("no_vat") === "1";
    const company = await loadCompany();
    const vat = !noVat && company.isVatPayer ? Math.round(repairNet * VAT_RATE * 100) / 100 : 0;
    const built = buildAcquisitionJournal({
      cost: repairNet,
      vat,
      accounts: { asset: cat.account_code, inputVat: ACC_INPUT_VAT, settlement },
    });
    if (!built.ok) return { ok: false, error: built.error };
    journalLines = built.lines;
    revCost = cost + repairNet;
    revAccum = accumBefore;
  } else {
    // revaluation (elimination)
    const fairValue = num(formData.get("fair_value"));
    if (fairValue <= 0) return { ok: false, error: "Шинэ үнэ цэнэ оруулна уу." };
    if (!cat?.account_code || !cat?.accum_account_code)
      return { ok: false, error: "Ангилалд хөрөнгө/элэгдлийн данс тохируулна уу." };
    const built = buildRevaluationJournal({
      cost,
      accumulated: accumBefore,
      fairValue,
      accounts: {
        asset: cat.account_code,
        accum: cat.accum_account_code,
        surplus: ACC_SURPLUS,
        loss: ACC_REVAL_LOSS,
      },
    });
    if (!built.ok) return { ok: false, error: built.error };
    journalLines = built.lines;
    revCost = fairValue;
    revAccum = 0;
  }

  // Журнал бичих (засвар/дахин үнэлгээ).
  let journalId: number | null = null;
  if (journalLines) {
    const codes = [...new Set(journalLines.map((l) => l.code))];
    const { data: accs } = await supabase.from("accounts").select("id, code").in("code", codes);
    const idByCode = new Map<string, number>();
    for (const x of (accs as { id: number; code: string }[] | null) ?? [])
      idByCode.set(x.code, x.id);
    const lines = journalLines.map((l) => ({
      account_id: idByCode.get(l.code),
      debit: l.debit,
      credit: l.credit,
      description: l.description,
    }));
    if (lines.some((l) => l.account_id == null)) {
      const code = journalLines.find((l) => idByCode.get(l.code) == null)?.code;
      return { ok: false, error: `Дансны код олдсонгүй: ${code}.` };
    }
    const label = kind === "repair" ? "Үндсэн хөрөнгө засвар" : "Үндсэн хөрөнгө дахин үнэлгээ";
    const res = await postJournal(supabase, {
      date,
      description: `${label}${note ? ` — ${note}` : ""}`,
      reference: `REV-${assetId}`,
      partner_id: null,
      source: "asset_revision",
      lines: lines as { account_id: number; debit: number; credit: number; description: string }[],
    });
    if (!res.ok) return { ok: false, error: `Журнал: ${res.error}` };
    journalId = res.id;
  }

  const { error: ue } = await supabase
    .from("assets")
    .update({
      revision_kind: kind,
      revision_date: date,
      revision_cost: revCost,
      revision_accum: revAccum,
      revision_life_months: lifeMonths,
      revision_note: note,
      revision_journal_id: journalId,
    })
    .eq("id", assetId);
  if (ue) return { ok: false, error: ue.message };

  revalidatePath("/assets");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/reports/trial-balance");
  return { ok: true, id: assetId };
}

// Revision-ыг буцаах: журналыг устгаж, талбаруудыг цэвэрлэнэ (анхны хуваарь руу).
export async function reverseRevision(assetId: number): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const { data: aRaw, error: ae } = await supabase
    .from("assets")
    .select("id, revision_journal_id")
    .eq("id", assetId)
    .single();
  if (ae || !aRaw) return { ok: false, error: ae?.message ?? "Хөрөнгө олдсонгүй." };
  const jid = (aRaw as unknown as { revision_journal_id: number | null }).revision_journal_id;
  if (jid) await deleteJournalFull(supabase, jid);

  const { error: ue } = await supabase
    .from("assets")
    .update({
      revision_kind: null,
      revision_date: null,
      revision_cost: null,
      revision_accum: null,
      revision_life_months: null,
      revision_note: null,
      revision_journal_id: null,
    })
    .eq("id", assetId);
  if (ue) return { ok: false, error: ue.message };

  revalidatePath("/assets");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/reports/trial-balance");
  return { ok: true, id: assetId };
}
