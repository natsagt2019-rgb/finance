// ============================================================
// Банкны гүйлгээ (transactions) → journal_entries постингийн төлөв.
// ============================================================
// Баланс / Гүйлгээ баланс / Ерөнхий данс хуудсанд "хуулга балансад зөв тусаж
// байна уу"-г шалгахад ашиглана. Хоёр цоорхойг илрүүлнэ:
//   1) uncoded — Дт/Кт холболтгүй тул журналд орох БОЛОМЖГҮЙ гүйлгээ
//      (касс/харилцахын GL үлдэгдэл хуулгаас дутуу гарна).
//   2) stale   — кодлогдсон гүйлгээ ба бичигдсэн журнал зөрсөн (postBankJournal-ыг
//      дахин ажиллуулаагүй). Зөвхөн ТОО харьцуулбал код дан ганц өөрчлөгдсөнийг
//      барьдаггүй тул огноо/Дт/Кт/дүнгээр АГУУЛГЫГ харьцуулна.
// ============================================================

import type { createClient } from "@/lib/supabase/server";
import {
  buildBankJournalRows,
  postingPrefix,
  type PostingTxn,
} from "@/lib/bank-journal-posting";

type Supa = Awaited<ReturnType<typeof createClient>>;

export type BankJournalStatus = {
  candidate: number; // тухайн оны мөнгөн дүнтэй банкны гүйлгээ
  uncoded: number; // Дт эсвэл Кт код дутуу — журналд орох боломжгүй
  postable: number; // хоёр тал бүрэн — журналд орох ёстой
  posted: number; // journal_entries дэх CASH{yy}: мөрийн тоо
  stale: boolean; // журнал ≠ кодлогдсон гүйлгээ → дахин бичих шаардлагатай
};

async function headCount(
  q: PromiseLike<{ count: number | null }>,
): Promise<number> {
  const { count } = await q;
  return count ?? 0;
}

// PostgREST нэг хүсэлтэд 1000 мөр л буцаадаг тул .range()-ээр бүрэн татна.
async function fetchAllRange<T>(
  build: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; from < 1_000_000; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) break;
    const rows = (data as T[] | null) ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

// (огноо|Дт|Кт|дүн)-ийн эрэмбэлсэн гарын үсэг — хоёр багц ижил эсэхийг харьцуулна.
function signature(
  rows: {
    txn_date: string;
    debit_code: string;
    credit_code: string;
    amount: number;
  }[],
): string {
  return rows
    .map(
      (r) =>
        `${(r.txn_date || "").slice(0, 10)}|${r.debit_code}|${r.credit_code}|${Math.round((Number(r.amount) || 0) * 100)}`,
    )
    .sort()
    .join("\n");
}

// Тухайн оны банкны постингийн төлвийг буцаана.
export async function bankJournalStatus(
  supabase: Supa,
  year: number,
): Promise<BankJournalStatus> {
  // Мөнгөн дүнтэй (орлого эсвэл зарлага) тухайн оны гүйлгээ.
  const base = () =>
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("year", year)
      .or("income.gt.0,expense.gt.0");

  // Журналд орох боломжтой: Дт ба Кт код хоёулаа бөглөгдсөн (null биш, хоосон биш).
  const [candidate, postable, posted] = await Promise.all([
    headCount(base()),
    headCount(
      base()
        .not("debit_code", "is", null)
        .neq("debit_code", "")
        .not("credit_code", "is", null)
        .neq("credit_code", ""),
    ),
    headCount(
      supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .like("description", `${postingPrefix(year)}%`),
    ),
  ]);

  const uncoded = Math.max(0, candidate - postable);

  // ── Агуулгад суурилсан stale шалгалт ───────────────────────────────────────
  // Одоогийн кодоор постлогдох ЁСТОЙ мөрүүд (postBankJournal-той ижил дүрэм:
  // journal_id хоосон гүйлгээнээс buildBankJournalRows).
  const txns = await fetchAllRange<PostingTxn>((from, to) =>
    supabase
      .from("transactions")
      .select(
        "txn_date, description, master_code, master_name, income, expense, income_code, expense_code, account_id, exchange_rate, debit_code, credit_code",
      )
      .eq("year", year)
      .is("journal_id", null)
      .order("txn_date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
  const wouldBe = buildBankJournalRows(txns, year).rows.map((r) => ({
    txn_date: r.txn_date,
    debit_code: r.debit_code,
    credit_code: r.credit_code,
    amount: r.amount,
  }));

  // Бодит бичигдсэн журнал (CASH{yy}:).
  const actualRaw = await fetchAllRange<{
    txn_date: string;
    debit_code: string | null;
    credit_code: string | null;
    amount: number;
  }>((from, to) =>
    supabase
      .from("journal_entries")
      .select("txn_date, debit_code, credit_code, amount")
      .like("description", `${postingPrefix(year)}%`)
      .range(from, to),
  );
  const actual = actualRaw.map((r) => ({
    txn_date: r.txn_date,
    debit_code: r.debit_code ?? "",
    credit_code: r.credit_code ?? "",
    amount: Number(r.amount) || 0,
  }));

  // Тоо зөрсөн ЭСВЭЛ агуулга (код/дүн) зөрсөн бол хуучирсан.
  const stale = postable !== posted || signature(wouldBe) !== signature(actual);

  return { candidate, uncoded, postable, posted, stale };
}
