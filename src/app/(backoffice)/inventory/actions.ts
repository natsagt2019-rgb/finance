"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  computeFifo,
  fifoIssueCost,
  averageIssueCost,
  isInbound,
  type MoveLite,
} from "@/lib/inventory-calc";
import {
  buildJournalLines,
  type InvJournalSettings,
  type MoveForJournal,
} from "@/lib/inventory-journal";
import { postJournal } from "@/lib/post-journal";
import { MOVE_DOC, type InvSettings, type MoveType } from "./types";

export type ActionResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

type Supa = Awaited<ReturnType<typeof createClient>>;

async function requireAuth(): Promise<Supa> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

function num(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// ── Бараа: нэмэх / засах / устгах ───────────────────────────────────────────
function readItem(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  return {
    sku: get("sku") || null,
    name: get("name"),
    category_code: get("category_code") || "150100",
    unit: get("unit") || "ш",
    reorder_point: num(formData.get("reorder_point")),
    company: get("company") || null,
    note: get("note") || null,
  };
}

export async function createItem(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAuth();
  const v = readItem(formData);
  if (!v.name) return { ok: false, error: "Барааны нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("inv_items")
    .insert(v)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory");
  return { ok: true, id: data.id as number };
}

export async function updateItem(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await requireAuth();
  const v = readItem(formData);
  if (!v.name) return { ok: false, error: "Барааны нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("inv_items")
    .update(v)
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory");
  return { ok: true, id: data.id as number };
}

export async function deleteItem(id: number): Promise<ActionResult> {
  const supabase = await requireAuth();
  const { data, error } = await supabase
    .from("inv_items")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory");
  return { ok: true, id: data.id as number };
}

// ── Тохиргоо татаж журналын данс resolve хийх ───────────────────────────────
async function loadSettings(supabase: Supa): Promise<InvSettings | null> {
  const { data } = await supabase
    .from("inv_settings")
    .select(
      "id, category_accounts, ap_account_id, vat_account_id, cash_account_id, " +
        "bank_account_id, shortage_expense_account_id, staff_receivable_account_id, " +
        "salary_payable_account_id, auto_journal, cost_method",
    )
    .eq("id", 1)
    .maybeSingle();
  return (data as InvSettings | null) ?? null;
}

function toJournalSettings(s: InvSettings | null): InvJournalSettings {
  // JSONB-д дансны id заримдаа string болж хадгалагдсан байж болзошгүй
  // (импорт/seed-ээс). mirrorToLedger тоон id шаарддаг тул Number()-ээр баталгаажуулна.
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

// ── FIFO: тухайн барааны одоогийн давхаргуудыг бодох ────────────────────────
async function fifoLayers(supabase: Supa, itemId: number) {
  const { data } = await supabase
    .from("inv_moves")
    .select("id, date, type, qty, unit_cost")
    .eq("item_id", itemId)
    .limit(10000);
  const moves = (data as MoveLite[] | null) ?? [];
  return computeFifo(moves);
}

// Тухайн барааны бүх хөдөлгөөн (FIFO/дундаж аль алинд).
async function loadItemMoves(supabase: Supa, itemId: number): Promise<MoveLite[]> {
  const { data } = await supabase
    .from("inv_moves")
    .select("id, date, type, qty, unit_cost")
    .eq("item_id", itemId)
    .limit(10000);
  return (data as MoveLite[] | null) ?? [];
}

// ── Хөдөлгөөн үүсгэх (орлого/зарлага/буцаалт/устгал) ────────────────────────
export type MoveInput = {
  date: string;
  type: MoveType;
  item_id: number;
  qty: number;
  unit_cost: number; // орлогод (receipt/return_in) хэрэглэнэ
  vat_amount: number;
  partner_id: number | null;
  counter_account_id: number | null;
  location_id?: number | null;
  lot_no?: string | null;
  expiry_date?: string | null;
  doc_no: string | null;
  company: string | null;
  note: string | null;
};

export async function createMove(input: MoveInput): Promise<ActionResult> {
  const supabase = await requireAuth();

  if (!input.date) return { ok: false, error: "Огноо заавал шаардлагатай." };
  const qty = Number(input.qty) || 0;
  if (qty <= 0) return { ok: false, error: "Тоо хэмжээ 0-ээс их байх ёстой." };

  // Барааны ангилал.
  const { data: item, error: itemErr } = await supabase
    .from("inv_items")
    .select("id, category_code, name")
    .eq("id", input.item_id)
    .single();
  if (itemErr || !item)
    return { ok: false, error: "Бараа олдсонгүй." };

  // Тохиргоо (өртгийн арга + журналын данс) — эхэнд нэг удаа.
  const settings = await loadSettings(supabase);
  const costMethod = settings?.cost_method === "average" ? "average" : "fifo";

  // Өртөг тооцох: орлого бол оруулсан үнэ; гарлага бол FIFO эсвэл дундаж өртөг.
  let unitCost = Number(input.unit_cost) || 0;
  let totalCost: number;
  if (isInbound(input.type)) {
    totalCost = r2(qty * unitCost);
  } else {
    const moves = await loadItemMoves(supabase, input.item_id);
    if (costMethod === "average") {
      const a = averageIssueCost(moves, qty);
      if (a.shortage > 1e-6)
        return { ok: false, error: `Үлдэгдэл хүрэлцэхгүй: ${qty} гаргахад ${r2(a.shortage)} дутна.` };
      unitCost = r2(a.unitCost);
      totalCost = r2(a.totalCost);
    } else {
      const f = fifoIssueCost(computeFifo(moves).layers, qty);
      if (f.shortage > 1e-6)
        return { ok: false, error: `Үлдэгдэл хүрэлцэхгүй: ${qty} гаргахад ${r2(f.shortage)} дутна.` };
      unitCost = r2(f.unitCost);
      totalCost = r2(f.totalCost);
    }
  }

  const vat = r2(input.vat_amount);

  // 1) Хөдөлгөөний мөр (эхлээд журналгүй).
  const { data: mv, error: mvErr } = await supabase
    .from("inv_moves")
    .insert({
      date: input.date,
      type: input.type,
      item_id: input.item_id,
      qty,
      unit_cost: unitCost,
      total_cost: totalCost,
      vat_amount: vat,
      partner_id: input.partner_id,
      counter_account_id: input.counter_account_id,
      location_id: input.location_id ?? null,
      lot_no: input.lot_no ?? null,
      expiry_date: input.expiry_date ?? null,
      doc_no: input.doc_no || MOVE_DOC[input.type],
      company: input.company,
      note: input.note,
    })
    .select("id")
    .single();
  if (mvErr) return { ok: false, error: mvErr.message };
  const moveId = mv.id as number;

  // 2) Журнал (auto_journal асаалттай бол) — settings эхэнд ачаалсан.
  if (settings?.auto_journal !== false && totalCost > 0) {
    const moveForJournal: MoveForJournal = {
      type: input.type,
      category_code: item.category_code as string,
      qty,
      total_cost: totalCost,
      vat_amount: vat,
      counter_account_id: input.counter_account_id,
    };
    const built = buildJournalLines(moveForJournal, toJournalSettings(settings));
    if (!built.ok) {
      // Журнал бичиж чадахгүй бол мөрийг устгаад алдаа буцаана.
      await supabase.from("inv_moves").delete().eq("id", moveId);
      return { ok: false, error: built.error };
    }
    const posted = await postJournal(supabase, {
      date: input.date,
      description: `${built.description} (${item.name})`,
      reference: input.doc_no || MOVE_DOC[input.type],
      partner_id: input.partner_id,
      source: "inventory",
      lines: built.lines,
    });
    if (!posted.ok) {
      await supabase.from("inv_moves").delete().eq("id", moveId);
      return { ok: false, error: posted.error };
    }
    await supabase
      .from("inv_moves")
      .update({ journal_id: posted.id })
      .eq("id", moveId);
  }

  revalidatePath("/inventory");
  revalidatePath("/journals");
  return { ok: true, id: moveId };
}

// ── Хөдөлгөөн устгах (холбоотой журнал хамт) ────────────────────────────────
export async function deleteMove(id: number): Promise<ActionResult> {
  const supabase = await requireAuth();
  const { data: mv } = await supabase
    .from("inv_moves")
    .select("id, journal_id")
    .eq("id", id)
    .single();
  if (!mv) return { ok: false, error: "Хөдөлгөөн олдсонгүй." };

  // Ажилтанд хариуцуулсан авлага үүсгэсэн бол: барагдсан бол устгахыг хориглоно.
  const { data: recs } = await supabase
    .from("staff_receivables")
    .select("id, recovered")
    .eq("source_move_id", id);
  for (const rec of recs ?? []) {
    if (Number(rec.recovered) > 0)
      return {
        ok: false,
        error:
          "Энэ хөдөлгөөнөөс үүссэн ажилчдын авлага цалингаас барагдсан тул устгах боломжгүй.",
      };
  }
  if (recs?.length)
    await supabase.from("staff_receivables").delete().eq("source_move_id", id);

  // Холбоотой журналыг бүрэн устгана. journal_entries (GL тусгал) нь FK-гүй тул
  // гараар устгана — эс бөгөөс гүйлгээ балансад орфан үлдэж дэд бүртгэлтэй зөрнө.
  if (mv.journal_id) {
    // journal_lines ба journal_entries хоёул journals-аас CASCADE устана.
    await supabase.from("journals").delete().eq("id", mv.journal_id);
  }

  const { error } = await supabase.from("inv_moves").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/inventory");
  revalidatePath("/journals");
  return { ok: true, id };
}

// ── Тооллого хадгалах: зөрүү бүрт тохируулга үүсгэх ─────────────────────────
export type CountInputRow = {
  item_id: number;
  counted_qty: number;
  resolution: "natural" | "staff";
  employee_id?: number | null; // staff дутагдалд хариуцах ажилтан
  employee_name?: string | null;
};

export async function saveCounts(
  date: string,
  company: string | null,
  rows: CountInputRow[],
): Promise<ActionResult> {
  const supabase = await requireAuth();
  if (!date) return { ok: false, error: "Огноо заавал шаардлагатай." };

  const settings = await loadSettings(supabase);
  let adjustments = 0;

  for (const row of rows) {
    const { data: item } = await supabase
      .from("inv_items")
      .select("id, category_code, name")
      .eq("id", row.item_id)
      .single();
    if (!item) continue;

    const fifo = await fifoLayers(supabase, row.item_id);
    const bookQty = r2(fifo.qtyRemaining);
    const counted = Number(row.counted_qty) || 0;
    const diff = r2(counted - bookQty);

    let moveId: number | null = null;

    if (Math.abs(diff) > 1e-6) {
      const isShortage = diff < 0;
      const adjQty = Math.abs(diff);
      const avgCost =
        fifo.qtyRemaining > 0 ? fifo.valueRemaining / fifo.qtyRemaining : 0;

      // Дутагдал → гарлага (count_adj); илүү → дотоод буцаалт (return_in).
      const type: MoveType = isShortage ? "count_adj" : "return_in";
      let unitCost = r2(avgCost);
      let totalCost: number;
      if (isShortage) {
        const f = fifoIssueCost(fifo.layers, adjQty);
        unitCost = r2(f.unitCost);
        totalCost = r2(f.totalCost);
      } else {
        totalCost = r2(adjQty * unitCost);
      }

      // Дансны тал: дутагдал → байгалийн хорогдол эсвэл ажилтны авлага.
      const counter = isShortage
        ? row.resolution === "staff"
          ? settings?.staff_receivable_account_id ?? null
          : settings?.shortage_expense_account_id ?? null
        : settings?.shortage_expense_account_id ?? null;

      const { data: mv, error: mvErr } = await supabase
        .from("inv_moves")
        .insert({
          date,
          type,
          item_id: row.item_id,
          qty: adjQty,
          unit_cost: unitCost,
          total_cost: totalCost,
          vat_amount: 0,
          counter_account_id: counter,
          doc_no: MOVE_DOC.count_adj,
          company,
          note: isShortage ? "Тооллогын дутагдал" : "Тооллогын илүүдэл",
        })
        .select("id")
        .single();
      if (mvErr) return { ok: false, error: mvErr.message };
      moveId = mv.id as number;

      let chargeJournalId: number | null = null;
      if (settings?.auto_journal !== false && totalCost > 0) {
        const built = buildJournalLines(
          {
            type,
            category_code: item.category_code as string,
            qty: adjQty,
            total_cost: totalCost,
            vat_amount: 0,
            counter_account_id: counter,
          },
          toJournalSettings(settings),
        );
        if (built.ok) {
          const posted = await postJournal(supabase, {
            date,
            description: `${built.description} (${item.name})`,
            reference: MOVE_DOC.count_adj,
            partner_id: null,
            source: "inventory",
            lines: built.lines,
          });
          if (posted.ok) {
            chargeJournalId = posted.id;
            await supabase
              .from("inv_moves")
              .update({ journal_id: posted.id })
              .eq("id", moveId);
          }
        }
      }

      // Ажилтанд хариуцуулсан дутагдал → ажилчдын авлага бүртгэнэ (цалингаас суутгана).
      if (isShortage && row.resolution === "staff" && row.employee_id) {
        await supabase.from("staff_receivables").insert({
          employee_id: row.employee_id,
          employee_name: row.employee_name ?? null,
          date,
          description: `Тооллогын дутагдал — ${item.name}`,
          amount: totalCost,
          recovered: 0,
          status: "open",
          source: "inventory",
          source_move_id: moveId,
          charge_journal_id: chargeJournalId,
          company,
        });
      }
      adjustments++;
    }

    await supabase.from("inv_counts").insert({
      date,
      item_id: row.item_id,
      book_qty: bookQty,
      counted_qty: counted,
      resolution: row.resolution,
      company,
      move_id: moveId,
    });
  }

  revalidatePath("/inventory");
  revalidatePath("/journals");
  return { ok: true, id: adjustments };
}

// ── Тохиргоо хадгалах ────────────────────────────────────────────────────────
export async function saveSettings(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAuth();

  const accId = (k: string): number | null => {
    const n = num(formData.get(k));
    return n > 0 ? n : null;
  };

  // Ангилал → данс (cat_<code>).
  const categoryAccounts: Record<string, number | null> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("cat_")) {
      const code = k.slice(4);
      const n = Number(String(v).replace(/[, ]/g, ""));
      categoryAccounts[code] = Number.isFinite(n) && n > 0 ? n : null;
    }
  }

  const { error } = await supabase.from("inv_settings").upsert(
    {
      id: 1,
      category_accounts: categoryAccounts,
      ap_account_id: accId("ap_account_id"),
      vat_account_id: accId("vat_account_id"),
      cash_account_id: accId("cash_account_id"),
      bank_account_id: accId("bank_account_id"),
      shortage_expense_account_id: accId("shortage_expense_account_id"),
      staff_receivable_account_id: accId("staff_receivable_account_id"),
      salary_payable_account_id: accId("salary_payable_account_id"),
      auto_journal: formData.get("auto_journal") === "on",
      cost_method: formData.get("cost_method") === "average" ? "average" : "fifo",
    },
    { onConflict: "id" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory");
  return { ok: true, id: 1 };
}
