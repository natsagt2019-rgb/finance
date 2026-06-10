// ── Ханшийн тэгшитгэл (FX revaluation) — цэвэр тооцооллын логик ───────────────
// Тайлант үеийн эцэст валютын дансны үлдэгдлийг тухайн үеийн ханшаар дахин
// үнэлж, бичилтийн өмнөх дэвтрийн дүнтэй харьцуулан зөрүүг (олз/гарз) гаргана.
//
// Бүх дүнг "дебет-эерэг" (debit-positive) тэмдэгтэйгээр боддог:
//   • Актив данс  → үлдэгдэл эерэг (дебет).
//   • Пассив данс → үлдэгдэл сөрөг (кредит).
// Энэ нэгдсэн орон зайд:
//   diff > 0  ⇒ дансыг Дебет, эсрэг тал Кредит → 620xxx Ханшийн ОЛЗ
//   diff < 0  ⇒ дансыг Кредит, эсрэг тал Дебет → 810xxx Ханшийн ГАРЗ
// Энэ дүрэм актив, пассив хоёуланд зөв (жишээ нь валютын өглөгийн ханш өсөх нь
// гарз, валютын авлага/кассын ханш өсөх нь олз болж байгаа нь автоматаар гарна).

export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Дансны "нөхөн төлбөрт шинж" — дебет-нормаль эсэх.
// nature: 'Актив' (дебет) | 'Пассив' (кредит). nature байхгүй бол type-аар.
export function isDebitNormal(
  nature: string | null | undefined,
  type?: string | null,
): boolean {
  const n = (nature ?? "").trim();
  if (n === "Актив") return true;
  if (n === "Пассив") return false;
  return type === "asset" || type === "expense";
}

export type FxLineInput = {
  // Дансны дебет-эерэг дэвтрийн үлдэгдэл (MNT), тэгшитгэлийн өмнөх.
  bookBalance: number;
  // Гадаад валютын үлдэгдэл (эерэг хэмжээ, жишээ нь 1000 USD).
  fxBalance: number;
  // Тухайн үеийн ханш (1 нэгж валют → MNT).
  rate: number;
  nature: string | null;
  type?: string | null;
};

export type FxLineResult = {
  // Шинэ үнэлгээ дебет-эерэг тэмдэгтэйгээр (MNT).
  revalued: number;
  // Зөрүү = revalued − bookBalance (дебет-эерэг).
  diff: number;
  // Олз (diff > 0 үед эерэг, эс бөгөөс 0).
  gain: number;
  // Гарз (diff < 0 үед эерэг, эс бөгөөс 0).
  loss: number;
};

// Нэг дансны тэгшитгэлийн зөрүүг бодно.
export function computeFxLine(input: FxLineInput): FxLineResult {
  const debitNormal = isDebitNormal(input.nature, input.type);
  const magnitude = round2((Number(input.fxBalance) || 0) * (Number(input.rate) || 0));
  // Актив бол үнэлгээ дебет-эерэг (+), Пассив бол кредит (−).
  const revalued = debitNormal ? magnitude : -magnitude;
  const diff = round2(revalued - (Number(input.bookBalance) || 0));
  return {
    revalued,
    diff,
    gain: diff > 0 ? diff : 0,
    loss: diff < 0 ? -diff : 0,
  };
}

export type FxJournalLine = {
  account_id: number;
  debit: number;
  credit: number;
  description: string;
};

export type FxLineForJournal = {
  account_id: number;
  account_code: string;
  diff: number; // дебет-эерэг зөрүү
};

// Тэгшитгэлийн зөрүүнүүдээс баланслагдсан журналын мөрүүд босгоно.
//   • diff > 0 → данс Дебет, нийт олзыг 620xxx Кредит рүү.
//   • diff < 0 → данс Кредит, нийт гарзыг 810xxx Дебет рүү.
export function buildFxJournalLines(
  lines: FxLineForJournal[],
  gainAccountId: number, // 620xxx Ханшийн олз
  lossAccountId: number, // 810xxx Ханшийн гарз
): FxJournalLine[] {
  const out: FxJournalLine[] = [];
  let totalGain = 0;
  let totalLoss = 0;

  for (const l of lines) {
    const diff = round2(l.diff);
    if (diff === 0) continue;
    if (diff > 0) {
      out.push({
        account_id: l.account_id,
        debit: diff,
        credit: 0,
        description: `Ханшийн тэгшитгэл — ${l.account_code} (олз)`,
      });
      totalGain = round2(totalGain + diff);
    } else {
      out.push({
        account_id: l.account_id,
        debit: 0,
        credit: -diff,
        description: `Ханшийн тэгшитгэл — ${l.account_code} (гарз)`,
      });
      totalLoss = round2(totalLoss + -diff);
    }
  }

  if (totalGain > 0) {
    out.push({
      account_id: gainAccountId,
      debit: 0,
      credit: totalGain,
      description: "Ханшийн зөрүүний олз",
    });
  }
  if (totalLoss > 0) {
    out.push({
      account_id: lossAccountId,
      debit: totalLoss,
      credit: 0,
      description: "Ханшийн зөрүүний гарз",
    });
  }

  return out;
}
