// ============================================================
// Цалин тооцооллын цөм — TSALIN_TURUL.md §2-ийн томъёо.
// ============================================================
// Цэвэр функцууд: page (preview) болон action (хадгалах) хоёул дуудна —
// тооцооллын нэг эх сурвалж байх зорилготой.
// ============================================================

// ХХОАТ Арт.23.1 хасагдуулгын нэг шатлал.
// max = null бол "түүнээс дээш" гэсэн дээд шатлал.
export type PitTier = { max: number | null; deduction: number };

// 2026 оны анхдагч тогтмол (settings байхгүй үед fallback).
export const DEFAULT_MONTH_HOURS_2026 = [
  136, 152, 168, 176, 160, 168, 184, 168, 176, 184, 160, 184,
];

export const SH_RATE = 0.115; // ЭМНДШ хувь
export const SH_CEILING = 7_920_000; // ЭМНДШ дээд хязгаар (2026)
export const PIT_RATE = 0.1; // ХХОАТ хувь
export const ADVANCE_RATE = 0.4; // урьдчилгаа = үндсэн × 40%

export const DEFAULT_PIT_TIERS: PitTier[] = [
  { max: 500_000, deduction: 20_000 },
  { max: 1_000_000, deduction: 18_000 },
  { max: 1_500_000, deduction: 16_000 },
  { max: 2_000_000, deduction: 14_000 },
  { max: 2_500_000, deduction: 12_000 },
  { max: 3_000_000, deduction: 10_000 },
  { max: null, deduction: 0 },
];

// Тооцоонд хэрэглэх параметрүүд (settings-ээс эсвэл анхдагч).
export type SalaryParams = {
  shRate: number;
  shCeiling: number;
  pitRate: number;
  advanceRate: number;
  pitTiers: PitTier[];
};

export const DEFAULT_PARAMS: SalaryParams = {
  shRate: SH_RATE,
  shCeiling: SH_CEILING,
  pitRate: PIT_RATE,
  advanceRate: ADVANCE_RATE,
  pitTiers: DEFAULT_PIT_TIERS,
};

