// ============================================================
// Балансжсан журнал бичих shared туслах (server-only).
// ============================================================
// journals + journal_lines-д давхар бичилт оруулна. Σдебет = Σкредит шалгана.
// Модулиуд (inventory, salary settlement, ...) энэ функцийг дуудна — журнал
// бичих логикийн нэг эх сурвалж. journals/actions.ts-ийн гар форм тусдаа.
// ============================================================

import type { createClient } from "@/lib/supabase/server";
import type { LineInput } from "@/app/(backoffice)/journals/types";

type Supa = Awaited<ReturnType<typeof createClient>>;

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export type PostJournalResult =
  | { ok: true; id: number; number: string }
  | { ok: false; error: string };

// Дараагийн журналын дугаар: GL-000001 (одоо байгаа тооноос).
async function nextNumber(supabase: Supa): Promise<string> {
  const { count } = await supabase
    .from("journals")
    .select("id", { count: "exact", head: true });
  return `GL-${String((count ?? 0) + 1).padStart(6, "0")}`;
}

export async function postJournal(
  supabase: Supa,
  input: {
    date: string;
    description: string;
    reference: string | null;
    partner_id: number | null;
    source: string; // 'inventory' | 'salary' | ...
    lines: LineInput[];
    status?: "draft" | "posted";
  },
): Promise<PostJournalResult> {
  if (!input.date) return { ok: false, error: "Огноо заавал шаардлагатай." };

  const lines = input.lines
    .map((l) => ({
      account_id: l.account_id,
      debit: r2(l.debit),
      credit: r2(l.credit),
      description: (l.description ?? "").trim() || null,
    }))
    .filter((l) => l.account_id != null && (l.debit !== 0 || l.credit !== 0));

  if (lines.length < 2)
    return { ok: false, error: "Журналд дор хаяж 2 мөр шаардлагатай." };

  const totalDebit = r2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = r2(lines.reduce((s, l) => s + l.credit, 0));
  if (totalDebit !== totalCredit)
    return {
      ok: false,
      error: `Журнал баланслахгүй: дебет ${totalDebit} ≠ кредит ${totalCredit}.`,
    };
  if (totalDebit === 0) return { ok: false, error: "Нийт дүн 0 байна." };

  const number = await nextNumber(supabase);
  const { data: jrn, error: e1 } = await supabase
    .from("journals")
    .insert({
      date: input.date,
      number,
      description: input.description || null,
      reference: input.reference,
      status: input.status ?? "posted",
      source: input.source,
      partner_id: input.partner_id,
      total_amount: totalDebit,
    })
    .select("id, number")
    .single();
  if (e1) return { ok: false, error: e1.message };

  const journalId = jrn.id as number;
  const { error: e2 } = await supabase.from("journal_lines").insert(
    lines.map((l, i) => ({ ...l, journal_id: journalId, line_no: i + 1 })),
  );
  if (e2) {
    await supabase.from("journals").delete().eq("id", journalId);
    return { ok: false, error: `Журналын мөр: ${e2.message}` };
  }
  return { ok: true, id: journalId, number: jrn.number as string };
}
