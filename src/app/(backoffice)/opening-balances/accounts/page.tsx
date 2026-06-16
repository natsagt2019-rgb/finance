import { createClient } from "@/lib/supabase/server";
import { OpeningClient, type Acct } from "./opening-client";
import { OpeningTabs } from "../opening-tabs";
import {
  OPENING_SOURCES,
  OPENING_YEARS,
  grandOpeningBalance,
  openDateFor,
  resolveYear,
} from "../shared";

type SearchParams = { year?: string };

const DEBIT_TYPES = new Set(["asset", "expense"]);

export default async function OpeningAccountsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const year = resolveYear(sp.year);
  const openDate = openDateFor(year);

  // Идэвхтэй данс (баланс + P&L бүгд — ихэнх нь хоосон үлдэнэ).
  const { data: accRows } = await supabase
    .from("accounts")
    .select("code, name, type")
    .eq("is_active", true)
    .order("code")
    .limit(5000);
  const accounts = (accRows as Acct[] | null) ?? [];
  const typeOf = new Map(accounts.map((a) => [a.code, a.type]));

  // Тухайн огнооны ГАР оруулсан эхний үлдэгдэл (source='opening').
  // Дэд дэвтрийн (харилцагч/хөрөнгө/бараа) source-ыг энд оруулахгүй —
  // тэдгээр нь өөрийн таб дээр засагдана.
  const { data: opRows } = await supabase
    .from("journal_entries")
    .select("debit_code, credit_code, amount")
    .eq("is_opening", true)
    .eq("txn_date", openDate)
    .eq("source", OPENING_SOURCES.accounts)
    .limit(5000);

  const initial: Record<string, number> = {};
  for (const r of (opRows as
    | { debit_code: string | null; credit_code: string | null; amount: number }[]
    | null) ?? []) {
    const code = r.debit_code ?? r.credit_code;
    if (!code) continue;
    const dp = r.debit_code ? Number(r.amount) : -Number(r.amount); // debit-positive
    const natural = DEBIT_TYPES.has(typeOf.get(code) ?? "") ? dp : -dp;
    initial[code] = (initial[code] ?? 0) + natural;
  }

  const balance = await grandOpeningBalance(openDate);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Эхний үлдэгдэл</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Тайлант оны эхэнд (өмнөх оны 12-31) данс бүрийн үлдэгдэл. Зөвхөн дүн бичнэ
        — Дт/Кт автомат. Журналд <code>is_opening</code> бичилт болж бүх тайлангийн
        эхлэл цэг болно.
      </p>

      <div className="mt-5">
        <OpeningTabs year={year} years={OPENING_YEARS} balance={balance} />
      </div>

      <div className="mt-5">
        <OpeningClient accounts={accounts} initial={initial} year={year} />
      </div>
    </div>
  );
}
