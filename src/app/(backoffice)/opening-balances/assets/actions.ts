"use server";

import { revalidatePath } from "next/cache";
import * as xlsx from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { OPENING_SOURCES, openDateFor } from "../shared";
import type { SyncResult } from "../sync-button";

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Excel нүднээс огноог YYYY-MM-DD болгоно (Date | serial | текст).
function toISO(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime()))
    return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return null;
}

function num(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export type AssetImportResult =
  | { ok: true; inserted: number; skipped: number }
  | { ok: false; error: string };

// Excel (загварын дагуу) → assets хүснэгтэд бөөнөөр оруулна. Ангиллыг нэрээр
// тааруулна. Идэвхтэй ижил нэртэй хөрөнгө байвал алгасна (давхардлаас сэргийлж).
export async function importAssetsExcel(
  formData: FormData,
): Promise<AssetImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нэвтрэх шаардлагатай" };

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

  // Толгойн мөрөөс баганын индексийг олно.
  const idx: Record<string, number> = {};
  const headerRow = (grid[0] ?? []).map((c) => String(c ?? "").trim().toLowerCase());
  const find = (...keys: string[]) =>
    headerRow.findIndex((h) => keys.some((k) => h.includes(k)));
  idx.name = find("нэр");
  idx.cat = find("ангилал");
  idx.acquired = find("орсон огноо");
  idx.cost = find("анхны өртөг", "өртөг");
  idx.accum = find("элэгдэл");
  idx.openDate = find("эхний үлдэгдлийн огноо", "үлдэгдлийн огноо");
  idx.life = find("ашиглалт");
  idx.salvage = find("үлдэгдэл өртөг");
  idx.location = find("байршил");
  idx.resp = find("хариуцагч");
  if (idx.name < 0)
    return { ok: false, error: "«Нэр» багана олдсонгүй. Загварыг ашиглана уу." };

  // Ангилал нэр → id, идэвхтэй хөрөнгийн нэрс (давхардал шалгах).
  const [{ data: catData }, { data: existing }] = await Promise.all([
    supabase.from("asset_categories").select("id, name").eq("is_active", true).limit(2000),
    supabase.from("assets").select("name").eq("is_active", true).limit(10000),
  ]);
  const catByName = new Map<string, number>();
  for (const c of (catData as { id: number; name: string }[] | null) ?? [])
    catByName.set(c.name.trim().toLowerCase(), c.id);
  const existingNames = new Set(
    ((existing as { name: string }[] | null) ?? []).map((a) =>
      a.name.trim().toLowerCase(),
    ),
  );

  const toInsert: Record<string, unknown>[] = [];
  let skipped = 0;
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i] ?? [];
    const name = String(row[idx.name] ?? "").trim();
    if (!name) continue;
    if (existingNames.has(name.toLowerCase())) {
      skipped++;
      continue;
    }
    existingNames.add(name.toLowerCase());
    const catName = idx.cat >= 0 ? String(row[idx.cat] ?? "").trim().toLowerCase() : "";
    toInsert.push({
      name,
      category_id: catByName.get(catName) ?? null,
      acquired_date: idx.acquired >= 0 ? toISO(row[idx.acquired]) : null,
      cost: idx.cost >= 0 ? r2(num(row[idx.cost])) : 0,
      opening_accum_depreciation: idx.accum >= 0 ? r2(num(row[idx.accum])) : 0,
      opening_date: idx.openDate >= 0 ? toISO(row[idx.openDate]) : null,
      useful_life_years: idx.life >= 0 && row[idx.life] != null ? num(row[idx.life]) : null,
      salvage_value: idx.salvage >= 0 ? r2(num(row[idx.salvage])) : 0,
      location: idx.location >= 0 ? String(row[idx.location] ?? "").trim() || null : null,
      responsible: idx.resp >= 0 ? String(row[idx.resp] ?? "").trim() || null : null,
      status: "active",
      is_active: true,
    });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("assets").insert(toInsert);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/opening-balances/assets");
  revalidatePath("/assets");
  return { ok: true, inserted: toInsert.length, skipped };
}

