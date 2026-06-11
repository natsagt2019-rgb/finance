"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { mirrorToLedger } from "@/lib/post-journal";
import {
  buildFxJournalLines,
  computeFxLine,
  round2,
  type FxLineForJournal,
} from "@/lib/fx-calc";
import { fetchMongolbankRates } from "@/lib/mongolbank";
import type { FxLineInput } from "./types";

// ── Монголбанкны ханш татах (тухайн огноогоор) ───────────────────────────────
export async function fetchRates(date: string): Promise<
  | { ok: true; rateDate: string; rates: Record<string, number> }
  | { ok: false; error: string }
> {
  if (!date) return { ok: false, error: "Огноо заавал шаардлагатай." };
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

export type ActionResult =
  | { ok: true; id: number; number: string; gain: number; loss: number }
  | { ok: false; error: string };

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

type SC = Awaited<ReturnType<typeof createClient>>;

// Дараагийн журналын дугаар: GL-000001 (journals/actions.ts-тэй ижил).
async function nextNumber(supabase: SC): Promise<string> {
  const { count } = await supabase
    .from("journals")
    .select("id", { count: "exact", head: true });
  return `GL-${String((count ?? 0) + 1).padStart(6, "0")}`;
}

// Олз/гарзын дансыг нэрээр олно (COA хувилбар бүрт код өөр тул hardcode хийхгүй).
//   олз  → type=income,  нэр "ханш" + ("олз" | "ашиг")
//   гарз → type=expense, нэр "ханш" + ("гарз" | "алдагдал")
async function findFxAccounts(
  supabase: SC,
): Promise<
  | { ok: true; gainId: number; lossId: number }
  | { ok: false; error: string }
> {
  const { data } = await supabase
    .from("accounts")
    .select("id, code, name, type")
    .eq("is_active", true)
    .ilike("name", "%ханш%")
    .limit(200);

  const rows =
    (data as { id: number; code: string; name: string; type: string }[] | null) ??
    [];
  const norm = (s: string) => s.toLowerCase();
  const gain = rows.find(
    (r) =>
      r.type === "income" &&
      (norm(r.name).includes("олз") || norm(r.name).includes("ашиг")),
  );
  const loss = rows.find(
    (r) =>
      r.type === "expense" &&
      (norm(r.name).includes("гарз") || norm(r.name).includes("алдагдал")),
  );

  if (!gain || !loss) {
    return {
      ok: false,
      error:
        "Ханшийн олз/гарзын данс олдсонгүй. Дансны төлөвлөгөөнд «Ханшийн олз» " +
        "(орлого) ба «Ханшийн гарз» (зардал) дансыг үүсгэнэ үү.",
    };
  }
  return { ok: true, gainId: gain.id, lossId: loss.id };
}

// ── Тэгшитгэл хийх: журнал + fx_revaluation(_lines) үүсгэх ────────────────────
export async function createRevaluation(input: {
  date: string;
  description: string;
  status: "draft" | "posted";
  lines: FxLineInput[];
}): Promise<ActionResult> {
  const supabase = await requireAuth();

  if (!input.date) return { ok: false, error: "Огноо заавал шаардлагатай." };

  // Зөрүү тооцоод, тэгээс ялгаатай мөрүүдийг л авна.
  const computed = input.lines
    .filter((l) => l.account_id != null && Number(l.rate) > 0)
    .map((l) => {
      const r = computeFxLine({
        bookBalance: l.book_balance,
        fxBalance: l.fx_balance,
        rate: l.rate,
        nature: l.nature,
        type: l.type,
      });
      return { in: l, ...r };
    })
    .filter((l) => l.diff !== 0);

  if (computed.length === 0)
    return {
      ok: false,
      error: "Тэгшитгэх зөрүү алга (ханш оруулсан эсэх, зөрүүтэй эсэхээ шалгана уу).",
    };

  const fx = await findFxAccounts(supabase);
  if (!fx.ok) return fx;

  const forJournal: FxLineForJournal[] = computed.map((l) => ({
    account_id: l.in.account_id,
    account_code: l.in.account_code,
    diff: l.diff,
  }));
  const jLines = buildFxJournalLines(forJournal, fx.gainId, fx.lossId);

  const totalDebit = round2(jLines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(jLines.reduce((s, l) => s + l.credit, 0));
  if (totalDebit !== totalCredit)
    return {
      ok: false,
      error: `Журнал баланслахгүй байна (Дт ${totalDebit} ≠ Кт ${totalCredit}).`,
    };

  const totalGain = round2(computed.reduce((s, l) => s + l.gain, 0));
  const totalLoss = round2(computed.reduce((s, l) => s + l.loss, 0));

  // 1) Журнал толгой
  const number = await nextNumber(supabase);
  const { data: jrn, error: e1 } = await supabase
    .from("journals")
    .insert({
      date: input.date,
      number,
      description:
        input.description.trim() || `Ханшийн тэгшитгэл — ${input.date}`,
      reference: null,
      status: input.status,
      source: "fx",
      partner_id: null,
      total_amount: totalDebit,
    })
    .select("id, number")
    .single();

  if (e1) {
    const msg = /duplicate|unique/i.test(e1.message)
      ? "Журналын дугаар давхцлаа, дахин оролдоно уу."
      : e1.message;
    return { ok: false, error: msg };
  }
  const journalId = jrn.id as number;

  // 2) Журналын мөрүүд
  const dbLines = jLines.map((l, i) => ({
    journal_id: journalId,
    account_id: l.account_id,
    debit: l.debit,
    credit: l.credit,
    description: l.description,
    line_no: i + 1,
  }));
  const { error: e2 } = await supabase.from("journal_lines").insert(dbLines);
  if (e2) {
    await supabase.from("journals").delete().eq("id", journalId);
    return { ok: false, error: `Журналын мөр хадгалахад алдаа: ${e2.message}` };
  }

  // 3) Тэгшитгэлийн толгой
  const { data: rev, error: e3 } = await supabase
    .from("fx_revaluations")
    .insert({
      reval_date: input.date,
      description: input.description.trim() || null,
      journal_id: journalId,
      total_gain: totalGain,
      total_loss: totalLoss,
    })
    .select("id")
    .single();
  if (e3) {
    await supabase.from("journals").delete().eq("id", journalId);
    return { ok: false, error: `Тэгшитгэл хадгалахад алдаа: ${e3.message}` };
  }
  const revId = rev.id as number;

  // 4) Тэгшитгэлийн мөрүүд
  const revLines = computed.map((l) => ({
    reval_id: revId,
    account_id: l.in.account_id,
    account_code: l.in.account_code,
    account_name: l.in.account_name,
    currency: l.in.currency,
    book_balance: round2(l.in.book_balance),
    fx_balance: round2(l.in.fx_balance),
    rate: l.in.rate,
    revalued: l.revalued,
    diff: l.diff,
  }));
  const { error: e4 } = await supabase
    .from("fx_revaluation_lines")
    .insert(revLines);
  if (e4) {
    // Мөр орохгүй бол толгой+журналыг буцаана.
    await supabase.from("fx_revaluations").delete().eq("id", revId);
    await supabase.from("journals").delete().eq("id", journalId);
    return { ok: false, error: `Тэгшитгэлийн мөр хадгалахад алдаа: ${e4.message}` };
  }

  // Posted тэгшитгэлийг тайлангийн эх сурвалж руу тусгана.
  if (input.status === "posted") {
    const mir = await mirrorToLedger(supabase, {
      date: input.date,
      description:
        input.description.trim() || `Ханшийн тэгшитгэл — ${input.date}`,
      source: "fx",
      journalId,
      lines: jLines.map((l) => ({
        account_id: l.account_id,
        debit: l.debit,
        credit: l.credit,
      })),
    });
    if (!mir.ok) {
      await supabase.from("fx_revaluation_lines").delete().eq("reval_id", revId);
      await supabase.from("fx_revaluations").delete().eq("id", revId);
      await supabase.from("journals").delete().eq("id", journalId);
      return { ok: false, error: `Тайланд тусгахад алдаа: ${mir.error}` };
    }
  }

  revalidatePath("/reports/fx-revaluation");
  revalidatePath("/journals");
  return {
    ok: true,
    id: journalId,
    number: jrn.number as string,
    gain: totalGain,
    loss: totalLoss,
  };
}
