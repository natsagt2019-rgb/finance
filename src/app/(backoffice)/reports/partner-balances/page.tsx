import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { PartnerBalancesClient, type PB } from "./client";

type SearchParams = { to?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function PartnerBalancesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const to = sp.to && ISO.test(sp.to) ? sp.to : "2026-12-31";

  const { data } = await supabase.rpc("partner_balances", { d_to: to });
  const rows = ((data as PB[] | null) ?? []).map((r) => ({
    partner: r.partner,
    receivable: Number(r.receivable) || 0,
    payable: Number(r.payable) || 0,
    txn_count: Number(r.txn_count) || 0,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Харилцагчийн тооцооны товчоо
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Харилцагч тус бүрийн авлага ба өглөг (бүх холбогдох данс) — журналаас,{" "}
            {to} огнооны байдлаар.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <form method="get" className="flex items-end gap-2">
            <input type="date" name="to" defaultValue={to} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
              Харах
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      <PartnerBalancesClient rows={rows} />
    </div>
  );
}
