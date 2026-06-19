"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  parseVatExcel,
  type ParsedVatRow,
  type VatFormat,
} from "@/lib/vat-import";
import type { VatType } from "./types";

// Client ↔ server хооронд дамжих урьдчилан харах мөр.
export type VatPreviewRow = ParsedVatRow & {
  isDuplicate: boolean; // ДДТД-аар DB-д аль хэдийн орсон эсэх
};

export type VatFileResult = {
  filename: string;
  count: number;
  duplicates: number;
  format: VatFormat;
  skipped: number;
  error?: string;
};

export type VatPreviewResult = {
  rows: VatPreviewRow[];
  files: VatFileResult[];
};

export type VatCommitResult = {
  added: number;
  skipped: number;
  matched: number; // харилцагч тулгагдсан тоо
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

// ── Нэг баримтын төрлийг солих: борлуулалт ↔ худалдан авалт (out ↔ in) ───────
export async function toggleVatType(
  id: number,
): Promise<{ ok: boolean; type?: VatType; error?: string }> {
  const supabase = await requireAuth();

  const { data: cur, error: e1 } = await supabase
    .from("vat_records")
    .select("type")
    .eq("id", id)
    .single();
  if (e1 || !cur) return { ok: false, error: e1?.message ?? "Баримт олдсонгүй" };

  const next: VatType = cur.type === "out" ? "in" : "out";
  const { error } = await supabase
    .from("vat_records")
    .update({ type: next })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/vat");
  return { ok: true, type: next };
}

// ── Олон баримтын төрлийг нэг дор тогтоох (харилцагчаар бөөнөөр засах) ───────
export async function bulkSetVatType(
  ids: number[],
  type: VatType,
): Promise<{ ok: boolean; count?: number; error?: string }> {
  const supabase = await requireAuth();
  if (!Array.isArray(ids) || ids.length === 0) return { ok: true, count: 0 };
  if (type !== "out" && type !== "in")
    return { ok: false, error: "Төрөл буруу." };

  const { data, error } = await supabase
    .from("vat_records")
    .update({ type })
    .in("id", ids)
    .select("id");
  if (error) return { ok: false, error: error.message };

  revalidatePath("/vat");
  return { ok: true, count: data?.length ?? 0 };
}

// ── Тухайн сарын бүх НӨАТ баримтыг устгах ────────────────────────────────────
// month: 1..12. type заавал биш — өгвөл зөвхөн тэр төрлийг (out/in) устгана.
export async function deleteVatByMonth(
  month: number,
  type?: VatType | "",
): Promise<{ ok: boolean; count?: number; error?: string }> {
  const supabase = await requireAuth();
  if (!Number.isInteger(month) || month < 1 || month > 12)
    return { ok: false, error: "Сар буруу." };

  let q = supabase.from("vat_records").delete().eq("month", month);
  if (type === "out" || type === "in") q = q.eq("type", type);
  const { data, error } = await q.select("id");
  if (error) return { ok: false, error: error.message };

  revalidatePath("/vat");
  return { ok: true, count: data?.length ?? 0 };
}

// Өгөгдсөн ДДТД-уудаас DB-д аль хэдийн орсон болохыг олно.
async function existingDdtds(
  supabase: SupabaseClient,
  ddtds: string[],
): Promise<Set<string>> {
  const set = new Set<string>();
  const unique = [...new Set(ddtds.filter(Boolean))];
  if (unique.length === 0) return set;

  // Supabase .in() хязгаарыг хүндэтгэн багцлан асууна.
  const CHUNK = 500;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK);
    const { data } = await supabase
      .from("vat_records")
      .select("ddtd")
      .in("ddtd", slice);
    for (const r of (data as { ddtd: string | null }[] | null) ?? []) {
      if (r.ddtd) set.add(r.ddtd);
    }
  }
  return set;
}

