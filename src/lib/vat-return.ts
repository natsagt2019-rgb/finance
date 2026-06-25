// НӨАТ (Нэмэгдсэн өртгийн албан татвар) суутган төлөгчийн тайлан — TT-03а.
//
// Эрх зүйн суурь: НӨАТ-ын тухай хууль. Маягт TT-03а (ТЕГ).
// Эх өгөгдөл: vat_active view (eBarimt баримт) → vat_return_summary RPC.
//
// Бүтэц:
//   А. Борлуулалт (out): НӨАТ ногдох борлуулалт → цуглуулсан НӨАТ (мөр 25,26,31)
//   Б. Худалдан авалт (in): НӨАТ-тай худалдан авалт → хасагдах НӨАТ (мөр 33,42,49)
//   Г. Нэгтгэл: төлбөл зохих (мөр 56) − буцаан авах (мөр 57) = цэвэр НӨАТ

import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export const VAT_RATE = 0.1; // НӨАТ 10%

export type VatReturn = {
  outTaxableBase: number; // НӨАТ ногдох борлуулалтын орлого (НӨАТ-гүй)
  outExemptBase: number; // чөлөөлөгдөх борлуулалт
  outVat: number; // цуглуулсан НӨАТ
  outCnt: number;
  inBase: number; // НӨАТ-тай худалдан авалт (НӨАТ-гүй)
  inVat: number; // төлсөн НӨАТ
  inCnt: number;
  // TT-03а мөрүүд
  row25: number; row26: number; row31: number;
  row33: number; row42: number; row49: number;
  row56: number; row57: number;
  netPayable: number; // 56 − 57 (>0 төлнө, <0 буцаан авна)
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function buildVatReturn(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<VatReturn> {
  const { data } = await supabase.rpc("vat_return_summary", {
    d_from: from,
    d_to: to,
  });
  const r =
    (data as
      | {
          out_taxable_base: number | null;
          out_exempt_base: number | null;
          out_vat: number | null;
          out_cnt: number | null;
          in_base: number | null;
          in_vat: number | null;
          in_cnt: number | null;
        }[]
      | null)?.[0] ?? null;

  const outTaxableBase = round2(Number(r?.out_taxable_base) || 0);
  const outExemptBase = round2(Number(r?.out_exempt_base) || 0);
  const outVat = round2(Number(r?.out_vat) || 0);
  const inBase = round2(Number(r?.in_base) || 0);
  const inVat = round2(Number(r?.in_vat) || 0);

  const row31 = outVat; // нийт ногдуулсан НӨАТ
  const row49 = inVat; // хасагдах НӨАТ
  const row56 = row31; // төлбөл зохих НӨАТ (31+52)
  const row57 = row49; // буцаан авах НӨАТ (49+55)
  const netPayable = round2(row56 - row57);

  return {
    outTaxableBase,
    outExemptBase,
    outVat,
    outCnt: Number(r?.out_cnt) || 0,
    inBase,
    inVat,
    inCnt: Number(r?.in_cnt) || 0,
    row25: outTaxableBase,
    row26: outVat,
    row31,
    row33: inBase,
    row42: inVat,
    row49,
    row56,
    row57,
    netPayable,
  };
}
