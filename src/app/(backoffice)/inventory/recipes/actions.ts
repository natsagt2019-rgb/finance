"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { postJournal } from "@/lib/post-journal";
import { computeFifo, fifoIssueCost, type MoveLite } from "@/lib/inventory-calc";

export type ActionResult = { ok: true; id?: number } | { ok: false; error: string };

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// ── Орц (BOM): мөр нэмэх / устгах ───────────────────────────────────────────
export async function addRecipeLine(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAuth();
  const product = Number(formData.get("product_item_id"));
  const component = Number(formData.get("component_item_id"));
  const qty = Number(String(formData.get("qty") ?? "").replace(/[, ]/g, "")) || 0;
  if (!product || !component) return { ok: false, error: "Бүтээгдэхүүн ба түүхий эд сонгоно уу." };
  if (product === component) return { ok: false, error: "Бүтээгдэхүүн өөрөө орц болж болохгүй." };
  if (qty <= 0) return { ok: false, error: "Тоо 0-ээс их байх ёстой." };
  const { error } = await supabase
    .from("inv_recipes")
    .upsert({ product_item_id: product, component_item_id: component, qty }, { onConflict: "product_item_id,component_item_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory/recipes");
  return { ok: true };
}

export async function deleteRecipeLine(id: number): Promise<ActionResult> {
  const supabase = await requireAuth();
  const { error } = await supabase.from("inv_recipes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory/recipes");
  return { ok: true };
}

// ── Хөрвүүлэлт: орцоор түүхий эд зарцуулж бүтээгдэхүүн гаргах ─────────────────
//   Түүхий эд: issue (FIFO), бүтээгдэхүүн: receipt (нийт өртгөөр).
//   Журнал: Дт бүтээгдэхүүний БМ данс / Кт түүхий эдийн БМ дансууд.
export async function createConversion(input: {
  date: string; product_item_id: number; output_qty: number; doc_no?: string | null; company?: string | null;
}): Promise<ActionResult> {
  const supabase = await requireAuth();
  const outQty = Number(input.output_qty) || 0;
  if (!input.date) return { ok: false, error: "Огноо заавал." };
  if (!input.product_item_id) return { ok: false, error: "Бүтээгдэхүүн сонгоно уу." };
  if (outQty <= 0) return { ok: false, error: "Гаргах тоо 0-ээс их байх ёстой." };

  const { data: recipe } = await supabase
    .from("inv_recipes").select("component_item_id, qty").eq("product_item_id", input.product_item_id);
  const comps = (recipe as { component_item_id: number; qty: number }[] | null) ?? [];
  if (comps.length === 0) return { ok: false, error: "Энэ бүтээгдэхүүний орц тодорхойлоогүй байна." };

  // Хэрэгтэй item-уудын ангилал + БМ данс (inv_settings).
  const itemIds = [input.product_item_id, ...comps.map((c) => c.component_item_id)];
  const { data: itemRows } = await supabase.from("inv_items").select("id, category_code, name").in("id", itemIds);
  const catOf = new Map((itemRows as { id: number; category_code: string; name: string }[] | null ?? []).map((i) => [i.id, i.category_code]));
  const nameOf = new Map((itemRows as { id: number; name: string }[] | null ?? []).map((i) => [i.id, i.name]));
  const { data: setRow } = await supabase.from("inv_settings").select("category_accounts, auto_journal").eq("id", 1).maybeSingle();
  const catAcc = ((setRow as { category_accounts: Record<string, number | null> | null } | null)?.category_accounts) ?? {};
  const autoJournal = (setRow as { auto_journal: boolean | null } | null)?.auto_journal !== false;
  const invAcc = (itemId: number): number | null => {
    const code = catOf.get(itemId);
    const v = code ? catAcc[code] : null;
    return v != null ? Number(v) : null;
  };

  const productInv = invAcc(input.product_item_id);
  if (autoJournal && productInv == null)
    return { ok: false, error: "Бүтээгдэхүүний бараа материалын данс тохируулаагүй (Тохиргоо)." };

  // Түүхий эд бүрийн FIFO өртөг.
  type CompCalc = { itemId: number; qty: number; unitCost: number; totalCost: number; invAcc: number | null };
  const calc: CompCalc[] = [];
  let totalCost = 0;
  for (const cmp of comps) {
    const need = r2(Number(cmp.qty) * outQty);
    if (need <= 0) continue;
    const { data: ms } = await supabase
      .from("inv_moves").select("id, date, type, qty, unit_cost").eq("item_id", cmp.component_item_id).limit(100000);
    const layers = computeFifo(((ms as (MoveLite & { date: string })[] | null) ?? []).map((m) => ({ ...m, date: m.date.slice(0, 10) }))).layers;
    const f = fifoIssueCost(layers, need);
    if (f.shortage > 1e-6)
      return { ok: false, error: `«${nameOf.get(cmp.component_item_id) ?? cmp.component_item_id}» дутна: ${r2(f.shortage)} нэгж.` };
    const acc = invAcc(cmp.component_item_id);
    if (autoJournal && acc == null)
      return { ok: false, error: `«${nameOf.get(cmp.component_item_id)}» түүхий эдийн данс тохируулаагүй.` };
    calc.push({ itemId: cmp.component_item_id, qty: need, unitCost: r2(f.unitCost), totalCost: r2(f.totalCost), invAcc: acc });
    totalCost = r2(totalCost + f.totalCost);
  }
  if (totalCost <= 0) return { ok: false, error: "Зарцуулах түүхий эдийн өртөг 0 байна." };

  const docNo = (input.doc_no ?? "").trim() || "БМ-Хөрв";
  const company = (input.company ?? "").trim() || null;
  const prodUnitCost = r2(totalCost / outQty);

  // 1) Түүхий эд зарлагын хөдөлгөөн (журналгүй — нэгдсэн журнал тусдаа).
  const compMoves = calc.map((c) => ({
    date: input.date, type: "issue", item_id: c.itemId, qty: c.qty, unit_cost: c.unitCost,
    total_cost: c.totalCost, vat_amount: 0, doc_no: docNo, company, note: "Хөрвүүлэлт — зарцуулалт",
  }));
  // 2) Бүтээгдэхүүн орлогын хөдөлгөөн.
  compMoves.push({
    date: input.date, type: "receipt", item_id: input.product_item_id, qty: outQty, unit_cost: prodUnitCost,
    total_cost: totalCost, vat_amount: 0, doc_no: docNo, company, note: "Хөрвүүлэлт — бүтээгдэхүүн",
  });
  const { error: mvErr } = await supabase.from("inv_moves").insert(compMoves);
  if (mvErr) return { ok: false, error: mvErr.message };

  // 3) Нэгдсэн журнал: Дт бүтээгдэхүүний данс / Кт түүхий эдийн дансууд.
  let journalId: number | null = null;
  if (autoJournal) {
    const creditMap = new Map<number, number>();
    for (const c of calc) creditMap.set(c.invAcc!, r2((creditMap.get(c.invAcc!) ?? 0) + c.totalCost));
    const desc = `Хөрвүүлэлт — ${nameOf.get(input.product_item_id) ?? ""}`;
    const lines = [
      { account_id: productInv!, debit: totalCost, credit: 0, description: desc },
      ...[...creditMap.entries()].map(([acc, amt]) => ({ account_id: acc, debit: 0, credit: amt, description: desc })),
    ];
    const posted = await postJournal(supabase, {
      date: input.date,
      description: `Хөрвүүлэлт — ${nameOf.get(input.product_item_id) ?? ""} × ${outQty}`,
      reference: docNo, partner_id: null, source: "inventory", lines,
    });
    if (!posted.ok) return { ok: false, error: `Журнал: ${posted.error}` };
    journalId = posted.id;
  }

  // 4) Хөрвүүлэлтийн баримт.
  await supabase.from("inv_conversions").insert({
    date: input.date, product_item_id: input.product_item_id, output_qty: outQty,
    total_cost: totalCost, journal_id: journalId, doc_no: docNo, company,
  });

  revalidatePath("/inventory/recipes");
  revalidatePath("/inventory");
  revalidatePath("/journals");
  return { ok: true, id: journalId ?? undefined };
}
