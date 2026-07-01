// Журналаас (огнооны мужаар) санхүүгийн тайлангийн fs_line үлдэгдэл.
// trial_balance_range(d_from,d_to) RPC + accounts.fs_line-ийг нэгтгэнэ.
//
// Хоёр төрлийн map буцаана:
//  - bs: баланс (СБТ) — хуримтлагдсан үлдэгдэл (opening=мужийн өмнө, closing=мужийн эцэс)
//  - is: орлогын тайлан (ОДТ) — мужийн гүйлгээ (closing=turnover, opening=0)

import type { createClient } from "@/lib/supabase/server";
import type { FsBalanceMap } from "@/lib/fs-report";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Тухайн жилд тайланг журналаас гаргаж болох эсэхийг шалгана.
// 1) Жилийн бодит гүйлгээ (is_opening=false) байвал → журналаас.
// 2) Өмнөх оны эхний үлдэгдэл (is_opening=true) байвал → журналаас
//    (trial_balance_range-д opening баганад харагдана).
// Аль нь ч байхгүй бол → fs_line_balances snapshot руу буцна.
export async function journalHasYear(
  supabase: SupabaseClient,
  year: number,
): Promise<boolean> {
  // 1. Жилийн бодит гүйлгээ шалгана.
  const { count: txn } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .gte("txn_date", `${year}-01-01`)
    .lte("txn_date", `${year}-12-31`)
    .eq("is_opening", false);
  if ((txn ?? 0) > 0) return true;

  // 2. Өмнөх оны эхний үлдэгдэл шалгана (trial_balance opening баганад орно).
  const { count: open } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .gte("txn_date", `${year - 1}-01-01`)
    .lte("txn_date", `${year}-01-01`)
    .eq("is_opening", true);
  return (open ?? 0) > 0;
}

// Тайланд сонгох боломжит онууд: trial_balances (snapshot) + журналын
// бодит гүйлгээтэй онуудын нэгдэл. Эхний-үлдэгдэл-зөвхөн он (2024) орохгүй.
export async function reportYears(
  supabase: SupabaseClient,
): Promise<number[]> {
  const [{ data: tb }, { data: jb }] = await Promise.all([
    supabase.from("trial_balances").select("year"),
    supabase.from("journal_account_balances").select("year"),
  ]);
  const cand = new Set<number>(
    ((tb as { year: number }[] | null) ?? []).map((r) => r.year).filter(Boolean),
  );
  const jbYears = [
    ...new Set(
      ((jb as { year: number }[] | null) ?? []).map((r) => r.year).filter(Boolean),
    ),
  ];
  for (const y of jbYears) {
    if (cand.has(y)) continue;
    if (await journalHasYear(supabase, y)) cand.add(y);
  }
  return [...cand].sort((a, b) => b - a);
}

