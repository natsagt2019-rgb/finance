"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Өгөгдмөл утгууд — financial_settings хүснэгтэд тохиргоо байхгүй үед.
const DEFAULT_AR          = "130100"; // Худалдан авагч, захиалагчийн авлага
const DEFAULT_OUTPUT_VAT  = "330100"; // НӨАТ-ын өглөг (тооцоолсон)

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

type FinSettings = { ar_code: string; output_vat_code: string };

async function loadFinancialSettings(
  supabase: Awaited<ReturnType<typeof requireAuth>>,
  company: string,
): Promise<FinSettings> {
  const { data } = await supabase
    .from("financial_settings")
    .select("ar_code, output_vat_code")
    .eq("company", company)
    .maybeSingle();
  return {
    ar_code:         (data as FinSettings | null)?.ar_code         ?? DEFAULT_AR,
    output_vat_code: (data as FinSettings | null)?.output_vat_code ?? DEFAULT_OUTPUT_VAT,
  };
}

// Борлуулалт → авлага + output НӨАТ.
//   Дт авлага (нийт) / Кт орлого (цэвэр) + Кт НӨАТ өглөг
export async function createSale(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAuth();

  const date = String(formData.get("sale_date") ?? "").trim();
  const revenueCode = String(formData.get("revenue_code") ?? "").trim();
  const net = r2(num(formData.get("net_amount")));
  const vatPct = num(formData.get("vat_pct"));
  const partnerName = String(formData.get("partner_name") ?? "").trim() || null;
  const docNo = String(formData.get("doc_no") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const company = String(formData.get("company") ?? "").trim() || "ТҮМЭН ТЭЭХ";

  if (!date) return { ok: false, error: "Огноо заавал." };
  if (!revenueCode) return { ok: false, error: "Орлогын данс сонгоно уу." };
  if (net <= 0) return { ok: false, error: "Дүн (НӨАТ-гүй) 0-ээс их байх ёстой." };

  const cfg = await loadFinancialSettings(supabase, company);
  const vat = vatPct >= 1 ? r2(net * 0.1) : 0;
  const total = r2(net + vat);

  const { data: sale, error: e1 } = await supabase
    .from("sales")
    .insert({
      sale_date: date, doc_no: docNo, partner_name: partnerName, description,
      revenue_code: revenueCode, net_amount: net, vat_amount: vat, total_amount: total,
      company, status: "posted",
    })
    .select("id")
    .single();
  if (e1) return { ok: false, error: e1.message };
  const id = sale.id as number;

  const rows: Record<string, unknown>[] = [
    {
      txn_date: date,
      description: `Борлуулалт: ${description ?? partnerName ?? ""}`.slice(0, 180),
      partner_name: partnerName, amount: net,
      debit_code: cfg.ar_code, credit_code: revenueCode, is_opening: false,
      source: "sale", source_id: id,
    },
  ];
  if (vat > 0) {
    rows.push({
      txn_date: date,
      description: `Борлуулалтын НӨАТ: ${partnerName ?? ""}`.slice(0, 180),
      partner_name: partnerName, amount: vat,
      debit_code: cfg.ar_code, credit_code: cfg.output_vat_code, is_opening: false,
      source: "sale", source_id: id,
    });
  }
  let { error: e2 } = await supabase.from("journal_entries").insert(rows);
  if (e2 && /source_id/i.test(e2.message)) {
    const bare = rows.map(({ source_id: _omit, ...r }) => r);
    ({ error: e2 } = await supabase.from("journal_entries").insert(bare));
  }
  if (e2) {
    await supabase.from("sales").delete().eq("id", id);
    return { ok: false, error: `Журналд бичихэд алдаа: ${e2.message}` };
  }

  revalidatePath("/sales");
  return { ok: true, id };
}

export async function deleteSale(id: number): Promise<ActionResult> {
  const supabase = await requireAuth();

  const { error: delErr } = await supabase
    .from("journal_entries")
    .delete()
    .eq("source", "sale")
    .eq("source_id", id);

  if (delErr && /source_id/i.test(delErr.message)) {
    const { data: s } = await supabase
      .from("sales")
      .select("sale_date, partner_name")
      .eq("id", id)
      .maybeSingle();
    if (s) {
      await supabase
        .from("journal_entries")
        .delete()
        .eq("source", "sale")
        .eq("txn_date", (s as { sale_date: string }).sale_date)
        .eq("partner_name", (s as { partner_name: string | null }).partner_name ?? "");
    }
  }

  const { error } = await supabase.from("sales").update({ is_active: false }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/sales");
  return { ok: true, id };
}
