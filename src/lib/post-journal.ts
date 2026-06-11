// ============================================================
// Балансжсан журнал бичих shared туслах (server-only).
// ============================================================
// journals + journal_lines-д давхар бичилт оруулна. Σдебет = Σкредит шалгана.
// Модулиуд (inventory, salary settlement, ...) энэ функцийг дуудна — журнал
// бичих логикийн нэг эх сурвалж. journals/actions.ts-ийн гар форм тусдаа.
//
// ТАЙЛАНГИЙН УЯЛДАА: postJournal нь posted журнал бүрийг тайлангийн эх сурвалж
// journal_entries рүү ТУСГАНА (mirrorToLedger). Ингэснээр модулиар оруулсан
// гүйлгээ /reports/* тайлангуудад шууд тусна. journals/journal_lines нь
// журналын баримтын (voucher) дэлгэрэнгүй, journal_entries нь ерөнхий дэвтэр (GL).
// ============================================================

import type { createClient } from "@/lib/supabase/server";
import type { LineInput } from "@/app/(backoffice)/journals/types";

type Supa = Awaited<ReturnType<typeof createClient>>;

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Тусгах мөрийн хөнгөн хэлбэр (description заавал биш).
type LedgerLine = { account_id: number | null; debit: number; credit: number };

// ── Posted журналыг journal_entries (GL, тайлангийн эх сурвалж) рүү тусгах ──
// Олон мөрт балансжсан журналыг accounts.code-оор Дт/Кт хос болгон задална
// (two-pointer). Данс бүрийн цэвэр нөлөө яг хадгалагдана. status='draft' бол
// дуудахгүй (ноорог тайланд тусахгүй).
export async function mirrorToLedger(
  supabase: Supa,
  opts: {
    date: string;
    description: string | null;
    partner_name?: string | null;
    source: string;
    journalId: number;
    lines: LedgerLine[];
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ids = [
    ...new Set(
      opts.lines
        .map((l) => l.account_id)
        .filter((x): x is number => x != null),
    ),
  ];
  if (ids.length === 0) return { ok: false, error: "Тусгах данс алга." };

  // account_id → accounts.code.
  const { data: accs, error: ae } = await supabase
    .from("accounts")
    .select("id, code")
    .in("id", ids);
  if (ae) return { ok: false, error: ae.message };
  const codeOf = new Map<number, string>();
  for (const a of (accs as { id: number; code: string }[] | null) ?? [])
    codeOf.set(a.id, a.code);
  for (const id of ids)
    if (!codeOf.has(id))
      return { ok: false, error: `Дансны код олдсонгүй (id=${id}).` };

  // Дт ба Кт талуудыг тусад нь цуглуулаад two-pointer-аар хос болгоно.
  const debits = opts.lines
    .filter((l) => l.account_id != null && r2(l.debit) > 0)
    .map((l) => ({ code: codeOf.get(l.account_id as number)!, amt: r2(l.debit) }));
  const credits = opts.lines
    .filter((l) => l.account_id != null && r2(l.credit) > 0)
    .map((l) => ({ code: codeOf.get(l.account_id as number)!, amt: r2(l.credit) }));

  const rows: { debit_code: string; credit_code: string; amount: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < debits.length && j < credits.length) {
    const amt = r2(Math.min(debits[i].amt, credits[j].amt));
    if (amt > 0)
      rows.push({
        debit_code: debits[i].code,
        credit_code: credits[j].code,
        amount: amt,
      });
    debits[i].amt = r2(debits[i].amt - amt);
    credits[j].amt = r2(credits[j].amt - amt);
    if (debits[i].amt <= 0.005) i++;
    if (credits[j].amt <= 0.005) j++;
  }
  if (rows.length === 0) return { ok: false, error: "Тусгах мөр алга." };

  const { error: ie } = await supabase.from("journal_entries").insert(
    rows.map((r) => ({
      txn_date: opts.date,
      description: opts.description,
      partner_name: opts.partner_name ?? null,
      amount: r.amount,
      debit_code: r.debit_code,
      credit_code: r.credit_code,
      cf_code: null,
      is_opening: false,
      source: opts.source,
      journal_id: opts.journalId,
    })),
  );
  if (ie) return { ok: false, error: ie.message };
  return { ok: true };
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

  // Posted журналыг тайлангийн эх сурвалж руу тусгана (draft бол тусгахгүй).
  if ((input.status ?? "posted") === "posted") {
    const mir = await mirrorToLedger(supabase, {
      date: input.date,
      description: input.description || null,
      source: input.source,
      journalId,
      lines,
    });
    if (!mir.ok) {
      await supabase.from("journal_lines").delete().eq("journal_id", journalId);
      await supabase.from("journals").delete().eq("id", journalId);
      return { ok: false, error: `Тайланд тусгахад алдаа: ${mir.error}` };
    }
  }
  return { ok: true, id: journalId, number: jrn.number as string };
}
