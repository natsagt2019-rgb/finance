"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeFifo, fifoIssueCost, type MoveLite } from "@/lib/inventory-calc";

export type ActionResult = { ok: true } | { ok: false; error: string };
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

// Дотоод шилжүүлэг: барааг нэг байршлаас нөгөөд шилжүүлнэ.
//   issue (from) + receipt (to) ижил өртгөөр — нийт үлдэгдэл/өртөг хэвээр, журналгүй.
export async function createTransfer(input: {
  date: string; item_id: number; from_location: number; to_location: number; qty: number; note?: string | null;
}): Promise<ActionResult> {
  const supabase = await requireAuth();
  const qty = Number(input.qty) || 0;
  if (!input.date) return { ok: false, error: "Огноо заавал." };
  if (!input.item_id) return { ok: false, error: "Бараа сонгоно уу." };
  if (!input.from_location || !input.to_location) return { ok: false, error: "Гарах ба ирэх байршлыг сонгоно уу." };
  if (input.from_location === input.to_location) return { ok: false, error: "Гарах ба ирэх байршил ялгаатай байх ёстой." };
  if (qty <= 0) return { ok: false, error: "Тоо 0-ээс их байх ёстой." };

  // Тухайн барааны бүх хөдөлгөөн.
  const { data: ms } = await supabase
    .from("inv_moves").select("id, date, type, qty, unit_cost, location_id").eq("item_id", input.item_id).limit(100000);
  const all = (ms as (MoveLite & { date: string; location_id: number | null })[] | null) ?? [];
  const lite = (m: { id: number; date: string; type: MoveLite["type"]; qty: number; unit_cost: number }): MoveLite =>
    ({ id: m.id, date: m.date.slice(0, 10), type: m.type, qty: m.qty, unit_cost: m.unit_cost });

  // Гарах байршлын үлдэгдэл хүрэлцэх эсэх.
  const fromQty = computeFifo(all.filter((m) => m.location_id === input.from_location).map(lite)).qtyRemaining;
  if (fromQty + 1e-6 < qty) return { ok: false, error: `Гарах байршилд хүрэлцэхгүй: ${r2(fromQty)} байхад ${qty} шилжүүлэх гэж байна.` };

  // Нийт (бүх байршил) FIFO өртгөөр — нийт өртөг өөрчлөгдөхгүй.
  const f = fifoIssueCost(computeFifo(all.map(lite)).layers, qty);
  const unitCost = r2(f.unitCost);
  const totalCost = r2(f.totalCost);
  const note = (input.note ?? "").trim() || "Дотоод шилжүүлэг";

  const { error } = await supabase.from("inv_moves").insert([
    { date: input.date, type: "issue", item_id: input.item_id, qty, unit_cost: unitCost, total_cost: totalCost, vat_amount: 0, location_id: input.from_location, doc_no: "БМ-Шилж", note: `${note} (гарсан)` },
    { date: input.date, type: "return_in", item_id: input.item_id, qty, unit_cost: unitCost, total_cost: totalCost, vat_amount: 0, location_id: input.to_location, doc_no: "БМ-Шилж", note: `${note} (ирсэн)` },
  ]);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/inventory");
  revalidatePath("/inventory/transfer");
  return { ok: true };
}
