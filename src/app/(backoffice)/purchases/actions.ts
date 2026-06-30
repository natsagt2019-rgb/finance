"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const AP = "310100"; // Нийлүүлэгч, гүйцэтгэгчийн өглөг
const INPUT_VAT = "130600"; // НӨАТ-ын авлага (суутгал)

export type ActionResult = { ok: true; id: number } | { ok: false; error: string };

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

function num(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// Худалдан авалт нэмэх → журналд өглөг бичих.
//   Дт зардал/бараа (цэвэр) + Дт 120201 НӨАТ суутгал / Кт 310100 өглөг (нийт)
export async function createPurchase(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAuth();

  const date = String(formData.get("pur_date") ?? "").trim();
  const expenseCode = String(formData.get("expense_code") ?? "").trim();
  const net = r2(num(formData.get("net_amount")));
  const vatPct = num(formData.get("vat_pct"));
  const partnerName = String(formData.get("partner_name") ?? "").trim() || null;
  const docNo = String(formData.get("doc_no") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const company = String(formData.get("company") ?? "").trim() || "ТҮМЭН ТЭЭХ";

  if (!date) return { ok: false, error: "Огноо заавал." };
  if (!expenseCode) return { ok: false, error: "Зардал/барааны данс сонгоно уу." };
  if (net <= 0) return { ok: false, error: "Дүн (НӨАТ-гүй) 0-ээс их байх ёстой." };

  const vat = vatPct >= 1 ? r2(net * 0.1) : 0;
  const total = r2(net + vat);

  // 1) Худалдан авалтын бичлэг.
  const { data: pur, error: e1 } = await supabase
    .from("purchases")
    .insert({
      pur_date: date,
      doc_no: docNo,
      partner_name: partnerName,
      description,
      expense_code: expenseCode,
      net_amount: net,
      vat_amount: vat,
      total_amount: total,
      company,
      status: "posted",
    })
    .select("id")
    .single();
  if (e1) return { ok: false, error: e1.message };
  const id = pur.id as number;

  // 2) Журнал (journal_entries — тайлангийн эх сурвалж).
  // source_id = худалдан авалтын id — устгахад нарийн холбоно.
  const rows: Record<string, unknown>[] = [
    {
      txn_date: date,
      description: `Худалдан авалт: ${description ?? partnerName ?? ""}`.slice(0, 180),
      partner_name: partnerName,
      amount: net,
      debit_code: expenseCode,
      credit_code: AP,
      is_opening: false,
      source: "purchase",
      source_id: id,
    },
  ];
  if (vat > 0) {
    rows.push({
      txn_date: date,
      description: `Худалдан авалтын НӨАТ суутгал: ${partnerName ?? ""}`.slice(0, 180),
      partner_name: partnerName,
      amount: vat,
      debit_code: INPUT_VAT,
      credit_code: AP,
      is_opening: false,
      source: "purchase",
      source_id: id,
    });
  }
  let { error: e2 } = await supabase.from("journal_entries").insert(rows);
  // source_id багана хараахан нэмэгдээгүй бол холбоосгүйгээр бичнэ.
  if (e2 && /source_id/i.test(e2.message)) {
    const bare = rows.map(({ source_id: _omit, ...r }) => r);
    ({ error: e2 } = await supabase.from("journal_entries").insert(bare));
  }
  if (e2) {
    await supabase.from("purchases").delete().eq("id", id);
    return { ok: false, error: `Журналд бичихэд алдаа: ${e2.message}` };
  }

  revalidatePath("/purchases");
  return { ok: true, id };
}

export async function deletePurchase(id: number): Promise<ActionResult> {
  const supabase = await requireAuth();

  // Нарийн устгал: зөвхөн энэ худалдан авалтын журнал (source_id-аар).
  const { error: delErr } = await supabase
    .from("journal_entries")
    .delete()
    .eq("source", "purchase")
    .eq("source_id", id);

  // source_id багана байхгүй (migration хийгээгүй) бол хуучин аргаар уналга.
  if (delErr && /source_id/i.test(delErr.message)) {
    const { data: p } = await supabase
      .from("purchases")
      .select("pur_date, partner_name")
      .eq("id", id)
      .maybeSingle();
    if (p) {
      await supabase
        .from("journal_entries")
        .delete()
        .eq("source", "purchase")
        .eq("txn_date", (p as { pur_date: string }).pur_date)
        .eq("partner_name", (p as { partner_name: string | null }).partner_name ?? "");
    }
  }

  const { error } = await supabase.from("purchases").update({ is_active: false }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/purchases");
  return { ok: true, id };
}
