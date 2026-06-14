import { createClient } from "@/lib/supabase/server";
import { OpeningClient, type Acct } from "./opening-client";

type SearchParams = { year?: string };

const DEBIT_TYPES = new Set(["asset", "expense"]);

export default async function OpeningBalancesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const years = [2025, 2026, 2027];
  const year =
    sp.year && years.includes(Number(sp.year)) ? Number(sp.year) : 2025;
  const openDate = `${year - 1}-12-31`;

  // Идэвхтэй данс (баланс + P&L бүгд — ихэнх нь хоосон үлдэнэ).
  const { data: accRows } = await supabase
    .from("accounts")
    .select("code, name, type")
    .eq("is_active", true)
    .order("code")
    .limit(5000);
  const accounts = (accRows as Acct[] | null) ?? [];
  const typeOf = new Map(accounts.map((a) => [a.code, a.type]));

  // Тухайн огнооны одоо байгаа эхний үлдэгдэл (is_opening).
  const { data: opRows } = await supabase
    .from("journal_entries")
    .select("debit_code, credit_code, amount")
    .eq("is_opening", true)
    .eq("txn_date", openDate)
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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Эхний үлдэгдэл</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Тайлант оны эхэнд (өмнөх оны 12-31) данс бүрийн үлдэгдэл. Зөвхөн дүн бичнэ
        — Дт/Кт автомат. Зөрүү=0 болсон үед хадгална. Журналд <code>is_opening</code>{" "}
        бичилт болж бүх тайлангийн эхлэл цэг болно.
      </p>
      <div className="mt-6">
        <OpeningClient
          accounts={accounts}
          initial={initial}
          year={year}
          years={years}
        />
      </div>
    </div>
  );
}
