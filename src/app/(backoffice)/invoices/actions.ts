"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { VAT_RATE } from "@/lib/company";
import { deriveStatus, type InvoiceLine } from "./types";

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Формоос ирсэн мөрүүдийг (JSON) задлаж, дүнг тооцоолно.
function parseLines(formData: FormData): InvoiceLine[] {
  const raw = String(formData.get("lines") ?? "").trim();
  if (!raw) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const out: InvoiceLine[] = [];
  for (const x of arr) {
    const o = x as Record<string, unknown>;
    const description = String(o.description ?? "").trim();
    const qty = Number(o.qty) || 0;
    const unit_price = Number(o.unit_price) || 0;
    if (!description && qty === 0 && unit_price === 0) continue;
    out.push({ description, qty, unit_price, amount: r2(qty * unit_price) });
  }
  return out;
}

export type ActionResult =
  | { ok: true; id: number; invoice_no: string }
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

async function readForm(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const partnerRaw = get("partner_id");
  const partnerId = partnerRaw ? Number(partnerRaw) : null;

  // Харилцагчийн нэрийг снапшот болгож хадгална (устгагдсан ч үлдэнэ).
  let partnerName = get("partner_name") || null;
  if (partnerId && !partnerName) {
    const { supabase } = await requireAuth();
    const { data } = await supabase
      .from("partners")
      .select("name")
      .eq("id", partnerId)
      .single();
    partnerName = (data?.name as string | undefined) ?? null;
  }

  const lines = parseLines(formData);
  // Мөр байвал нийт дүн (gross) = Σ(мөрийн НӨАТ-гүй дүн) × (1 + НӨАТ).
  // Мөргүй бол гар оруулсан "Нийт дүн"-г ашиглана (хуучин нэхэмжлэлтэй нийцнэ).
  const lineNet = lines.reduce((s, l) => s + l.amount, 0);
  const amount = lines.length > 0 ? r2(lineNet * (1 + VAT_RATE)) : num(formData.get("amount"));
  const paid = num(formData.get("paid_amount"));

  return {
    invoice: {
      invoice_no: get("invoice_no") || null,
      inv_date: get("inv_date"),
      due_date: get("due_date") || null,
      partner_id: partnerId,
      partner_name: partnerName,
      responsible: get("responsible") || null,
      description: get("description") || null,
      amount,
      paid_amount: paid,
      status: deriveStatus(amount, paid),
      currency: get("currency") || "MNT",
    },
    lines,
  };
}

// Нэхэмжлэлийн мөрүүдийг солино (хуучныг устгаад шинээр оруулна).
async function replaceLines(
  supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"],
  invoiceId: number,
  lines: InvoiceLine[],
): Promise<void> {
  await supabase.from("invoice_lines").delete().eq("invoice_id", invoiceId);
  if (lines.length === 0) return;
  await supabase.from("invoice_lines").insert(
    lines.map((l, i) => ({
      invoice_id: invoiceId,
      sort: i,
      description: l.description,
      qty: l.qty,
      unit_price: l.unit_price,
      amount: l.amount,
    })),
  );
}

function dupMsg(message: string, invoiceNo: string | null): string {
  return /duplicate|unique/i.test(message)
    ? `"${invoiceNo}" дугаартай нэхэмжлэх аль хэдийн байна.`
    : message;
}

// ── Шинэ нэхэмжлэх нэмэх ────────────────────────────────────────────────────
export async function createInvoice(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const { invoice: v, lines } = await readForm(formData);

  if (!v.inv_date) return { ok: false, error: "Огноо заавал шаардлагатай." };
  if (!v.partner_id && !v.partner_name)
    return { ok: false, error: "Харилцагч заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("invoices")
    .insert(v)
    .select("id, invoice_no")
    .single();

  if (error) return { ok: false, error: dupMsg(error.message, v.invoice_no) };

  await replaceLines(supabase, data.id as number, lines);

  revalidatePath("/invoices");
  return {
    ok: true,
    id: data.id as number,
    invoice_no: (data.invoice_no as string) ?? "",
  };
}

// ── Нэхэмжлэх засах ─────────────────────────────────────────────────────────
export async function updateInvoice(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const { invoice: v, lines } = await readForm(formData);

  if (!v.inv_date) return { ok: false, error: "Огноо заавал шаардлагатай." };
  if (!v.partner_id && !v.partner_name)
    return { ok: false, error: "Харилцагч заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("invoices")
    .update(v)
    .eq("id", id)
    .select("id, invoice_no")
    .single();

  if (error) return { ok: false, error: dupMsg(error.message, v.invoice_no) };

  await replaceLines(supabase, id, lines);

  revalidatePath("/invoices");
  return {
    ok: true,
    id: data.id as number,
    invoice_no: (data.invoice_no as string) ?? "",
  };
}

// ── Бүрэн төлөгдсөн гэж тэмдэглэх (✓ товч) ──────────────────────────────────
export async function markPaid(id: number): Promise<ActionResult> {
  const { supabase } = await requireAuth();

  const { data: cur, error: readErr } = await supabase
    .from("invoices")
    .select("amount")
    .eq("id", id)
    .single();
  if (readErr || !cur) return { ok: false, error: readErr?.message ?? "Олдсонгүй" };

  const { data, error } = await supabase
    .from("invoices")
    .update({ paid_amount: cur.amount, status: "paid" })
    .eq("id", id)
    .select("id, invoice_no")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/invoices");
  return {
    ok: true,
    id: data.id as number,
    invoice_no: (data.invoice_no as string) ?? "",
  };
}

// ── Нэхэмжлэх устгах (зөөлөн устгал — is_active=false) ──────────────────────
export async function deleteInvoice(id: number): Promise<ActionResult> {
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from("invoices")
    .update({ is_active: false })
    .eq("id", id)
    .select("id, invoice_no")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/invoices");
  return {
    ok: true,
    id: data.id as number,
    invoice_no: (data.invoice_no as string) ?? "",
  };
}
