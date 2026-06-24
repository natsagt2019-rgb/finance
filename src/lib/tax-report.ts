// ААНОАТ (Аж ахуйн нэгжийн орлогын албан татвар) тайлан — зөрүүгийн тулгалт.
//
// Эрх зүйн суурь: Сангийн сайдын А/144 журам (НББ ашиг ↔ татвар ногдох орлого
// зөрүүг тулгах) + ААНОАТ хууль 2019.03.22.
//
// Гүүр: Татвар төлөхийн өмнөх ашиг (ОДТ-18, pnl_range-аас) → ± зөрүү →
// татвар ногдох орлого → − алдагдал шилжүүлэлт → × хувь → төлбөл зохих татвар.
//
// Зөрүүний эх: accounts.tax_class
//   non_deductible — хасагдахгүй зардал → байнгын нэмэгдэл (татварын дүн = 0)
//   exempt_income  — чөлөөлөгдөх орлого → байнгын хасагдал (татварын дүн = 0)
//   temp_diff      — түр зөрүү (татварын тал гараар; одоохондоо 0)

import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// ── Хуулийн тогтмолууд (ААНОАТ хууль 20 дугаар зүйл) ────────────────────────
export const CIT_BRACKET = 6_000_000_000; // 6 тэрбум ₮ — хувь шатлалын босго
export const CIT_RATE_LOW = 0.1; // ≤ 6 тэрбум: 10%
export const CIT_RATE_HIGH = 0.25; // > 6 тэрбум-ийн илүүд: 25%
export const CIT_RATE_SMALL = 0.01; // жижиг ААН (орлого < 300 сая): 1%
export const LOSS_OFFSET_CAP = 0.5; // алдагдлыг тайлант орлогын 50% хүртэл хасна

export type TaxParams = {
  smallBusiness: boolean; // жижиг ААН 1% хувь
  priorLoss: number; // өмнөх жил(үүд)-ийн шилжүүлэх алдагдлын үлдэгдэл (≥0)
  withholdingPaid: number; // суутгасан/урьдчилж төлсөн татвар (хасагдана)
};

export const DEFAULT_TAX_PARAMS: TaxParams = {
  smallBusiness: false,
  priorLoss: 0,
  withholdingPaid: 0,
};

// Зөрүүгийн тайлангийн нэг мөр (нэг данс).
export type TaxReconLine = {
  code: string;
  name: string;
  type: "income" | "expense";
  taxClass: "non_deductible" | "exempt_income" | "temp_diff";
  financial: number; // санхүүгийн дүн (эерэг хэмжээ)
  tax: number; // татварын дүн (татварт хүлээн зөвшөөрөх)
  diff: number; // зөрүү = financial − tax (зардалд + нэмэгдэл, орлогод − хасагдал)
};

export type TaxComputation = {
  profitBeforeTax: number; // ОДТ-18
  permanentAdd: number; // хасагдахгүй зардлын нийт (+)
  permanentLess: number; // чөлөөлөгдөх орлогын нийт (−)
  tempDiff: number; // түр зөрүүний цэвэр нөлөө (±)
  taxableBeforeLoss: number;
  lossUsed: number; // ашигласан өмнөх жилийн алдагдал (−)
  taxableIncome: number; // татвар ногдох орлого
  taxGross: number; // ногдсон татвар (хувиар)
  withholdingPaid: number; // суутгасан татвар (−)
  taxPayable: number; // төлбөл зохих татвар
  lines: TaxReconLine[]; // зөрүүтэй дансдын тулгалт
  smallBusiness: boolean;
};

