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

// Гар тохируулга (tax_adjustments хүснэгт).
export type TaxAdjustment = {
  id: number;
  year: number;
  kind: "temp_diff" | "add" | "less";
  accountCode: string | null;
  label: string;
  amount: number;
  note: string | null;
};

export async function loadTaxAdjustments(
  supabase: SupabaseClient,
  year: number,
): Promise<TaxAdjustment[]> {
  const { data } = await supabase
    .from("tax_adjustments")
    .select("id, year, kind, account_code, label, amount, note")
    .eq("year", year)
    .order("id", { ascending: true });
  return (
    (data as
      | {
          id: number;
          year: number;
          kind: TaxAdjustment["kind"];
          account_code: string | null;
          label: string;
          amount: number | null;
          note: string | null;
        }[]
      | null) ?? []
  ).map((r) => ({
    id: r.id,
    year: r.year,
    kind: r.kind,
    accountCode: r.account_code,
    label: r.label,
    amount: Number(r.amount) || 0,
    note: r.note,
  }));
}

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
  manualAdd: number; // гар нэмэгдэл (+)
  manualLess: number; // гар хасагдал (−)
  taxableBeforeLoss: number;
  lossUsed: number; // ашигласан өмнөх жилийн алдагдал (−)
  taxableIncome: number; // татвар ногдох орлого
  taxGross: number; // ногдсон татвар (хувиар)
  withholdingPaid: number; // суутгасан татвар (−)
  taxPayable: number; // төлбөл зохих татвар
  lines: TaxReconLine[]; // зөрүүтэй дансдын тулгалт
  manualLines: TaxAdjustment[]; // гар нэмсэн мөрүүд (add/less)
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

  // 2b. Гар тохируулга (түр зөрүүний татварын тал + гар мөр) — жилээр.
  const year = Number(from.slice(0, 4));
  const adjustments = await loadTaxAdjustments(supabase, year);
  const tempTaxByCode = new Map<string, number>();
  const manualLines: TaxAdjustment[] = [];
  for (const adj of adjustments) {
    if (adj.kind === "temp_diff" && adj.accountCode) {
      tempTaxByCode.set(adj.accountCode, adj.amount);
    } else if (adj.kind === "add" || adj.kind === "less") {
      manualLines.push(adj);
    }
  }

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
    const hasTempTax = a.tax_class === "temp_diff" && tempTaxByCode.has(a.code);
    // temp_diff татварын тал гараар орсон бол санхүү 0 байсан ч мөрийг үзүүлнэ.
    if (Math.abs(financial) < 0.005 && !hasTempTax) continue;

    let tax = financial; // анхдагч: бүрэн хүлээн зөвшөөрнө
    if (a.tax_class === "non_deductible" || a.tax_class === "exempt_income") {
      tax = 0; // бүхэлдээ зөрүү (байнгын)
    } else if (a.tax_class === "temp_diff") {
      // Татварын тал гараар (элэгдлийн зөрүү гэх мэт); оруулаагүй бол зөрүүгүй.
      tax = tempTaxByCode.get(a.code) ?? financial;
    }

    const diff = round2(financial - tax);

    if (a.tax_class === "non_deductible") {
      permanentAdd += diff; // зардал: татвар ногдох орлогод НЭМНЭ
    } else if (a.tax_class === "exempt_income") {
      permanentLess += diff; // орлого: татвар ногдох орлогоос ХАСНА
    } else {
      // Түр зөрүү — татварын орлогод үзүүлэх цэвэр нөлөө (тэмдэгтэй):
      //   зардал: санхүү − татвар (НББ зардал илүү бол нэмэгдэнэ)
      //   орлого: татвар − санхүү (НББ орлого илүү бол хасагдана)
      tempDiff += a.type === "expense" ? diff : -diff;
    }

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

  // Гар мөрүүд.
  let manualAdd = 0;
  let manualLess = 0;
  for (const m of manualLines) {
    if (m.kind === "add") manualAdd += m.amount;
    else manualLess += m.amount;
  }

  permanentAdd = round2(permanentAdd);
  permanentLess = round2(permanentLess);
  tempDiff = round2(tempDiff);
  manualAdd = round2(manualAdd);
  manualLess = round2(manualLess);

  // 5. Татвар ногдох орлого.
  const taxableBeforeLoss = round2(
    profitBeforeTax + permanentAdd - permanentLess + tempDiff + manualAdd - manualLess,
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
    manualAdd,
    manualLess,
    taxableBeforeLoss,
    lossUsed,
    taxableIncome,
    taxGross,
    withholdingPaid: params.withholdingPaid,
    taxPayable,
    lines,
    manualLines,
    smallBusiness: params.smallBusiness,
  };
}
