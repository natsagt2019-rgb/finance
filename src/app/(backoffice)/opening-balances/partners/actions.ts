"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { OPENING_SOURCES, openDateFor } from "../shared";

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

export type PartnerOpenRow = {
  name: string; // харилцагчийн нэр (тулгалтын түлхүүр)
  recv: number; // авлага (Дт)
  pay: number; // өглөг (Кт)
};

export type SavePartnerResult =
  | { ok: true; count: number; date: string }
  | { ok: false; error: string };

// Харилцагчийн эхний үлдэгдэл — авлага (Дт arCode) / өглөг (Кт apCode).
// source='opening-partner', partner_name-тэй (авлага/өглөгийн насжилт нэрээр
// уншдаг). Тухайн огнооны хуучин харилцагчийн эхлэлийг бүхэлд нь солино.
export async function savePartnerOpening(
  year: number,
  arCode: string,
  apCode: string,
  rows: PartnerOpenRow[],
): Promise<SavePartnerResult> {
  const supabase = await requireAuth();
  const date = openDateFor(year);

  if (!arCode || !apCode)
    return { ok: false, error: "Авлага ба өглөгийн данс сонгоно уу." };

  const entries: {
    txn_date: string;
    description: string;
    partner_name: string;
    amount: number;
    debit_code: string | null;
    credit_code: string | null;
    is_opening: boolean;
    source: string;
  }[] = [];

  for (const r of rows) {
    const name = (r.name ?? "").trim();
    if (!name) continue;
    const recv = r2(r.recv);
    const pay = r2(r.pay);
    // Тэмдэгтэй нь хадгална — сөрөг авлага/өглөг (кредит/дебет үлдэгдэл)
    // зөвшөөрөгдөнө. amount дээр DB check байхгүй тул сөрөг дүн зөв ажиллана.
    if (Math.abs(recv) >= 0.005)
      entries.push({
        txn_date: date,
        description: "Харилцагчийн эхний үлдэгдэл — авлага",
        partner_name: name,
        amount: recv,
        debit_code: arCode,
        credit_code: null,
        is_opening: true,
        source: OPENING_SOURCES.partners,
      });
    if (Math.abs(pay) >= 0.005)
      entries.push({
        txn_date: date,
        description: "Харилцагчийн эхний үлдэгдэл — өглөг",
        partner_name: name,
        amount: pay,
        debit_code: null,
        credit_code: apCode,
        is_opening: true,
        source: OPENING_SOURCES.partners,
      });
  }

  await supabase
    .from("journal_entries")
    .delete()
    .eq("is_opening", true)
    .eq("txn_date", date)
    .eq("source", OPENING_SOURCES.partners);

  if (entries.length > 0) {
    const { error } = await supabase.from("journal_entries").insert(entries);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/opening-balances/partners");
  revalidatePath("/opening-balances/financial-statement");
  return { ok: true, count: entries.length, date };
}
