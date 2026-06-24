// ============================================================
// Үндсэн хөрөнгийн элэгдэл тооцооллын цөм — шулуун шугамын арга.
// ============================================================
// Цэвэр функцууд: page (preview) болон action (хадгалах) хоёул дуудна —
// тооцооллын нэг эх сурвалж байх зорилготой.
//
// Шулуун шугам: сарын элэгдэл = (анхны өртөг − үлдэгдэл өртөг) ÷ (жил × 12).
// Элэгдэл орсон сараас (acquired_date) эхэлж, элэгдэх дүн дуустал тооцно.
// ============================================================

// Анхдагч ашиглалтын хугацаа (settings/ангилал байхгүй үед fallback) — жил.
export const DEFAULT_USEFUL_LIFE_YEARS = 10;

function round(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

// Он, сарыг нэг бүхэл тоо болгож (харьцуулахад) — y*12 + m.
function monthIndex(year: number, month: number): number {
  return year * 12 + month;
}

// "YYYY-MM-DD" огнооноос (он, сар) гаргана. Буруу бол null.
function ymOf(date: string | null): { year: number; month: number } | null {
  if (!date) return null;
  const m = /^(\d{4})-(\d{2})/.exec(date);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

export type AssetCalcInput = {
  cost: number; // анхны өртөг
  salvageValue?: number; // үлдэгдэл (хаягдлын) өртөг
  usefulLifeYears: number; // ашиглалтын хугацаа (жил)
  acquiredDate: string | null; // орсон огноо "YYYY-MM-DD"
  // Эхний үлдэгдэл (систем рүү шилжүүлэх үед): тэр огноогийн хуримтлагдсан
  // элэгдлийг өгвөл өмнөх түүхийг дахин тооцохгүй, тэндээс үргэлжлүүлнэ.
  openingDate?: string | null; // эхний үлдэгдлийн огноо "YYYY-MM-DD"
  openingAccumDepreciation?: number; // тэр огноо дахь хуримтлагдсан элэгдэл

  // ── Revision (засвар / дахин үнэлгээ / ашиглах хугацаа өөрчлөх) ──
  // R огнооноос ХОЙШ: шинэ суурь (revisionCost − revisionAccum − үлдэгдэл өртөг)-ийг
  // үлдсэн хугацаагаар (revisionLifeMonths) проспектив элэгдүүлнэ. R-ээс ӨМНӨХ
  // саруудад нөлөөлөхгүй (анхны хуваарь хэвээр).
  revisionDate?: string | null; // revision хүчинтэй болох огноо "YYYY-MM-DD"
  revisionCost?: number; // revision-ы дараах нийт (брутто) өртөг
  revisionAccumDepreciation?: number; // R хүртэлх хөлдөөсөн хуримтлагдсан элэгдэл
  revisionLifeMonths?: number; // R-ээс хойшх үлдэх хугацаа (сар)
};

export type AssetCalcResult = {
  depreciableBase: number; // элэгдэх дүн = өртөг − үлдэгдэл
  monthlyDepreciation: number; // тухайн (year, month)-ийн элэгдэл
  accumulatedDepreciation: number; // тухайн сар хүртэлх хуримтлагдсан элэгдэл
  netBookValue: number; // үлдэгдэл (дансны) өртөг = өртөг − хуримтлагдсан
  monthsElapsed: number; // орсноос хойш өнгөрсөн сар (тухайн сарыг оруулаад)
  fullyDepreciated: boolean; // бүрэн элэгдсэн эсэх
};

// Элэгдэх суурь дүн = MAX(0, өртөг − үлдэгдэл өртөг).
export function depreciableBase(cost: number, salvage = 0): number {
  return round(Math.max(0, (Number(cost) || 0) - (Number(salvage) || 0)));
}

// Сарын тогтмол элэгдэл (хязгааргүй — суурь дүнг сар тутамд жигд хуваана).
export function monthlyStraightLine(
  cost: number,
  salvage: number,
  usefulLifeYears: number,
): number {
  const months = (Number(usefulLifeYears) || 0) * 12;
  if (months <= 0) return 0;
  return round(depreciableBase(cost, salvage) / months);
}

// Орсон сараас (year, month) хүртэл өнгөрсөн сарын тоо (тухайн сарыг оруулна).
// Орохоосоо өмнө бол 0 буюу сөрөг.
export function monthsElapsed(
  acquiredDate: string | null,
  year: number,
  month: number,
): number {
  const a = ymOf(acquiredDate);
  if (!a) return 0;
  return monthIndex(year, month) - monthIndex(a.year, a.month) + 1;
}

// n сарын дараах хуримтлагдсан элэгдэл (суурь дүнгээр таслана).
function accumulatedAfter(
  base: number,
  monthly: number,
  n: number,
): number {
  if (n <= 0) return 0;
  return Math.min(n * monthly, base);
}

// Тухайн (year, month)-ийн бүрэн тооцоо.
//   • Орохоосоо өмнө → бүх 0, netBook = өртөг.
//   • Сүүлийн сар → үлдсэн дүнгээр таслаж (хэсэгчилсэн элэгдэл).
//   • Бүрэн элэгдсэний дараа → тухайн сарын элэгдэл 0.
export function computeAsset(
  input: AssetCalcInput,
  year: number,
  month: number,
): AssetCalcResult {
  const base = depreciableBase(input.cost, input.salvageValue ?? 0);
  const monthly = monthlyStraightLine(
    input.cost,
    input.salvageValue ?? 0,
    input.usefulLifeYears,
  );
  const cost = Number(input.cost) || 0;

  // ── Revision: R-ээс ХОЙШ шинэ суурийг үлдсэн хугацаагаар проспектив элэгдүүлнэ ──
  const revision = ymOf(input.revisionDate ?? null);
  const revLifeMonths = Number(input.revisionLifeMonths) || 0;
  if (revision && revLifeMonths > 0) {
    const target = monthIndex(year, month);
    const r0 = monthIndex(revision.year, revision.month);
    if (target >= r0) {
      const revCost = Number(input.revisionCost) || 0;
      const revAccum = Number(input.revisionAccumDepreciation) || 0;
      const salvage = Number(input.salvageValue) || 0;
      const baseR = Math.max(0, round(revCost - revAccum - salvage));
      const monthlyR = round(baseR / revLifeMonths);
      const n = target - r0 + 1; // R сар = эхний шинэ-тарифт сар
      const accumAfter = Math.min(n * monthlyR, baseR);
      const accumPrev = Math.min(Math.max(n - 1, 0) * monthlyR, baseR);
      const accumulated = revAccum + accumAfter;
      return {
        depreciableBase: baseR,
        monthlyDepreciation: round(accumAfter - accumPrev),
        accumulatedDepreciation: round(accumulated),
        netBookValue: round(revCost - accumulated),
        monthsElapsed: n,
        fullyDepreciated: accumAfter >= baseR && baseR > 0,
      };
    }
    // target < R → доорх анхны (revision-ы өмнөх) хуваарийн логикоор бодно.
  }

  // Эхний хуримтлагдсан элэгдэл өгсөн бол: тэр огнооноос хойш үргэлжлүүлж бодно.
  const opening = ymOf(input.openingDate ?? null);
  if (opening) {
    const openAccum = Number(input.openingAccumDepreciation) || 0;
    // Эхний огнооны сар нь openAccum-д аль хэдийн орсон тул түүнээс ХОЙШ
    // өнгөрсөн саруудаар нэмж бодно (тухайн сар = after сар).
    const after = monthIndex(year, month) - monthIndex(opening.year, opening.month);
    const accFrom = (n: number) =>
      Math.min(openAccum + Math.max(n, 0) * monthly, base);
    const accumNow = accFrom(after);
    const accumPrev = accFrom(after - 1);
    const periodDep = round(accumNow - accumPrev);
    return {
      depreciableBase: base,
      monthlyDepreciation: periodDep,
      accumulatedDepreciation: round(accumNow),
      netBookValue: round(cost - accumNow),
      monthsElapsed: after,
      fullyDepreciated: accumNow >= base && base > 0,
    };
  }

  // Эс бөгөөс: орсон огнооноос (acquired_date) шулуун шугамаар бодно.
  const elapsed = monthsElapsed(input.acquiredDate, year, month);
  const accumNow = accumulatedAfter(base, monthly, elapsed);
  const accumPrev = accumulatedAfter(base, monthly, elapsed - 1);
  const periodDep = round(accumNow - accumPrev);
  return {
    depreciableBase: base,
    monthlyDepreciation: periodDep,
    accumulatedDepreciation: round(accumNow),
    netBookValue: round(cost - accumNow),
    monthsElapsed: elapsed,
    fullyDepreciated: accumNow >= base && base > 0,
  };
}

// AssetRow-ийн revision талбаруудыг (snake_case) AssetCalcInput руу буулгах туслах.
// computeAsset дуудах газар бүрт `...revisionInput(asset)` гэж дамжуулна.
export function revisionInput(a: {
  revision_date?: string | null;
  revision_cost?: number | null;
  revision_accum?: number | null;
  revision_life_months?: number | null;
}): Pick<
  AssetCalcInput,
  "revisionDate" | "revisionCost" | "revisionAccumDepreciation" | "revisionLifeMonths"
> {
  return {
    revisionDate: a.revision_date ?? null,
    revisionCost: Number(a.revision_cost) || 0,
    revisionAccumDepreciation: Number(a.revision_accum) || 0,
    revisionLifeMonths: Number(a.revision_life_months) || 0,
  };
}

// Ангилал/хөрөнгийн ашиглалтын хугацааг сонгох (хөрөнгийнх давамгайлна).
export function resolveUsefulLife(
  assetYears: number | null | undefined,
  categoryYears: number | null | undefined,
): number {
  const a = Number(assetYears) || 0;
  if (a > 0) return a;
  const c = Number(categoryYears) || 0;
  if (c > 0) return c;
  return DEFAULT_USEFUL_LIFE_YEARS;
}
