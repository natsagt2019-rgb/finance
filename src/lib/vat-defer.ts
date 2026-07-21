// ============================================================
// Хойшлогдсон НӨАТ-ын амортизаци — цэвэр функц (шулуун шугам).
// ============================================================
// ҮХ-ийн худалдан авалтын НӨАТ-ыг 180500-д хойшлуулбал, хуулиар тэнцүү
// хэсгээр хасна: тоног төхөөрөмж 60 сар, барилга 120 сар. Эхлэх огнооноос
// (deferred_vat_start) сар бүр = НӨАТ ÷ сар. Сүүлийн сар үлдэгдлийг шингээнэ.
// Дт 130600 НӨАТ авлага / Кт 180500 Хойшлогдсон НӨАТ.
// ============================================================

function round(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}
function monthIndex(y: number, m: number): number {
  return y * 12 + m;
}
function ymOf(date: string | null): { year: number; month: number } | null {
  if (!date) return null;
  const m = /^(\d{4})-(\d{2})/.exec(date);
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

export type VatDeferInput = {
  deferredVat: number; // 180500-д хойшлогдсон нийт НӨАТ
  months: number; // амортизацийн хугацаа (60 / 120)
  startDate: string | null; // амортизаци эхлэх огноо (= худалдан авсан огноо)
};

export type VatDeferResult = {
  monthly: number; // тухайн (year, month)-ийн хасагдах НӨАТ
  accumulated: number; // тухайн сар хүртэл нийт хасагдсан
  remaining: number; // 180500-д үлдсэн НӨАТ
  fullyAmortized: boolean;
};

// Эхлэх сараас (start) хойш өнгөрсөн сарын тоо (тухайн сарыг оруулна).
function elapsed(start: string | null, year: number, month: number): number {
  const s = ymOf(start);
  if (!s) return 0;
  return monthIndex(year, month) - monthIndex(s.year, s.month) + 1;
}

// Тухайн (year, month)-д хасагдах хойшлогдсон НӨАТ.
export function computeVatDefer(
  input: VatDeferInput,
  year: number,
  month: number,
): VatDeferResult {
  const total = round(Math.max(input.deferredVat, 0));
  const months = Number(input.months) || 0;
  if (total <= 0 || months <= 0)
    return { monthly: 0, accumulated: 0, remaining: total, fullyAmortized: total <= 0 };

  const monthly = round(total / months);
  const n = elapsed(input.startDate, year, month);
  const accumAt = (k: number) => Math.min(Math.max(k, 0) * monthly, total);
  const accumNow = accumAt(n);
  const accumPrev = accumAt(n - 1);
  return {
    monthly: round(accumNow - accumPrev),
    accumulated: round(accumNow),
    remaining: round(total - accumNow),
    fullyAmortized: accumNow >= total && total > 0,
  };
}

// AssetRow-ийн snake_case талбаруудыг VatDeferInput руу буулгах туслах.
export function vatDeferInput(a: {
  deferred_vat?: number | null;
  deferred_vat_months?: number | null;
  deferred_vat_start?: string | null;
}): VatDeferInput {
  return {
    deferredVat: Number(a.deferred_vat) || 0,
    months: Number(a.deferred_vat_months) || 0,
    startDate: a.deferred_vat_start ?? null,
  };
}
