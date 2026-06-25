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
export const CIT_RATE_LOW = 0.1; // ≤ 6 тэрбум: 10% (хууль 20.1)
export const CIT_RATE_HIGH = 0.25; // > 6 тэрбум-ийн илүүд: 25% (хууль 20.1)
export const CIT_RATE_SMALL = 0.01; // жижиг ААН (өмнөх оны орлого ≤300 сая): 1% НИЙТ ОРЛОГОД (хууль 20.2.7)
export const CIT_RATE_SPECIAL = 0.1; // хүү/ногдол ашиг/эрхийн шимтгэл: 10% (хууль 20.2.1)
export const LOSS_OFFSET_CAP = 0.5; // алдагдлыг тайлант орлогын 50% хүртэл хасна (хууль 19)

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
  taxClass: "non_deductible" | "exempt_income" | "temp_diff" | "temp_diff_unrealized";
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
  exemptIncome: number; // татвараас чөлөөлөгдөх орлого (хууль 21)
  specialIncome: number; // тусгай хувиар татвар ногдох орлого (хууль 20.2.1)
  specialTax: number; // тусгай хувиар ногдсон татвар (×10%)
  taxableBeforeLoss: number;
  lossUsed: number; // ашигласан өмнөх жилийн алдагдал (−)
  taxableIncome: number; // татвар ногдох орлого
  taxGross: number; // ногдсон татвар (хувиар)
  withholdingPaid: number; // суутгасан татвар (−)
  taxPayable: number; // төлбөл зохих татвар
  lines: TaxReconLine[]; // зөрүүтэй дансдын тулгалт
  manualLines: TaxAdjustment[]; // гар нэмсэн мөрүүд (add/less)
  smallBusiness: boolean;
  tt02: Tt02Lines; // албан ёсны TT-02 маягтын мөрүүд
};

