// ============================================================
// Эхний үлдэгдлийн модулийн дундын туслахууд (server-only).
// ============================================================
// Бүх дэд цэс (Дансны / Харилцагчийн / Үндсэн хөрөнгийн / Барааны) нь
// эхний үлдэгдлээ НЭГ газар — journal_entries (is_opening=true,
// txn_date=(Y-1)-12-31) — рүү бичнэ. Эх сурвалж бүр өөрийн `source`-той:
//   opening          — Дансны (гар оруулга)
//   opening-partner  — Харилцагчийн дэд дэвтэр
//   opening-asset    — Үндсэн хөрөнгө
//   opening-inventory— Бараа материал / хангамж
// Ингэснээр tab бүр зөвхөн өөрийн source-оо устгаж дахин бичнэ (idempotent),
// харин нийт Дт=Кт тэнцлийг БҮХ source дээгүүр шалгана.
// ============================================================

import { createClient } from "@/lib/supabase/server";

export const OPENING_SOURCES = {
  accounts: "opening",
  partners: "opening-partner",
  assets: "opening-asset",
  inventory: "opening-inventory",
} as const;

export const OPENING_YEARS = [2025, 2026, 2027];
export const DEFAULT_OPENING_YEAR = 2026;

// Тайлант он Y → эхний үлдэгдлийн огноо = (Y-1)-12-31.
export function openDateFor(year: number): string {
  return `${year - 1}-12-31`;
}

export function resolveYear(raw?: string): number {
  const y = Number(raw);
  return OPENING_YEARS.includes(y) ? y : DEFAULT_OPENING_YEAR;
}

export type GrandBalance = { dr: number; cr: number; diff: number; count: number };

// Тухайн огнооны БҮХ эхний үлдэгдэл (бүх source) дээрх нийт Дт/Кт.
// Мөр бүр нэг талтай (debit_code ЭСВЭЛ credit_code) тул шууд нэмж болно.
export async function grandOpeningBalance(date: string): Promise<GrandBalance> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("journal_entries")
    .select("debit_code, credit_code, amount")
    .eq("is_opening", true)
    .eq("txn_date", date)
    .limit(50000);

  let dr = 0;
  let cr = 0;
  const rows =
    (data as
      | { debit_code: string | null; credit_code: string | null; amount: number }[]
      | null) ?? [];
  for (const r of rows) {
    if (r.debit_code) dr += Number(r.amount) || 0;
    else if (r.credit_code) cr += Number(r.amount) || 0;
  }
  return { dr, cr, diff: dr - cr, count: rows.length };
}

export function fmtMoney(n: number): string {
  if (!n) return "0";
  return Math.round(n).toLocaleString("en-US");
}
