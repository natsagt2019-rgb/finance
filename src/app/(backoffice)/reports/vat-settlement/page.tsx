import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { VatClient, type VatRow } from "./client";

type SearchParams = { from?: string; to?: string };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function fmt(n: number): string {
  return n ? Math.round(n).toLocaleString("en-US") : "0";
}

export default async function VatSettlementPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const from = sp.from && ISO.test(sp.from) ? sp.from : "2026-01-01";
  const to = sp.to && ISO.test(sp.to) ? sp.to : "2026-12-31";

  const { data } = await supabase.rpc("vat_by_partner", { d_from: from, d_to: to });
  const rows = ((data as VatRow[] | null) ?? []).map((r) => ({
    partner: r.partner,
    output_vat: Number(r.output_vat) || 0,
    input_vat: Number(r.input_vat) || 0,
    txn_count: Number(r.txn_count) || 0,
  }));

  const totOut = rows.reduce((s, r) => s + r.output_vat, 0);
  const totIn = rows.reduce((s, r) => s + r.input_vat, 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            НӨАТ-ын тооцооны тайлан
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Харилцагч бүрийн борлуулалтын (output) ба худалдан авалтын (input) НӨАТ —
            журналаас, {from} → {to}.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <form method="get" className="flex items-end gap-2">
            <input type="date" name="from" defaultValue={from} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            <input type="date" name="to" defaultValue={to} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
              Харах
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Output НӨАТ (борлуулалт)</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-900">{fmt(totOut)}₮</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Input НӨАТ (худалдан авалт)</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-amber-900">{fmt(totIn)}₮</p>
        </div>
        <div className="rounded-2xl border border-zinc-300 bg-zinc-100 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">Улсад төлөх НӨАТ</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-900">{fmt(totOut - totIn)}₮</p>
        </div>
      </div>

      <VatClient rows={rows} />
    </div>
  );
}
