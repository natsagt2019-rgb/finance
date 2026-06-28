"use server";

import { revalidatePath } from "next/cache";
import * as xlsx from "xlsx";

import { createClient } from "@/lib/supabase/server";
import {
  computeFifo,
  computeAverage,
  fifoIssueCost,
  type Layer,
  type MoveLite,
} from "@/lib/inventory-calc";
import {
  buildJournalLines,
  type InvJournalSettings,
  type MoveForJournal,
} from "@/lib/inventory-journal";
import { postJournal } from "@/lib/post-journal";
import { MOVE_DOC, SETTINGS_SELECT, ITEM_SELECT, type InvSettings, type ItemRow } from "../types";

export type IssueImportResult =
  | { ok: true; inserted: number; docNo: string; errors: string[] }
  | { ok: false; error: string };

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function num(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[, ₮]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// JSONB-д дансны id заримдаа string болж хадгалагдсан байж болзошгүй (Number()-ээр баталгаажуулна).
function toJournalSettings(s: InvSettings | null): InvJournalSettings {
  const rawCat = (s?.category_accounts as Record<string, number | string | null>) ?? {};
  const categoryAccounts: Record<string, number | null> = {};
  for (const [code, v] of Object.entries(rawCat)) {
    categoryAccounts[code] = v != null && v !== "" ? Number(v) : null;
  }
  return {
    categoryAccounts,
    apAccountId: s?.ap_account_id ?? null,
    vatAccountId: s?.vat_account_id ?? null,
    shortageExpenseAccountId: s?.shortage_expense_account_id ?? null,
    staffReceivableAccountId: s?.staff_receivable_account_id ?? null,
  };
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Excel-ийн нүднээс огноо унших (текст ISO эсвэл Date объект).
function cellDate(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  return ISO.test(s) ? s : null;
}

// Бараа материалын ЗАРЛАГЫГ Excel-ээс бөөнөөр оруулна. Бүх мөр нэг баримтын
// дугаар (doc_no) дор бичигдэх тул дараа нь БМ-3 «Зарлагын баримт» хэвлэнэ.
//   Excel багана:  [Код/SKU] [Барааны нэр] [Тоо хэмжээ] [Огноо?] [Тэмдэглэл?]
//   Маягтаас:      огноо (өгөгдөөгүй мөрд хэрэглэнэ), баримтын дугаар, зарлагын
//                  данс (зардал/харьцах), компани.
export async function importIssues(formData: FormData): Promise<IssueImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нэвтрэх шаардлагатай." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Excel файл сонгоно уу." };

  const headerDate = String(formData.get("date") ?? "").trim();
  if (!ISO.test(headerDate)) return { ok: false, error: "Огноо буруу (ЖЖЖЖ-СС-ӨӨ)." };
  const counterId = num(formData.get("counter_account_id"));
  if (counterId <= 0) return { ok: false, error: "Зарлагын данс (зардал/харьцах) сонгоно уу." };
  const company = String(formData.get("company") ?? "").trim() || null;
  let docNo = String(formData.get("doc_no") ?? "").trim();
  if (!docNo) docNo = `ЗАР-${headerDate.replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;

  // ── Excel унших ──
  let grid: unknown[][];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = xlsx.read(buf, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    grid = xlsx.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  } catch {
    return { ok: false, error: "Excel файлыг уншиж чадсангүй." };
  }

  // Эхний мөр толгой — гаргаж авна. Хоосон мөр алгасна.
  type ParsedRow = { rowNo: number; code: string; name: string; qty: number; date: string; note: string };
  const parsed: ParsedRow[] = [];
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i] ?? [];
    const code = String(row[0] ?? "").trim();
    const name = String(row[1] ?? "").trim();
    const qty = num(row[2]);
    const rowDate = cellDate(row[3]) ?? headerDate;
    const note = String(row[4] ?? "").trim();
    if (!code && !name && qty <= 0) continue; // бүрэн хоосон мөр
    parsed.push({ rowNo: i + 1, code, name, qty, date: rowDate, note });
  }
  if (parsed.length === 0) return { ok: false, error: "Excel-д өгөгдөл алга." };

  // ── Бараа болон тохиргоо ачаалах ──
  const allItems: ItemRow[] = [];
  for (let off = 0; off < 100000; off += 1000) {
    let q = supabase.from("inv_items").select(ITEM_SELECT).eq("is_active", true);
    if (company) q = q.eq("company", company);
    const { data } = await q.order("id").range(off, off + 999);
    const page = (data as ItemRow[] | null) ?? [];
    allItems.push(...page);
    if (page.length < 1000) break;
  }
  const bySku = new Map<string, ItemRow>();
  const byName = new Map<string, ItemRow>();
  for (const it of allItems) {
    if (it.sku) bySku.set(it.sku.trim().toLowerCase(), it);
    byName.set(it.name.trim().toLowerCase(), it);
  }

  const { data: setData } = await supabase
    .from("inv_settings")
    .select(SETTINGS_SELECT)
    .eq("id", 1)
    .maybeSingle();
  const settings = (setData as InvSettings | null) ?? null;
  const costMethod = settings?.cost_method === "average" ? "average" : "fifo";
  const journalSettings = toJournalSettings(settings);
  const autoJournal = settings?.auto_journal !== false;

  // Тухайн барааны хөдөлгөөнийг (өртгийн суурь) санах ойд кэшлэх — нэг импортын
  // дотор ижил барааг олон удаа зарлахад үлдэгдэл зөв хасагдана.
  const fifoState = new Map<number, Layer[]>();
  const avgState = new Map<number, { qty: number; value: number }>();
  async function ensureState(itemId: number) {
    if (fifoState.has(itemId) || avgState.has(itemId)) return;
    const { data } = await supabase
      .from("inv_moves")
      .select("id, date, type, qty, unit_cost")
      .eq("item_id", itemId)
      .limit(20000);
    const moves = (data as MoveLite[] | null) ?? [];
    if (costMethod === "average") {
      const a = computeAverage(moves);
      avgState.set(itemId, { qty: a.qtyRemaining, value: a.valueRemaining });
    } else {
      fifoState.set(itemId, computeFifo(moves).layers);
    }
  }

  // ── Мөр тус бүрийг боловсруулах ──
  let inserted = 0;
  const errors: string[] = [];
  for (const p of parsed) {
    const item =
      (p.code && bySku.get(p.code.toLowerCase())) ||
      (p.name && byName.get(p.name.toLowerCase())) ||
      (p.code && byName.get(p.code.toLowerCase())) ||
      null;
    if (!item) {
      errors.push(`Мөр ${p.rowNo}: бараа олдсонгүй («${p.code || p.name}»).`);
      continue;
    }
    if (p.qty <= 0) {
      errors.push(`Мөр ${p.rowNo}: тоо хэмжээ буруу (${p.name || p.code}).`);
      continue;
    }

    await ensureState(item.id);

    // Өртөг тооцох (FIFO эсвэл дундаж) + үлдэгдэл шалгах.
    let unitCost = 0;
    let totalCost = 0;
    if (costMethod === "average") {
      const st = avgState.get(item.id)!;
      if (p.qty > st.qty + 1e-6) {
        errors.push(`Мөр ${p.rowNo}: «${item.name}» үлдэгдэл хүрэлцэхгүй (зарлах ${p.qty}, үлдэгдэл ${r2(st.qty)}).`);
        continue;
      }
      const avg = st.qty > 0 ? st.value / st.qty : 0;
      unitCost = r2(avg);
      totalCost = r2(p.qty * avg);
      st.value = r2(st.value - p.qty * avg);
      st.qty = r2(st.qty - p.qty);
    } else {
      const layers = fifoState.get(item.id)!;
      const f = fifoIssueCost(layers, p.qty);
      if (f.shortage > 1e-6) {
        const have = layers.reduce((s, l) => s + l.qty, 0);
        errors.push(`Мөр ${p.rowNo}: «${item.name}» үлдэгдэл хүрэлцэхгүй (зарлах ${p.qty}, үлдэгдэл ${r2(have)}).`);
        continue;
      }
      unitCost = r2(f.unitCost);
      totalCost = r2(f.totalCost);
      fifoState.set(item.id, f.layersAfter);
    }

    // 1) Хөдөлгөөний мөр.
    const { data: mv, error: mvErr } = await supabase
      .from("inv_moves")
      .insert({
        date: p.date,
        type: "issue",
        item_id: item.id,
        qty: p.qty,
        unit_cost: unitCost,
        total_cost: totalCost,
        vat_amount: 0,
        counter_account_id: counterId,
        doc_no: docNo,
        company,
        note: p.note || null,
      })
      .select("id")
      .single();
    if (mvErr) {
      errors.push(`Мөр ${p.rowNo}: хадгалахад алдаа — ${mvErr.message}.`);
      continue;
    }
    const moveId = mv.id as number;

    // 2) Журнал (Дт зардал/харьцах / Кт бараа).
    if (autoJournal && totalCost > 0) {
      const mvJournal: MoveForJournal = {
        type: "issue",
        category_code: item.category_code,
        qty: p.qty,
        total_cost: totalCost,
        vat_amount: 0,
        counter_account_id: counterId,
      };
      const built = buildJournalLines(mvJournal, journalSettings);
      if (!built.ok) {
        await supabase.from("inv_moves").delete().eq("id", moveId);
        errors.push(`Мөр ${p.rowNo}: журнал — ${built.error}`);
        continue;
      }
      const posted = await postJournal(supabase, {
        date: p.date,
        description: `${built.description} (${item.name})`,
        reference: docNo,
        partner_id: null,
        source: "inventory",
        lines: built.lines,
      });
      if (!posted.ok) {
        await supabase.from("inv_moves").delete().eq("id", moveId);
        errors.push(`Мөр ${p.rowNo}: журнал — ${posted.error}`);
        continue;
      }
      await supabase.from("inv_moves").update({ journal_id: posted.id }).eq("id", moveId);
    }
    inserted++;
  }

  revalidatePath("/inventory");
  revalidatePath("/journals");
  return { ok: true, inserted, docNo, errors };
}