// Татвар ногдох орлого дээр ногдох татвар (хувь шатлал).
export function citTax(taxableIncome: number, smallBusiness: boolean): number {
  if (taxableIncome <= 0) return 0;
  if (smallBusiness) return round2(taxableIncome * CIT_RATE_SMALL);
  if (taxableIncome <= CIT_BRACKET) return round2(taxableIncome * CIT_RATE_LOW);
  return round2(
    CIT_BRACKET * CIT_RATE_LOW + (taxableIncome - CIT_BRACKET) * CIT_RATE_HIGH,
  );
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Орлогын татварын зардлын данс уу? (ОДТ-18-аас гадуур — мөрийн доор)
function isIncomeTaxExpense(fsLine: string | null, code: string): boolean {
  if (fsLine && /^ОДТ\s*19/.test(fsLine)) return true;
  return code === "890100" || code === "890200";
}

// ААНОАТ зөрүүгийн тайлан + тооцоог [from, to] мужид гаргана.
export async function buildTaxReport(
  supabase: SupabaseClient,
  from: string,
  to: string,
  params: TaxParams = DEFAULT_TAX_PARAMS,
): Promise<TaxComputation> {
  // 1. P&L эргэлт (debit-positive цэвэр; хаалт хассан).
  const { data: pnlRows } = await supabase.rpc("pnl_range", {
    d_from: from,
    d_to: to,
  });
  const turnover = new Map<string, number>();
  for (const p of (pnlRows as { code: string; turnover: number | null }[] | null) ?? []) {
    turnover.set(p.code, Number(p.turnover) || 0);
  }

  // 2. Дансны мэдээлэл (татварын ангилал, fs_line).
  const { data: accRows } = await supabase
    .from("accounts")
    .select("code, name, type, fs_line, tax_class")
    .eq("is_active", true)
    .limit(5000);
  const accounts =
    (accRows as
      | {
          code: string;
          name: string;
          type: string;
          fs_line: string | null;
          tax_class: TaxReconLine["taxClass"] | null;
        }[]
      | null) ?? [];

  // 3. Татвар төлөхийн өмнөх ашиг = −Σ(P&L эргэлт), орлогын татварын зардлыг хасна.
  // (turnover debit-positive: орлого сөрөг, зардал эерэг → ашиг = −нийлбэр.)
  let profitBeforeTax = 0;
  for (const a of accounts) {
    if (a.type !== "income" && a.type !== "expense") continue;
    if (isIncomeTaxExpense(a.fs_line, a.code)) continue;
    profitBeforeTax += -(turnover.get(a.code) ?? 0);
  }
  profitBeforeTax = round2(profitBeforeTax);

  // 4. Зөрүүтэй дансдыг тулгана.
  const lines: TaxReconLine[] = [];
  let permanentAdd = 0;
  let permanentLess = 0;
  let tempDiff = 0;

  for (const a of accounts) {
    if (a.type !== "income" && a.type !== "expense") continue;
    if (!a.tax_class) continue;
    if (isIncomeTaxExpense(a.fs_line, a.code)) continue;

    // Санхүүгийн дүн = тухайн дансны эерэг хэмжээ (зардал +turnover, орлого −turnover).
    const t = turnover.get(a.code) ?? 0;
    const financial = a.type === "expense" ? t : -t;
    if (Math.abs(financial) < 0.005) continue;

    let tax = financial; // анхдагч: бүрэн хүлээн зөвшөөрнө
    if (a.tax_class === "non_deductible" || a.tax_class === "exempt_income") {
      tax = 0; // бүхэлдээ зөрүү (байнгын)
    }
    // temp_diff: татварын тал гараар тогтоогдоно (phase 4) — одоохондоо tax=financial, зөрүү 0.

    const diff = round2(financial - tax);

    if (a.tax_class === "non_deductible")
      permanentAdd += diff; // зардал: financial − 0 = +нэмэгдэл
    else if (a.tax_class === "exempt_income")
      permanentLess += diff; // орлого: financial(+) − 0 = +, гэхдээ татвар ногдох орлогоос ХАСНА
    else tempDiff += diff;

    lines.push({
      code: a.code,
      name: a.name,
      type: a.type,
      taxClass: a.tax_class,
      financial: round2(financial),
      tax: round2(tax),
      diff,
    });
  }

  permanentAdd = round2(permanentAdd);
  permanentLess = round2(permanentLess);
  tempDiff = round2(tempDiff);

  // 5. Татвар ногдох орлого.
  const taxableBeforeLoss = round2(
    profitBeforeTax + permanentAdd - permanentLess + tempDiff,
  );

  // 6. Алдагдал шилжүүлэлт (тайлант орлогын ≤50%; зөвхөн эерэг орлогод).
  const lossUsed =
    taxableBeforeLoss > 0
      ? round2(Math.min(params.priorLoss, taxableBeforeLoss * LOSS_OFFSET_CAP))
      : 0;
  const taxableIncome = round2(taxableBeforeLoss - lossUsed);

  // 7. Татвар.
  const taxGross = citTax(taxableIncome, params.smallBusiness);
  const taxPayable = round2(Math.max(0, taxGross - params.withholdingPaid));

  lines.sort((a, b) => a.code.localeCompare(b.code));

  return {
    profitBeforeTax,
    permanentAdd,
    permanentLess,
    tempDiff,
    taxableBeforeLoss,
    lossUsed,
    taxableIncome,
    taxGross,
    withholdingPaid: params.withholdingPaid,
    taxPayable,
    lines,
    smallBusiness: params.smallBusiness,
  };
}