// TT-02 маягтын мөрийн дүнгүүд (А + В хэсэг).
export type Tt02Lines = {
  row1: number; row2: number; row3: number; row5: number;
  row6: number; row8: number; row16: number;
  row18: number; row19: number; row20: number; row17: number;
  row21: number; row22: number; row23: number; row24: number;
  row27: number; row28: number; row29: number; row30: number; row31: number;
  row42: number; row43: number; row51: number;
  row52: number; row54: number; row59: number;
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

  // 2. Дансны мэдээлэл (татварын ангилал, fs_line, ББӨ эсэх).
  const { data: accRows } = await supabase
    .from("accounts")
    .select("code, name, type, fs_line, tax_class, is_cogs")
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
          is_cogs: boolean | null;
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
  // Зэрэгцээд TT-02 маягтын орлого/зардлын задаргааг fs_line-аар бүлэглэнэ.
  let profitBeforeTax = 0;
  let incSales = 0; // мөр 6 — борлуулалтын орлого (ОДТ 1)
  let incRental = 0; // мөр 8 — түрээсийн орлого (ОДТ 4)
  let incOther = 0; // мөр 16 — бусад нийтлэг орлого
  let exemptIncome = 0; // мөр 2 — татвараас чөлөөлөгдөх орлого (хууль 21)
  let specialIncome = 0; // мөр 3 — тусгай хувиар татвар ногдох орлого (хүү/ногдол ашиг/эрхийн шимтгэл)
  let expCogs = 0; // мөр 18 — борлуулсан бүтээгдэхүүний өртөг
  let expOperating = 0; // мөр 19 — удирдлага/борлуулалтын зардал (ОДТ 9, 10)
  let expNonOp = 0; // мөр 20 — үндсэн бус үйл ажиллагааны зардал (ОДТ 11, 12, ...)
  for (const a of accounts) {
    if (a.type !== "income" && a.type !== "expense") continue;
    if (isIncomeTaxExpense(a.fs_line, a.code)) continue;
    const t = turnover.get(a.code) ?? 0;
    profitBeforeTax += -t;
    const fs = a.fs_line ?? "";
    if (a.type === "income") {
      const amt = -t; // орлогын эерэг хэмжээ
      // Татвараас чөлөөлөгдөх орлого (хууль 21) → мөр 2.
      if (a.tax_class === "exempt_income") exemptIncome += amt;
      // Тусгай хувиар татвар ногдох орлого (хууль 20.2.1): хүү (ОДТ 5),
      // ногдол ашиг (ОДТ 6), эрхийн шимтгэл (ОДТ 7) → мөр 3.
      else if (/^ОДТ\s*[567]\b/.test(fs)) specialIncome += amt;
      else if (/^ОДТ\s*1\s/.test(fs)) incSales += amt;
      else if (/^ОДТ\s*4\b/.test(fs)) incRental += amt;
      else incOther += amt;
    } else {
      const amt = t; // зардлын эерэг хэмжээ
      if (a.is_cogs || /^ОДТ\s*2\b/.test(fs)) expCogs += amt;
      else if (/^ОДТ\s*(9|10)\b/.test(fs)) expOperating += amt;
      else expNonOp += amt;
    }
  }
  profitBeforeTax = round2(profitBeforeTax);
  specialIncome = round2(specialIncome);
  exemptIncome = round2(exemptIncome);

  // 4. Зөрүүтэй дансдыг тулгана.
  const lines: TaxReconLine[] = [];
  let permanentAdd = 0;
  let permanentLess = 0;
  let tempDiff = 0;
  let increaseTotal = 0; // мөр 22 — нэмэгдүүлэх дүн (СТ-30)
  let decreaseTotal = 0; // мөр 23 — бууруулах дүн (СТ-30)
  const bump = (effect: number) => {
    if (effect >= 0) increaseTotal += effect;
    else decreaseTotal += -effect;
  };

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
    } else if (a.tax_class === "temp_diff_unrealized") {
      // Бодит бус ханшийн зөрүү — татвар хүлээн зөвшөөрөхгүй (тал = 0); бүхэлдээ
      // эргэх түр зөрүү. Гараар оруулах шаардлагагүй.
      tax = 0;
    } else if (a.tax_class === "temp_diff") {
      // Татварын тал гараар (элэгдлийн зөрүү гэх мэт); оруулаагүй бол зөрүүгүй.
      tax = tempTaxByCode.get(a.code) ?? financial;
    }

    const diff = round2(financial - tax);

    if (a.tax_class === "non_deductible") {
      permanentAdd += diff; // зардал: татвар ногдох орлогод НЭМНЭ
      bump(diff);
    } else if (a.tax_class === "exempt_income") {
      permanentLess += diff; // орлого: татвар ногдох орлогоос ХАСНА
      bump(-diff);
    } else {
      // Түр зөрүү — татварын орлогод үзүүлэх цэвэр нөлөө (тэмдэгтэй):
      //   зардал: санхүү − татвар (НББ зардал илүү бол нэмэгдэнэ)
      //   орлого: татвар − санхүү (НББ орлого илүү бол хасагдана)
      const effect = a.type === "expense" ? diff : -diff;
      tempDiff += effect;
      bump(effect);
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
  increaseTotal += manualAdd;
  decreaseTotal += manualLess;
  // Тусгай хувиар татвар ногдох орлого нийтлэг татвараас хасагдана (СТ-30 мөр 7).
  decreaseTotal += specialIncome;

  permanentAdd = round2(permanentAdd);
  permanentLess = round2(permanentLess);
  tempDiff = round2(tempDiff);
  manualAdd = round2(manualAdd);
  manualLess = round2(manualLess);
  increaseTotal = round2(increaseTotal);
  decreaseTotal = round2(decreaseTotal);

  // 5. Нийтлэг хувиар татвар ногдох орлого (тусгай орлогыг хассан).
  const taxableBeforeLoss = round2(
    profitBeforeTax + increaseTotal - decreaseTotal,
  );

  // 6. Алдагдал шилжүүлэлт (тайлант орлогын ≤50%; зөвхөн эерэг орлогод).
  const lossUsed =
    taxableBeforeLoss > 0
      ? round2(Math.min(params.priorLoss, taxableBeforeLoss * LOSS_OFFSET_CAP))
      : 0;
  const taxableIncome = round2(taxableBeforeLoss - lossUsed);

  // 7. Татвар.
  const incomeTotal = round2(incSales + incRental + incOther + specialIncome);
  // Тусгай хувиар ногдох татвар (хүү/ногдол ашиг/эрхийн шимтгэл × 10%; хууль 20.2.1).
  const specialTax = params.smallBusiness ? 0 : round2(specialIncome * CIT_RATE_SPECIAL);
  // Нийтлэг хувиар ногдох татвар. Жижиг ААН (20.2.7): 1% НИЙТ ОРЛОГОД.
  const taxGross = params.smallBusiness
    ? round2(incomeTotal * CIT_RATE_SMALL)
    : citTax(taxableIncome, false);
  const taxPayable = round2(
    Math.max(0, taxGross + specialTax - params.withholdingPaid),
  );

  lines.sort((a, b) => a.code.localeCompare(b.code));

  // 8. TT-02 маягтын мөрүүд (Сангийн сайдын маягт — А + Б + В хэсэг).
  const incGeneral = round2(incSales + incRental + incOther); // мөр 5
  const incRow1 = round2(incGeneral + specialIncome + exemptIncome); // мөр 1 (2+3+4+5)
  const expTotal = round2(expCogs + expOperating + expNonOp);
  const tt02 = {
    row6: round2(incSales),
    row8: round2(incRental),
    row16: round2(incOther),
    row1: incRow1, // нийт орлого = мөр 2+3+4+5
    row2: exemptIncome, // татвараас чөлөөлөгдөх орлого
    row3: specialIncome, // тусгай хувиар татвар ногдох орлого
    row5: incGeneral, // нийтлэг хувиар татвар ногдох орлого
    row18: round2(expCogs),
    row19: round2(expOperating),
    row20: round2(expNonOp),
    row17: expTotal,
    row21: profitBeforeTax, // = row1 − row17
    row22: increaseTotal,
    row23: decreaseTotal,
    row24: taxableBeforeLoss, // = 21 + 22 − 23
    row27: lossUsed,
    row28: taxableIncome, // = 24 − 27 (мөр 25,26 = 0)
    row29: taxGross,
    row30: 0, // хөнгөлөлт (загварт гараар)
    row31: taxGross, // = 29 − 30
    row42: round2(specialIncome), // Б — тусгай хувиар татвар ногдох орлого
    row43: specialTax, // Б — тусгай орлогод ногдуулсан татвар (×10%)
    row51: specialTax, // Б — тусгай хувиар ногдуулсан нийт татвар
    row52: round2(params.withholdingPaid), // суутгуулсан татвар
    row54: taxPayable, // = 31 + 51 − 52 − 53
    row59: taxPayable, // нийт төлбөл зохих
  };

  return {
    profitBeforeTax,
    permanentAdd,
    permanentLess,
    tempDiff,
    manualAdd,
    manualLess,
    exemptIncome,
    specialIncome,
    specialTax,
    taxableBeforeLoss,
    lossUsed,
    taxableIncome,
    taxGross,
    withholdingPaid: params.withholdingPaid,
    taxPayable,
    lines,
    manualLines,
    smallBusiness: params.smallBusiness,
    tt02,
  };
}
