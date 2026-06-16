import { createClient } from "@/lib/supabase/server";
import { OpeningTabs } from "../opening-tabs";
import {
  OPENING_SOURCES,
  OPENING_YEARS,
  grandOpeningBalance,
  openDateFor,
  resolveYear,
} from "../shared";
import { PartnersClient, type AcctOpt } from "./partners-client";

type SearchParams = { year?: string };

export default async function OpeningPartnersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const year = resolveYear(sp.year);
  const openDate = openDateFor(year);

  const [{ data: partnerRows }, { data: accRows }, { data: opRows }, balance] =
    await Promise.all([
      supabase
        .from("partners")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(5000),
      supabase
        .from("accounts")
        .select("code, name, type")
        .eq("is_active", true)
        .order("code")
        .limit(5000),
      supabase
        .from("journal_entries")
        .select("partner_name, debit_code, credit_code, amount")
        .eq("is_opening", true)
        .eq("txn_date", openDate)
        .eq("source", OPENING_SOURCES.partners)
        .limit(20000),
      grandOpeningBalance(openDate),
    ]);

  const partners =
    (partnerRows as { id: number; name: string }[] | null) ?? [];
  const accounts =
    (accRows as { code: string; name: string; type: string }[] | null) ?? [];

  // Авлага (актив + "авлага") ба өглөг (өр + "өглөг") дансны сонголтууд.
  const arOptions: AcctOpt[] = accounts
    .filter((a) => a.type === "asset" && a.name.toLowerCase().includes("авлага"))
    .map((a) => ({ code: a.code, name: a.name }));
  const apOptions: AcctOpt[] = accounts
    .filter(
      (a) => a.type === "liability" && a.name.toLowerCase().includes("өглөг"),
    )
    .map((a) => ({ code: a.code, name: a.name }));

  // Одоо байгаа харилцагчийн эхлэлийг нэрээр нэгтгэнэ.
  const initial: Record<string, { recv: number; pay: number }> = {};
  let usedAr = "";
  let usedAp = "";
  for (const r of (opRows as
    | {
        partner_name: string | null;
        debit_code: string | null;
        credit_code: string | null;
        amount: number;
      }[]
    | null) ?? []) {
    const name = (r.partner_name ?? "").trim();
    if (!name) continue;
    const cur = initial[name] ?? { recv: 0, pay: 0 };
    if (r.debit_code) {
      cur.recv += Number(r.amount) || 0;
      usedAr = r.debit_code;
    } else if (r.credit_code) {
      cur.pay += Number(r.amount) || 0;
      usedAp = r.credit_code;
    }
    initial[name] = cur;
  }

  const defaultAr = usedAr || arOptions[0]?.code || "";
  const defaultAp = usedAp || apOptions[0]?.code || "";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">
        Харилцагчийн эхний үлдэгдэл
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Харилцагч тус бүрийн нээлтийн авлага (Дт) ба өглөг (Кт). Авлага/өглөгийн
        насжилтын тайлан эдгээрийг харилцагчийн нэрээр уншина.
      </p>

      <div className="mt-5">
        <OpeningTabs year={year} years={OPENING_YEARS} balance={balance} />
      </div>

      <div className="mt-5">
        <PartnersClient
          partners={partners}
          arOptions={arOptions}
          apOptions={apOptions}
          defaultAr={defaultAr}
          defaultAp={defaultAp}
          initial={initial}
          year={year}
        />
      </div>
    </div>
  );
}