// Дансны кодоор fs_line-г таньдаг fallback — accounts.fs_line NULL байвал ашиглана.
// 6 оронтой кодыг тоон мужаар шалгана → regex-ийн алдаагаас илүү найдвартай.
function inferFsLine(code: string): string | null {
  const n = parseInt(code.slice(0, 6), 10);
  if (isNaN(n)) return null;

  // ── 1.1 Эргэлтийн хөрөнгө ──────────────────────────────────────────────
  // Мөнгө: 10xxxx (касс), 110xxx (банкны данс), 111xxx
  if ((n >= 100000 && n <= 110999) || (n >= 111000 && n <= 111999))
    return "СБТ 1.1.1 Мөнгө, түүнтэй адилтгах хөрөнгө";
  // Дансны авлага: 120100-120199, 130000-130199 (130000 = ерөнхий авлага)
  if ((n >= 120100 && n <= 120199) || (n >= 130000 && n <= 130199))
    return "СБТ 1.1.2 Дансны авлага";
  // Татвар, НДШ: 120200-120599, 130500-130699
  if ((n >= 120200 && n <= 120599) || (n >= 130500 && n <= 130699))
    return "СБТ 1.1.3 Татвар, НДШ-ийн авлага";
  // Бусад авлага: 120600-120999, 130200-130499, 130700-130999
  if (
    (n >= 120600 && n <= 120999) ||
    (n >= 130200 && n <= 130499) ||
    (n >= 130700 && n <= 130999)
  )
    return "СБТ 1.1.4 Бусад авлага";
  // Санхүүгийн хөрөнгө (богино хуг. хөрөнгө оруулалт): 120000-120099
  if (n >= 120000 && n <= 120099)
    return "СБТ 1.1.5 Бусад санхүүгийн хөрөнгө";
  // Бараа материал: 140000-159999 (хуучин 14xxxx + шинэ 15xxxx)
  if (n >= 140000 && n <= 159999)
    return "СБТ 1.1.6 Бараа материал";
  // Урьдчилж төлсөн: 180000-181999
  if (n >= 180000 && n <= 181999)
    return "СБТ 1.1.7 Урьдчилж төлсөн зардал/тооцоо";
  // Бусад эргэлтийн хөрөнгө: 182000-189999
  if (n >= 182000 && n <= 189999)
    return "СБТ 1.1.8 Бусад эргэлтийн хөрөнгө";

  // ── 1.2 Эргэлтийн бус хөрөнгө ──────────────────────────────────────────
  // Биет бус хөрөнгө: 160500-160599, 201000-201099
  if ((n >= 160500 && n <= 160599) || (n >= 201000 && n <= 201099))
    return "СБТ 1.2.2 Биет бус хөрөнгө";
  // Үндсэн хөрөнгө: 160100-160499, 160600-160899, 200000-200999, 201100-209999
  if (
    (n >= 160100 && n <= 160499) ||
    (n >= 160600 && n <= 160899) ||
    (n >= 200000 && n <= 200999) ||
    (n >= 201100 && n <= 209999)
  )
    return "СБТ 1.2.1 Үндсэн хөрөнгө";

  // ── 2.1 Богино хугацаат өр төлбөр ──────────────────────────────────────
  if (n >= 310100 && n <= 310199) return "СБТ 2.1.1.1 Дансны өглөг";
  if (n >= 310200 && n <= 310299) return "СБТ 2.1.1.2 Цалингийн өглөг";
  if (
    (n >= 310300 && n <= 310499) ||
    (n >= 310600 && n <= 310799) ||
    (n >= 310900 && n <= 310999) ||
    n === 311301 ||
    (n >= 320300 && n <= 320399) || // ХХОАТ болон бусад суутгалын татварын өглөг
    (n >= 330100 && n <= 330299)
  )
    return "СБТ 2.1.1.3 Татварын өр";
  if ((n >= 310500 && n <= 310599) || (n >= 320200 && n <= 320299))
    return "СБТ 2.1.1.4 НДШ-ийн өглөг";
  if (n >= 311000 && n <= 311099) return "СБТ 2.1.1.5 Богино хугацаат зээл";
  if (n >= 310800 && n <= 310899) return "СБТ 2.1.1.6 Хүүний өглөг";
  if (n >= 311200 && n <= 311299) return "СБТ 2.1.1.7 Ногдол ашгийн өглөг";
  if (n >= 320100 && n <= 320199) return "СБТ 2.1.1.8 Урьдчилж орсон орлого";
  if (n >= 311100 && n <= 311199)
    return "СБТ 2.1.1.10 Бусад богино хугацаат өр төлбөр";
  // ── 2.1.2 Урт хугацаат өр төлбөр ───────────────────────────────────────
  if (n === 320102 || (n >= 321000 && n <= 329999))
    return "СБТ 2.1.2.1 Урт хугацаат зээл";
  if (n >= 340000 && n <= 349999)
    return "СБТ 2.1.2.4 Бусад урт хугацаат өр төлбөр";
  // ── 2.3 Өмч ─────────────────────────────────────────────────────────────
  if (n >= 410000 && n <= 410999) return "СБТ 2.3.1 Өмч";
  if (n >= 420000 && n <= 420999) return "СБТ 2.3.6 Эздийн өмчийн бусад хэсэг";
  if (n >= 430000 && n <= 439999) return "СБТ 2.3.7 Хуримтлагдсан ашиг";

  return null;
}

export async function fsBalancesFromJournal(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<{ bs: FsBalanceMap; is: FsBalanceMap; rowCount: number }> {
  // bs (баланс): хуримтлагдсан үлдэгдэл — ХААЛТ ОРНО (430101 хуримтлагдсан ашиг).
  const { data: rpcRows } = await supabase.rpc("trial_balance_range", {
    d_from: from,
    d_to: to,
  });
  const rows =
    (rpcRows as
      | { code: string; opening: number | null; closing: number | null }[]
      | null) ?? [];

  // is (орлогын тайлан): мужийн эргэлт — ХААЛТЫГ ХАСНА (жилийн хаалтын
  // бичилт P&L-г тэглэдэг тул орлого/зардлыг бохир дүнгээр харуулна).
  const { data: pnlRows } = await supabase.rpc("pnl_range", {
    d_from: from,
    d_to: to,
  });

  const { data: meta } = await supabase
    .from("accounts")
    .select("code, fs_line")
    .eq("is_active", true)
    .limit(5000);
  const fsByCode = new Map<string, string>();
  for (const m of (meta as { code: string; fs_line: string | null }[] | null) ?? []) {
    const fs = m.fs_line ?? inferFsLine(m.code);
    if (fs) fsByCode.set(m.code, fs);
  }

  const bs: FsBalanceMap = new Map();
  const is: FsBalanceMap = new Map();
  for (const r of rows) {
    const fs = fsByCode.get(r.code) ?? inferFsLine(r.code);
    if (!fs) continue;
    const b = bs.get(fs) ?? { opening: 0, closing: 0 };
    b.opening += Number(r.opening) || 0;
    b.closing += Number(r.closing) || 0;
    bs.set(fs, b);
  }
  for (const p of (pnlRows as { code: string; turnover: number | null }[] | null) ?? []) {
    const fs = fsByCode.get(p.code) ?? inferFsLine(p.code);
    if (!fs) continue;
    const i = is.get(fs) ?? { opening: 0, closing: 0 };
    i.closing += Number(p.turnover) || 0; // debit-positive эргэлт
    is.set(fs, i);
  }

  return { bs, is, rowCount: rows.length };
}
