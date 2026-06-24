// ============================================================
// Банкны гүйлгээ (transactions) → journal_entries постингийн төлөв.
// ============================================================
// Баланс / Гүйлгээ баланс хуудсанд "хуулга балансад зөв тусаж байна уу"-г
// шалгахад ашиглана. Хоёр цоорхойг илрүүлнэ:
//   1) uncoded — Дт/Кт холболтгүй тул журналд орох БОЛОМЖГҮЙ гүйлгээ
//      (касс/харилцахын GL үлдэгдэл хуулгаас дутуу гарна).
//   2) stale   — кодлогдсон ч postBankJournal-ыг дахин ажиллуулаагүй тул
//      журналд бичигдээгүй гүйлгээ (баланс хуучирсан).
// ============================================================

import type { createClient } from "@/lib/supabase/server";
import { postingPrefix } from "@/lib/bank-journal-posting";

type Supa = Awaited<ReturnType<typeof createClient>>;

export type BankJournalStatus = {
  candidate: number; // тухайн оны мөнгөн дүнтэй банкны гүйлгээ
  uncoded: number; // Дт эсвэл Кт код дутуу — журналд орох боломжгүй
  postable: number; // хоёр тал бүрэн — журналд орох ёстой
  posted: number; // journal_entries дэх CASH{yy}: мөрийн тоо
  stale: boolean; // postable ≠ posted → дахин бичих шаардлагатай
};

async function headCount(
  q: PromiseLike<{ count: number | null }>,
): Promise<number> {
  const { count } = await q;
  return count ?? 0;
}

// Тухайн оны банкны постингийн төлвийг буцаана (хөнгөн count query-ууд).
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
  return { candidate, uncoded, postable, posted, stale: postable !== posted };
}