function round(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

// Бодогдсон цалин = Үндсэн цалин ÷ Сарын нийт цаг × Ажилласан цаг.
// monthHours ≤ 0 эсвэл worked ≥ month бол бүтэн үндсэн цалинг буцаана.
export function computedSalary(
  base: number,
  monthHours: number,
  workedHours: number,
): number {
  if (monthHours <= 0) return round(base);
  if (workedHours >= monthHours) return round(base);
  return round((base / monthHours) * workedHours);
}

// ЭМНДШ = MIN(Нийт цалин, дээд хязгаар) × хувь.
export function shInsurance(gross: number, params = DEFAULT_PARAMS): number {
  return round(Math.min(gross, params.shCeiling) * params.shRate);
}

// Арт.23.1 хасагдуулга — gross аль шатлалд багтахаас хамаарна.
export function pitDeduction(gross: number, tiers: PitTier[]): number {
  for (const t of tiers) {
    if (t.max === null || gross <= t.max) return t.deduction;
  }
  return 0;
}

// ХХОАТ = MAX(0, (Нийт − ЭМНДШ) × хувь − хасагдуулга).
export function pit(
  gross: number,
  sh: number,
  params = DEFAULT_PARAMS,
): number {
  const ded = pitDeduction(gross, params.pitTiers);
  return round(Math.max(0, (gross - sh) * params.pitRate - ded));
}

// Урьдчилгаа = Үндсэн цалин × хувь (ажилласан өдрөөс үл хамаарна).
export function advance(base: number, params = DEFAULT_PARAMS): number {
  return round(base * params.advanceRate);
}

// Нэг мөрийн бүрэн тооцоо.
export type SalaryInput = {
  base: number;
  monthHours: number;
  workedHours: number;
  phoneAllowance?: number;
  bonus?: number;
  vacationAmount?: number;
  otherDeduction?: number;
};

export type SalaryComputed = {
  computed_salary: number; // бодогдсон цалин
  gross: number; // нийт цалин
  sh_insurance: number; // ЭМНДШ
  pit: number; // ХХОАТ
  advance: number; // урьдчилгаа
  net: number; // гарт олгох
};

// Бүх дүнг тооцоолж буцаана.
// Нийт цалин = бодогдсон + утасны нэмэгдэл + урамшуулал + ЭА.
// Гарт олгох  = нийт − ЭМНДШ − ХХОАТ − урьдчилгаа − бусад суутгал.
export function computeRow(
  input: SalaryInput,
  params: SalaryParams = DEFAULT_PARAMS,
): SalaryComputed {
  const phone = input.phoneAllowance ?? 0;
  const bonus = input.bonus ?? 0;
  const vacation = input.vacationAmount ?? 0;
  const other = input.otherDeduction ?? 0;

  const computed = computedSalary(input.base, input.monthHours, input.workedHours);
  const gross = round(computed + phone + bonus + vacation);
  const sh = shInsurance(gross, params);
  const tax = pit(gross, sh, params);
  const adv = advance(input.base, params);
  const net = round(gross - sh - tax - adv - other);

  return {
    computed_salary: computed,
    gross,
    sh_insurance: sh,
    pit: tax,
    advance: adv,
    net,
  };
}

// ============================================================
// ЭА (ээлжийн амралт) тооцоо — TSALIN_TURUL.md §4.
// ============================================================

export const HOURS_PER_DAY = 8; // 1 ажлын өдрийн цаг

// Хуулийн дагуу ЭА хоног — ажилласан жил (туршлага)-аар.
export const VACATION_DAY_TIERS: { maxYears: number | null; days: number }[] = [
  { maxYears: 6, days: 15 }, // < 6 жил
  { maxYears: 11, days: 18 }, // < 11 жил
  { maxYears: 16, days: 20 }, // < 16 жил
  { maxYears: 21, days: 22 }, // < 21 жил
  { maxYears: 26, days: 24 }, // < 26 жил
  { maxYears: 32, days: 26 }, // < 32 жил
  { maxYears: null, days: 29 }, // 32+ жил
];

// Туршлагаас хамаарах ЭА хоног.
export function vacationDays(years: number): number {
  for (const t of VACATION_DAY_TIERS) {
    if (t.maxYears === null || years < t.maxYears) return t.days;
  }
  return 29;
}

// Ажилд орсон огнооноос асОf хүртэлх жил (туршлага оруулаагүй үед fallback).
export function tenureYears(hiredDate: string | null, asOf: string): number {
  if (!hiredDate) return 0;
  const h = new Date(hiredDate);
  const a = new Date(asOf);
  if (Number.isNaN(h.getTime()) || Number.isNaN(a.getTime())) return 0;
  let y = a.getFullYear() - h.getFullYear();
  const monthDiff =
    a.getMonth() - h.getMonth() || a.getDate() - h.getDate();
  if (monthDiff < 0) y -= 1;
  return Math.max(0, y);
}

// ЭА тооцоонд оролцох сарын мэдээлэл (хадгалсан salary_record-оос).
export type VacationMonth = {
  gross: number;
  vacation_amount?: number;
  bonus?: number;
  worked_hours: number;
};

export type VacationResult = {
  monthsUsed: number; // тооцоонд орсон сарын тоо
  eligibleSalary: number; // ЭА+урамшуулал хассан нийт цалин
  workedDays: number; // ажилласан өдөр (цаг ÷ 8)
  dailyAvg: number; // 1 өдрийн дундаж
  days: number; // ЭА хоног
  amount: number; // ЭА дүн
};

// ЭА дүн = 1 өдрийн дундаж × ЭА хоног.
//   1 өдрийн дундаж = Σ(сар бүрийн нийт − ЭА − урамшуулал) ÷ Σ(ажилласан өдөр)
// Урамшуулал ба өмнө авсан ЭА-г хасч тооцоолно (§4 анхааруулга).
export function computeVacation(
  months: VacationMonth[],
  years: number,
): VacationResult {
  const eligibleSalary = months.reduce(
    (s, m) => s + (m.gross - (m.vacation_amount ?? 0) - (m.bonus ?? 0)),
    0,
  );
  const workedHours = months.reduce((s, m) => s + (m.worked_hours || 0), 0);
  const workedDays = workedHours / HOURS_PER_DAY;
  const dailyAvg = workedDays > 0 ? eligibleSalary / workedDays : 0;
  const days = vacationDays(years);
  return {
    monthsUsed: months.length,
    eligibleSalary: round(eligibleSalary),
    workedDays: round(workedDays),
    dailyAvg: round(dailyAvg),
    days,
    amount: round(dailyAvg * days),
  };
}

// JSONB/settings мөрийг SalaryParams болгож хувиргах туслах.
export function paramsFromSettings(s: {
  sh_rate?: number | null;
  sh_ceiling?: number | null;
  pit_rate?: number | null;
  advance_rate?: number | null;
  pit_tiers?: PitTier[] | null;
} | null): SalaryParams {
  if (!s) return DEFAULT_PARAMS;
  return {
    shRate: s.sh_rate ?? SH_RATE,
    shCeiling: s.sh_ceiling ?? SH_CEILING,
    pitRate: s.pit_rate ?? PIT_RATE,
    advanceRate: s.advance_rate ?? ADVANCE_RATE,
    pitTiers:
      Array.isArray(s.pit_tiers) && s.pit_tiers.length > 0
        ? s.pit_tiers
        : DEFAULT_PIT_TIERS,
  };
}