// ── Урьдчилан харах: файлуудыг уншиж, давхардлыг тэмдэглэнэ ──────────────────
export async function previewVatImport(
  formData: FormData,
): Promise<VatPreviewResult> {
  const supabase = await requireAuth();

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return { rows: [], files: [] };

  const rows: VatPreviewRow[] = [];
  const fileResults: VatFileResult[] = [];
  const fileRanges: { result: VatFileResult; start: number }[] = [];

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = parseVatExcel(buffer, file.name);
      const start = rows.length;
      rows.push(...parsed.rows.map((r) => ({ ...r, isDuplicate: false })));
      const result: VatFileResult = {
        filename: file.name,
        count: parsed.rows.length,
        duplicates: 0,
        format: parsed.format,
        skipped: parsed.skipped,
      };
      fileResults.push(result);
      fileRanges.push({ result, start });
    } catch (e) {
      fileResults.push({
        filename: file.name,
        count: 0,
        duplicates: 0,
        format: "template",
        skipped: 0,
        error: e instanceof Error ? e.message : "Уншихад алдаа гарлаа",
      });
    }
  }

  // Файл хоорондын давхардлыг бас тэмдэглэнэ (эхнийхийг үлдээж бусдыг).
  const seen = new Set<string>();
  const dbSet = await existingDdtds(
    supabase,
    rows.map((r) => r.ddtd ?? ""),
  );
  for (const r of rows) {
    if (r.ddtd && (dbSet.has(r.ddtd) || seen.has(r.ddtd))) r.isDuplicate = true;
    if (r.ddtd) seen.add(r.ddtd);
  }

  for (let i = 0; i < fileRanges.length; i++) {
    const { result, start } = fileRanges[i];
    const end = i + 1 < fileRanges.length ? fileRanges[i + 1].start : rows.length;
    result.duplicates = rows.slice(start, end).filter((r) => r.isDuplicate).length;
  }

  rows.sort((a, b) => b.date.localeCompare(a.date));
  return { rows, files: fileResults };
}

// ── Батлах: ШИНЭ мөрүүдийг vat_records-д бичнэ, register-ээр харилцагч тулгана ─
export async function commitVatImport(
  rows: VatPreviewRow[],
): Promise<VatCommitResult> {
  const supabase = await requireAuth();
  if (rows.length === 0) return { added: 0, skipped: 0, matched: 0 };

  // Найдвартай байдлын тулд DB-тэй дахин тулгана.
  const dbSet = await existingDdtds(
    supabase,
    rows.map((r) => r.ddtd ?? ""),
  );
  // ДДТД-гүй мөрийг үргэлж шинэ гэж үзнэ; ДДТД давхрахыг файл дотор ч хасна.
  const seen = new Set<string>();
  const newRows = rows.filter((r) => {
    if (!r.ddtd) return true;
    if (dbSet.has(r.ddtd) || seen.has(r.ddtd)) return false;
    seen.add(r.ddtd);
    return true;
  });
  if (newRows.length === 0) {
    return { added: 0, skipped: rows.length, matched: 0 };
  }

  // Register → partner_id тулгалт (нэг удаа дуудаж кэшлэнэ).
  const regs = [
    ...new Set(newRows.map((r) => r.partner_register).filter((x): x is string => !!x)),
  ];
  const regToId = new Map<string, number>();
  const CHUNK = 500;
  for (let i = 0; i < regs.length; i += CHUNK) {
    const slice = regs.slice(i, i + CHUNK);
    const { data } = await supabase
      .from("partners")
      .select("id, register")
      .in("register", slice);
    for (const p of (data as { id: number; register: string | null }[] | null) ?? []) {
      if (p.register) regToId.set(p.register, p.id);
    }
  }

  let matched = 0;
  const dbRows = newRows.map((r) => {
    const pid = r.partner_register ? regToId.get(r.partner_register) ?? null : null;
    if (pid) matched++;
    return {
      date: r.date,
      type: r.type,
      ddtd: r.ddtd,
      parent_ddtd: r.parent_ddtd,
      invoice_no: r.invoice_no,
      partner_name: r.partner_name,
      partner_register: r.partner_register,
      partner_id: pid,
      amount: r.amount,
      vat_amount: r.vat_amount,
      total_amount: r.total_amount,
      paid_amount: r.paid_amount,
      remaining: r.remaining,
      tax_type: r.tax_type,
      source: r.source,
      ebarimt_status: r.ebarimt_status,
    };
  });

  const { data, error } = await supabase
    .from("vat_records")
    .insert(dbRows)
    .select("id");
  if (error) throw new Error(`Хадгалахад алдаа: ${error.message}`);

  const added = data?.length ?? 0;
  revalidatePath("/vat");

  return { added, skipped: rows.length - added, matched };
}
