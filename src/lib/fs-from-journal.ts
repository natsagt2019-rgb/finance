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
    if (m.fs_line) fsByCode.set(m.code, m.fs_line);
  }

  const bs: FsBalanceMap = new Map();
  const is: FsBalanceMap = new Map();
  for (const r of rows) {
    const fs = fsByCode.get(r.code);
    if (!fs) continue;
    const b = bs.get(fs) ?? { opening: 0, closing: 0 };
    b.opening += Number(r.opening) || 0;
    b.closing += Number(r.closing) || 0;
    bs.set(fs, b);
  }
  for (const p of (pnlRows as { code: string; turnover: number | null }[] | null) ?? []) {
    const fs = fsByCode.get(p.code);
    if (!fs) continue;
    const i = is.get(fs) ?? { opening: 0, closing: 0 };
    i.closing += Number(p.turnover) || 0; // debit-positive эргэлт
    is.set(fs, i);
  }

  return { bs, is, rowCount: rows.length };
}
