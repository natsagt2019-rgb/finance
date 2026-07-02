"use server";

import { revalidatePath } from "next/cache";
import * as xlsx from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { fetchMongolbankRates } from "@/lib/mongolbank";
import { OPENING_SOURCES, openDateFor } from "../shared";

// ── Монголбанкны ханш татах (эхний үлдэгдлийн огноогоор = (Y-1)-12-31) ────────
// Валютын дансуудын эхний ₮ дүнг «валютын дүн × ханш»-аар бодоход туслана.
export async function fetchOpeningRates(year: number): Promise<
  | { ok: true; rateDate: string; rates: Record<string, number> }
  | { ok: false; error: string }
> {
  const date = openDateFor(year);
  try {
    const r = await fetchMongolbankRates(date);
    if (!r || Object.keys(r.rates).length === 0)
      return { ok: false, error: "Монголбанкны ханш татаж чадсангүй." };
    return { ok: true, rateDate: r.rateDate, rates: r.rates };
  } catch (e) {
    return {
      ok: false,
      error: `Монголбанктай холбогдоход алдаа: ${(e as Error).message}`,
    };
  }
}

// Хөрөнгө/зардал = дебет шинж; өр/өмч/орлого = кредит шинж.
const DEBIT_TYPES = new Set(["asset", "expense"]);

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

export type OpenRow = { code: string; amount: number };

export type SaveResult =
  | { ok: true; count: number; date: string }
  | { ok: false; error: string };

// Дансны эхний үлдэгдлийг is_opening журнал (source='opening') болгож хадгална.
// Тэмдэг (Дт/Кт)-г дансны type-ээс автомат тогтооно. Дүн сөрөг бол эсрэг тал
// (контр данс, ж: хуримтлагдсан элэгдэл). Нийт тэнцлийг (бүх дэд дэвтэртэй
// хамт) UI шалгадаг тул энд дангаар нь тэнцэхийг шаардахгүй.
export async function saveOpeningBalances(
  year: number,
  rows: OpenRow[],
): Promise<SaveResult> {
  const supabase = await requireAuth();
  const date = openDateFor(year);

  const { data: accs } = await supabase.from("accounts").select("code, type");
  const typeOf = new Map<string, string>();
  for (const a of (accs as { code: string; type: string }[] | null) ?? [])
    typeOf.set(a.code, a.type);

  const entries: {
    txn_date: string;
    description: string;
    amount: number;
    debit_code: string | null;
    credit_code: string | null;
    is_opening: boolean;
    source: string;
  }[] = [];

  for (const r of rows) {
    const amt = r2(r.amount);
    if (Math.abs(amt) < 0.005) continue;
    const type = typeOf.get(r.code);
    if (!type) continue;
    const dp = DEBIT_TYPES.has(type) ? amt : -amt; // debit-positive дотоод
    if (Math.abs(dp) < 0.005) continue;
    entries.push({
      txn_date: date,
      description: "Эхний үлдэгдэл",
      amount: r2(Math.abs(dp)),
      debit_code: dp > 0 ? r.code : null,
      credit_code: dp < 0 ? r.code : null,
      is_opening: true,
      source: OPENING_SOURCES.accounts,
    });
  }

  // Тухайн огнооны хуучин ГАР оруулгыг солино (зөвхөн source='opening' —
  // дэд дэвтрийн source-уудыг хөндөхгүй). Idempotent.
  await supabase
    .from("journal_entries")
    .delete()
    .eq("is_opening", true)
    .eq("txn_date", date)
    .eq("source", OPENING_SOURCES.accounts);

  if (entries.length > 0) {
    const { error } = await supabase.from("journal_entries").insert(entries);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/opening-balances/accounts");
  revalidatePath("/opening-balances/financial-statement");
  return { ok: true, count: entries.length, date };
}

export type ImportResult =
  | { ok: true; rows: OpenRow[] }
  | { ok: false; error: string };

// Excel (загварын дагуу) → {code, amount}[]. "Код" ба "Эхний үлдэгдэл" багана.
export async function importOpeningExcel(formData: FormData): Promise<ImportResult> {
  await requireAuth();
  const file = formData.get("file");
  if (!file || typeof file === "string")
    return { ok: false, error: "Файл сонгоогүй байна." };
  try {
    const buf = Buffer.from(await (file as File).arrayBuffer());
    const wb = xlsx.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const grid = xlsx.utils.sheet_to_json<(string | number | null)[]>(ws, {
      header: 1,
      defval: null,
    });
    // Толгойн мөрийг олно (Код + Эхний үлдэгдэл).
    let codeCol = -1;
    let amtCol = -1;
    let dataStart = 0;
    for (let i = 0; i < Math.min(5, grid.length); i++) {
      const row = grid[i] ?? [];
      row.forEach((cell, j) => {
        const s = String(cell ?? "").trim().toLowerCase();
        if (s === "код") codeCol = j;
        if (s.includes("эхний")) amtCol = j;
      });
      if (codeCol >= 0 && amtCol >= 0) {
        dataStart = i + 1;
        break;
      }
    }
    if (codeCol < 0 || amtCol < 0)
      return { ok: false, error: "«Код» ба «Эхний үлдэгдэл» багана олдсонгүй. Загварыг ашиглана уу." };

    const out: OpenRow[] = [];
    for (let i = dataStart; i < grid.length; i++) {
      const row = grid[i] ?? [];
      const code = String(row[codeCol] ?? "").trim();
      const amount = Number(String(row[amtCol] ?? "").replace(/[, ]/g, ""));
      if (!code || !Number.isFinite(amount) || amount === 0) continue;
      out.push({ code, amount });
    }
    return { ok: true, rows: out };
  } catch (e) {
    return { ok: false, error: `Уншихад алдаа: ${(e as Error).message}` };
  }
}
