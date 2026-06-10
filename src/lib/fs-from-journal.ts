// Журналаас (огнооны мужаар) санхүүгийн тайлангийн fs_line үлдэгдэл.
// trial_balance_range(d_from,d_to) RPC + accounts.fs_line-ийг нэгтгэнэ.
//
// Хоёр төрлийн map буцаана:
//  - bs: баланс (СБТ) — хуримтлагдсан үлдэгдэл (opening=мужийн өмнө, closing=мужийн эцэс)
//  - is: орлогын тайлан (ОДТ) — мужийн гүйлгээ (closing=turnover, opening=0)

import type { createClient } from "@/lib/supabase/server";
import type { FsBalanceMap } from "@/lib/fs-report";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function fsBalancesFromJournal(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<{ bs: FsBalanceMap; is: FsBalanceMap; rowCount: number }> {
  const { data: rpcRows } = await supabase.rpc("trial_balance_range", {
    d_from: from,
    d_to: to,
  });
  const rows =
    (rpcRows as
      | { code: string; opening: number | null; closing: number | null }[]
      | null) ?? [];

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
    const opening = Number(r.opening) || 0;
    const closing = Number(r.closing) || 0;
    const turn = closing - opening; // мужийн гүйлгээ

    const b = bs.get(fs) ?? { opening: 0, closing: 0 };
    b.opening += opening;
    b.closing += closing;
    bs.set(fs, b);

    const i = is.get(fs) ?? { opening: 0, closing: 0 };
    i.closing += turn;
    is.set(fs, i);
  }

  return { bs, is, rowCount: rows.length };
}
