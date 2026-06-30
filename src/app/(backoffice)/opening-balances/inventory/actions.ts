"use server";

import { revalidatePath } from "next/cache";
import * as xlsx from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { computeFifo, CATEGORIES, type MoveLite } from "@/lib/inventory-calc";
import { OPENING_SOURCES, openDateFor } from "../shared";
import type { SyncResult } from "../sync-button";

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function num(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function toISO(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const m = String(v).trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null;
}

const OPENING_NOTE = "Эхний үлдэгдэл (импорт)";

export type InvImportResult =
  | { ok: true; items: number; moves: number }
  | { ok: false; error: string };

// Excel (загварын дагуу) → inv_items (байхгүйг үүсгэнэ) + нээлтийн нөөцийг
// 'receipt' хөдөлгөөнөөр бичнэ. Дахин импортлоход тухайн барааны өмнөх импортын
// нээлтийн мөрийг сольдог (idempotent). Ангиллыг шошго/кодоор тааруулна.
export async function importInventoryExcel(
  year: number,
  formData: FormData,
): Promise<InvImportResult> {
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

  const headerRow = (grid[0] ?? []).map((c) => String(c ?? "").trim().toLowerCase());
  const find = (...keys: string[]) =>
    headerRow.findIndex((h) => keys.some((k) => h.includes(k)));
  const idx = {
    name: find("нэр"),
    cat: find("ангилал"),
    unit: find("нэгж"),
    sku: find("sku", "код"),
    qty: find("тоо"),
    cost: find("өртөг", "үнэ"),
    date: find("огноо"),
  };
  if (idx.name < 0)
    return { ok: false, error: "«Нэр» багана олдсонгүй. Загварыг ашиглана уу." };

  // Шошго → ангиллын код (эсвэл шууд код).
  const codeByLabel = new Map<string, string>();
  for (const c of CATEGORIES) codeByLabel.set(c.label.toLowerCase(), c.code);
  const validCodes = new Set(CATEGORIES.map((c) => c.code));
  const catCodeOf = (raw: string): string => {
    const s = raw.trim().toLowerCase();
    if (!s) return "150100";
    if (validCodes.has(s)) return s;
    return codeByLabel.get(s) ?? "150100";
  };

  // Байгаа идэвхтэй барааг нэрээр (давхар үүсгэхгүй).
  const { data: existing } = await supabase
    .from("inv_items")
    .select("id, name")
    .eq("is_active", true)
    .limit(20000);
  const itemByName = new Map<string, number>();
  for (const it of (existing as { id: number; name: string }[] | null) ?? [])
    itemByName.set(it.name.trim().toLowerCase(), it.id);

  const defaultDate = openDateFor(year);
  let itemsCreated = 0;
  type MoveIns = {
    date: string;
    type: string;
    item_id: number;
    qty: number;
    unit_cost: number;
    total_cost: number;
    note: string;
  };
  const moves: MoveIns[] = [];
  const touchedItemIds = new Set<number>();

  for (let i = 1; i < grid.length; i++) {
    const row = grid[i] ?? [];
    const name = String(row[idx.name] ?? "").trim();
    if (!name) continue;
    const qty = idx.qty >= 0 ? num(row[idx.qty]) : 0;
    const unitCost = idx.cost >= 0 ? num(row[idx.cost]) : 0;
    if (qty <= 0) continue;

    const key = name.toLowerCase();
    let itemId = itemByName.get(key);
    if (itemId == null) {
      const { data: ins, error } = await supabase
        .from("inv_items")
        .insert({
          name,
          category_code: idx.cat >= 0 ? catCodeOf(String(row[idx.cat] ?? "")) : "150100",
          unit: idx.unit >= 0 ? String(row[idx.unit] ?? "").trim() || "ш" : "ш",
          sku: idx.sku >= 0 ? String(row[idx.sku] ?? "").trim() || null : null,
          is_active: true,
        })
        .select("id")
        .single();
      if (error) return { ok: false, error: error.message };
      itemId = (ins as { id: number }).id;
      itemByName.set(key, itemId);
      itemsCreated++;
    }

    touchedItemIds.add(itemId);
    moves.push({
      date: (idx.date >= 0 ? toISO(row[idx.date]) : null) ?? defaultDate,
      type: "receipt",
      item_id: itemId,
      qty: Math.abs(qty),
      unit_cost: r2(unitCost),
      total_cost: r2(Math.abs(qty) * unitCost),
      note: OPENING_NOTE,
    });
  }

  // Idempotent: тухайн барааны өмнөх импортын нээлтийн мөрийг устгаад дахин бичнэ.
  if (touchedItemIds.size > 0) {
    await supabase
      .from("inv_moves")
      .delete()
      .eq("note", OPENING_NOTE)
      .in("item_id", [...touchedItemIds]);
  }
  if (moves.length > 0) {
    const { error } = await supabase.from("inv_moves").insert(moves);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/opening-balances/inventory");
  revalidatePath("/inventory");
  return { ok: true, items: itemsCreated, moves: moves.length };
}

// Барааны эхний үлдэгдэл (нээлтийн огноо хүртэлх FIFO өртөг) → Дт бараа
// материалын данс. source='opening-inventory'. Контр тал (Кт) нь дансны
// табын өмчийн эхлэлээр тэнцэнэ.
export async function syncInventoryOpening(year: number): Promise<SyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Нэвтрэх шаардлагатай" };

  const date = openDateFor(year);

  const [{ data: settings }, { data: accRows }, { data: itemRows }, { data: moveRows }] =
    await Promise.all([
      supabase.from("inv_settings").select("category_accounts").eq("id", 1).maybeSingle(),
      supabase.from("accounts").select("id, code").limit(5000),
      supabase.from("inv_items").select("id, category_code").limit(10000),
      supabase
        .from("inv_moves")
        .select("item_id, date, type, qty, unit_cost")
        .lte("date", date)
        .limit(100000),
    ]);

  const catAccounts =
    ((settings as { category_accounts: Record<string, number> } | null)
      ?.category_accounts) ?? {};
  const codeById = new Map(
    ((accRows as { id: number; code: string }[] | null) ?? []).map((a) => [a.id, a.code]),
  );
  const catOfItem = new Map(
    ((itemRows as { id: number; category_code: string }[] | null) ?? []).map((i) => [
      i.id,
      i.category_code,
    ]),
  );

  // Барааны id-аар хөдөлгөөнийг бүлэглэнэ.
  const movesByItem = new Map<number, MoveLite[]>();
  for (const m of (moveRows as
    | { item_id: number; date: string; type: MoveLite["type"]; qty: number; unit_cost: number }[]
    | null) ?? []) {
    const arr = movesByItem.get(m.item_id) ?? [];
    arr.push({
      id: arr.length + 1,
      date: m.date,
      type: m.type,
      qty: Number(m.qty) || 0,
      unit_cost: Number(m.unit_cost) || 0,
    });
    movesByItem.set(m.item_id, arr);
  }

  // Данс код → нийт FIFO өртөг.
  const valueByAcct = new Map<string, number>();
  let unmapped = 0;
  for (const [itemId, moves] of movesByItem) {
    const { valueRemaining } = computeFifo(moves);
    if (valueRemaining < 0.005) continue;
    const catCode = catOfItem.get(itemId);
    // category_accounts-д id заримдаа string болж хадгалагдсан байж болзошгүй
    // тул Number()-ээр баталгаажуулна (codeById нь тоон id-аар түлхүүрлэгдсэн).
    const rawAcct = catCode ? catAccounts[catCode] : undefined;
    const acctId = rawAcct != null ? Number(rawAcct) : undefined;
    const code = acctId != null ? codeById.get(acctId) : undefined;
    if (!code) {
      unmapped++;
      continue;
    }
    valueByAcct.set(code, (valueByAcct.get(code) ?? 0) + valueRemaining);
  }

  const entries = [...valueByAcct.entries()]
    .filter(([, v]) => r2(v) >= 0.005)
    .map(([code, v]) => ({
      txn_date: date,
      description: "Барааны эхний үлдэгдэл",
      amount: r2(v),
      debit_code: code,
      credit_code: null,
      is_opening: true,
      source: OPENING_SOURCES.inventory,
    }));

  await supabase
    .from("journal_entries")
    .delete()
    .eq("is_opening", true)
    .eq("txn_date", date)
    .eq("source", OPENING_SOURCES.inventory);

  if (entries.length > 0) {
    const { error } = await supabase.from("journal_entries").insert(entries);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/opening-balances/inventory");
  revalidatePath("/opening-balances/financial-statement");
  const warn =
    unmapped > 0
      ? ` (${unmapped} барааны ангилал дансанд холбогдоогүй — «Бараа материал» → тохиргоо)`
      : "";
  return {
    ok: true,
    message: `✓ ${entries.length} данс журналд тусгалаа (${date})${warn}.`,
  };
}