// Үндсэн хөрөнгийн ангиллыг seed хийж, assets.category_id оноох.
export async function seedAssetCategories(): Promise<SyncResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Нэвтрэх шаардлагатай" };

  // Дансны кодууд СТАНДАРТ COA-тай нийцнэ: 160200 Барилга … 160800 Бусад ҮХ,
  // 160900 = Хуримтлагдсан элэгдэл (хасах, контр-актив). Бүх ангиллын
  // хуримтлагдсан элэгдэл 160900 руу.
  const cats = [
    { code: "ҮХ-1", name: "Барилга байгууламж",                            useful_life_years: 40, account_code: "160200", accum_account_code: "160900", expense_account_code: "720300" },
    { code: "ҮХ-2", name: "Машин, тоног төхөөрөмж",                        useful_life_years: 10, account_code: "160300", accum_account_code: "160900", expense_account_code: "720300" },
    { code: "ҮХ-3", name: "Тээврийн хэрэгсэл",                             useful_life_years: 10, account_code: "160400", accum_account_code: "160900", expense_account_code: "720300" },
    { code: "ҮХ-4", name: "Тавилга, эд хогшил",                            useful_life_years: 10, account_code: "160500", accum_account_code: "160900", expense_account_code: "720300" },
    { code: "ҮХ-5", name: "Компьютер, дагалдах хэрэгсэл, програм хангамж", useful_life_years: 3,  account_code: "160600", accum_account_code: "160900", expense_account_code: "720300" },
    { code: "ҮХ-6", name: "Бусад үндсэн хөрөнгө",                          useful_life_years: 10, account_code: "160800", accum_account_code: "160900", expense_account_code: "720300" },
  ];

  // Байгаа ангиллыг авах
  const { data: existing } = await supabase.from("asset_categories").select("code, id, account_code").limit(100);
  const existMap = new Map((existing ?? []).map((c: { code: string; id: number; account_code: string }) => [c.code, c]));

  for (const cat of cats) {
    if (!existMap.has(cat.code)) {
      await supabase.from("asset_categories").insert(cat);
    } else {
      // Дансны кодыг шинэчлэх (хуучин 2xxx байвал)
      const ex = existMap.get(cat.code)!;
      if (!ex.account_code?.startsWith("16")) {
        await supabase.from("asset_categories").update({
          account_code: cat.account_code,
          accum_account_code: cat.accum_account_code,
          expense_account_code: cat.expense_account_code,
        }).eq("code", cat.code);
      }
    }
  }

  // Шинэчилсэн ангиллыг дахин авах
  const { data: catData } = await supabase.from("asset_categories").select("id, code").limit(100);
  const catByCode = new Map((catData ?? []).map((c: { id: number; code: string }) => [c.code, c.id]));

  const ухЗId = catByCode.get("ҮХ-3");
  const ухТId = catByCode.get("ҮХ-5");
  const ухБId = catByCode.get("ҮХ-6");

  // Ангилалгүй хөрөнгүүдийг татаж TypeScript дотор ангилна
  const { data: uncat } = await supabase
    .from("assets")
    .select("id, name")
    .is("category_id", null)
    .limit(10000);

  for (const a of (uncat ?? []) as { id: number; name: string }[]) {
    const n = a.name.toLowerCase();
    let catId: number | null = null;
    if (n.includes("чиргүүл") || n.includes("толгой") || n.includes("холбогч")) {
      catId = ухЗId ?? null;
    } else if (n.includes("computer") || n.includes("notebook") || n.includes("компьютер") || n.includes("ноутбук")) {
      catId = ухТId ?? null;
    } else {
      catId = ухБId ?? null;
    }
    if (catId) {
      await supabase.from("assets").update({ category_id: catId }).eq("id", a.id);
    }
  }

  revalidatePath("/opening-balances/assets");
  return { ok: true, message: "✓ Ангилал тохируулж, хөрөнгөд оноолоо." };
}

// Үндсэн хөрөнгийн эхний үлдэгдлийг журналд тусгана:
//   Дт  хөрөнгийн данс (Σ өртөг)
//   Кт  хуримтлагдсан элэгдлийн данс (Σ opening_accum_depreciation)
// source='opening-asset'. Тухайн огнооны хуучин тусгалыг бүхэлд нь солино.
export async function syncAssetOpening(year: number): Promise<SyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Нэвтрэх шаардлагатай" };

  const date = openDateFor(year);

  const [{ data: assetRows }, { data: catRows }] = await Promise.all([
    supabase
      .from("assets")
      .select("category_id, cost, opening_accum_depreciation")
      .eq("is_active", true)
      .eq("status", "active")
      .limit(10000),
    supabase
      .from("asset_categories")
      .select("id, account_code, accum_account_code")
      .limit(2000),
  ]);

  const cat = new Map(
    (
      (catRows as
        | { id: number; account_code: string | null; accum_account_code: string | null }[]
        | null) ?? []
    ).map((c) => [c.id, c]),
  );

  // Данс код → Дт (өртөг) ба Кт (хуримтлагдсан элэгдэл) нийлбэр.
  const costByAcct = new Map<string, number>();
  const accumByAcct = new Map<string, number>();
  let missing = 0;
  for (const a of (assetRows as
    | { category_id: number | null; cost: number; opening_accum_depreciation: number }[]
    | null) ?? []) {
    const c = a.category_id != null ? cat.get(a.category_id) : undefined;
    const acct = c?.account_code;
    if (!acct) {
      missing++;
      continue;
    }
    costByAcct.set(acct, (costByAcct.get(acct) ?? 0) + (Number(a.cost) || 0));
    const accumAcct = c?.accum_account_code;
    const accum = Number(a.opening_accum_depreciation) || 0;
    if (accumAcct && accum > 0)
      accumByAcct.set(accumAcct, (accumByAcct.get(accumAcct) ?? 0) + accum);
  }

  const entries: {
    txn_date: string;
    description: string;
    amount: number;
    debit_code: string | null;
    credit_code: string | null;
    is_opening: boolean;
    source: string;
  }[] = [];
  for (const [code, amt] of costByAcct) {
    if (r2(amt) < 0.005) continue;
    entries.push({
      txn_date: date,
      description: "Үндсэн хөрөнгийн эхний үлдэгдэл — өртөг",
      amount: r2(amt),
      debit_code: code,
      credit_code: null,
      is_opening: true,
      source: OPENING_SOURCES.assets,
    });
  }
  for (const [code, amt] of accumByAcct) {
    if (r2(amt) < 0.005) continue;
    entries.push({
      txn_date: date,
      description: "Үндсэн хөрөнгийн эхний үлдэгдэл — хуримтлагдсан элэгдэл",
      amount: r2(amt),
      debit_code: null,
      credit_code: code,
      is_opening: true,
      source: OPENING_SOURCES.assets,
    });
  }

  await supabase
    .from("journal_entries")
    .delete()
    .eq("is_opening", true)
    .eq("txn_date", date)
    .eq("source", OPENING_SOURCES.assets);

  if (entries.length > 0) {
    const { error } = await supabase.from("journal_entries").insert(entries);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/opening-balances/assets");
  revalidatePath("/opening-balances/financial-statement");
  const warn = missing > 0 ? ` (${missing} хөрөнгө дансгүй ангилалд тул орхигдсон)` : "";
  return {
    ok: true,
    message: `✓ ${entries.length} данс журналд тусгалаа (${date})${warn}.`,
  };
}
