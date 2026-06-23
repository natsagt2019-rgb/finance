"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { postJournal } from "@/lib/post-journal";
import { computeFifo, fifoIssueCost, type MoveLite } from "@/lib/inventory-calc";

export type ActionResult = { ok: true } | { ok: false; error: string };
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

// Бараа материалыг үндсэн хөрөнгө болгох:
//   issue (БМ FIFO зарлага) + asset үүсгэх + журнал Дт ҮХ данс / Кт БМ данс.
export async function createAssetFromInventory(input: {
  date: string; item_id: number; qty: number; asset_name: string; category_id: number | null; acquired_date?: string | null; company?: string | null;
}): Promise<ActionResult> {
  const supabase = await requireAuth();
  const qty = Number(input.qty) || 0;
  if (!input.date) return { ok: false, error: "Огноо заавал." };
  if (!input.item_id) return { ok: false, error: "Бараа сонгоно уу." };
  if (qty <= 0) return { ok: false, error: "Тоо 0-ээс их байх ёстой." };
  const assetName = (input.asset_name ?? "").trim();
  if (!assetName) return { ok: false, error: "Хөрөнгийн нэр оруулна уу." };

  // Барааны ангилал + БМ данс.
  const { data: item } = await supabase.from("inv_items").select("id, category_code, name").eq("id", input.item_id).single();
  if (!item) return { ok: false, error: "Бараа олдсонгүй." };
  const { data: setRow } = await supabase.from("inv_settings").select("category_accounts, auto_journal").eq("id", 1).maybeSingle();
  const catAcc = ((setRow as { category_accounts: Record<string, number | null> | null } | null)?.category_accounts) ?? {};
  const autoJournal = (setRow as { auto_journal: boolean | null } | null)?.auto_journal !== false;
  const invAccRaw = catAcc[(item as { category_code: string }).category_code];
  const invAccId = invAccRaw != null ? Number(invAccRaw) : null;

  // ҮХ ангиллын данс (account_code → id).
  let assetAccId: number | null = null;
  if (input.category_id) {
    const { data: cat } = await supabase.from("asset_categories").select("account_code").eq("id", input.category_id).maybeSingle();
    const code = (cat as { account_code: string | null } | null)?.account_code;
    if (code) {
      const { data: acc } = await supabase.from("accounts").select("id").eq("code", code).eq("is_active", true).maybeSingle();
      assetAccId = (acc as { id: number } | null)?.id ?? null;
    }
  }

  // FIFO өртөг.
  const { data: ms } = await supabase.from("inv_moves").select("id, date, type, qty, unit_cost").eq("item_id", input.item_id).limit(100000);
  const layers = computeFifo(((ms as (MoveLite & { date: string })[] | null) ?? []).map((m) => ({ ...m, date: m.date.slice(0, 10) }))).layers;
  const f = fifoIssueCost(layers, qty);
  if (f.shortage > 1e-6) return { ok: false, error: `Үлдэгдэл хүрэлцэхгүй: ${r2(f.shortage)} дутна.` };
  const totalCost = r2(f.totalCost);
  if (totalCost <= 0) return { ok: false, error: "Өртөг 0 байна." };

  if (autoJournal && (invAccId == null || assetAccId == null))
    return { ok: false, error: "БМ данс эсвэл ҮХ ангиллын данс тохируулаагүй (Тохиргоо / ангилал)." };

  const company = (input.company ?? "").trim() || null;

  // 1) БМ зарлага (журналгүй — нэгдсэн журнал тусдаа).
  const { error: mvErr } = await supabase.from("inv_moves").insert({
    date: input.date, type: "issue", item_id: input.item_id, qty, unit_cost: r2(f.unitCost),
    total_cost: totalCost, vat_amount: 0, doc_no: "БМ-ҮХ", company, note: `ҮХ рүү шилжүүлэв: ${assetName}`,
  });
  if (mvErr) return { ok: false, error: mvErr.message };

  // 2) Журнал: Дт ҮХ данс / Кт БМ данс.
  let journalId: number | null = null;
  if (autoJournal) {
    const desc = `Бараа материал → ҮХ: ${assetName}`;
    const posted = await postJournal(supabase, {
      date: input.date, description: desc, reference: "БМ-ҮХ", partner_id: null, source: "inventory",
      lines: [
        { account_id: assetAccId!, debit: totalCost, credit: 0, description: desc },
        { account_id: invAccId!, debit: 0, credit: totalCost, description: desc },
      ],
    });
    if (!posted.ok) return { ok: false, error: `Журнал: ${posted.error}` };
    journalId = posted.id;
  }

  // 3) Үндсэн хөрөнгө үүсгэх.
  const { error: aErr } = await supabase.from("assets").insert({
    name: assetName, category_id: input.category_id, company,
    acquired_date: (input.acquired_date ?? "").trim() || input.date,
    cost: totalCost, status: "active",
  });
  if (aErr) return { ok: false, error: `ҮХ үүсгэхэд алдаа: ${aErr.message}` };

  revalidatePath("/inventory");
  revalidatePath("/assets");
  revalidatePath("/journals");
  return { ok: true };
}
