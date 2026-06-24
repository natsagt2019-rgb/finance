// ============================================================
// Үндсэн хөрөнгийн ДАХИН ҮНЭЛГЭЭНИЙ журнал бодох цөм — цэвэр функц.
// ============================================================
// Elimination арга: хуримтлагдсан элэгдлийг хорогдуулж, хөрөнгийг шинэ үнэ цэнэ
// (fair value) дээр тавина. Зөрүү → дахин үнэлгээний нөөц (өсөлт) эсвэл гарз (бууралт).
//
//   Дт хуримтлагдсан элэгдэл (accum)            ← хорогдуулна
//   Дт/Кт хөрөнгийн данс (fairValue − өртөг)     ← брутто өөрчлөлт
//   Кт дахин үнэлгээний нөөц (fairValue − NBV)   ← өсөлт бол
//   Дт ҮХ дахин үнэлгээний гарз (NBV − fairValue) ← бууралт бол
//
// (Засварын журнал нь buildAcquisitionJournal-тэй ижил тул түүнийг дахин ашиглана.)
// ============================================================

function r2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export type RevaluationAccounts = {
  asset: string; // хөрөнгийн данс (category.account_code)
  accum: string; // хуримтлагдсан элэгдэл (category.accum_account_code)
  surplus: string; // дахин үнэлгээний нөөц (520100)
  loss: string; // дахин үнэлгээний гарз (820900)
};

export type RevaluationInput = {
  cost: number; // одоогийн нийт (брутто) өртөг
  accumulated: number; // R хүртэлх хуримтлагдсан элэгдэл
  fairValue: number; // шинэ үнэ цэнэ (revalued carrying)
  accounts: RevaluationAccounts;
};

export type RevaluationLine = {
  code: string;
  debit: number;
  credit: number;
  description: string;
};

export type RevaluationResult =
  | {
      ok: true;
      nbv: number; // хуучин үлдэгдэл өртөг = өртөг − хуримтлагдсан
      surplus: number; // нөөц (≥0)
      loss: number; // гарз (≥0)
      lines: RevaluationLine[];
    }
  | { ok: false; error: string };

export function buildRevaluationJournal(input: RevaluationInput): RevaluationResult {
  const cost = r2(input.cost);
  const accum = r2(Math.min(Math.max(input.accumulated, 0), cost));
  const fair = r2(Math.max(input.fairValue, 0));
  if (cost <= 0) return { ok: false, error: "Хөрөнгийн өртөг 0 байна." };

  const nbv = r2(cost - accum);
  const diff = r2(fair - nbv); // + → нөөц, − → гарз
  const surplus = diff > 0 ? diff : 0;
  const loss = diff < 0 ? r2(-diff) : 0;
  const a = input.accounts;
  const note = "ҮХ дахин үнэлгээ";

  const lines: RevaluationLine[] = [];
  // 1) Хуримтлагдсан элэгдлийг хорогдуулна.
  if (accum > 0) lines.push({ code: a.accum, debit: accum, credit: 0, description: note });
  // 2) Хөрөнгийн дансны брутто өөрчлөлт (fairValue − өртөг).
  const assetDelta = r2(fair - cost);
  if (assetDelta > 0) lines.push({ code: a.asset, debit: assetDelta, credit: 0, description: note });
  else if (assetDelta < 0) lines.push({ code: a.asset, debit: 0, credit: r2(-assetDelta), description: note });
  // 3) Нөөц / гарз.
  if (surplus > 0) lines.push({ code: a.surplus, debit: 0, credit: surplus, description: note });
  if (loss > 0) lines.push({ code: a.loss, debit: loss, credit: 0, description: note });

  // Ижил данс давхар орвол нэгтгэх (хөрөнгө + accum ижил байх магадлал бага ч аюулгүй).
  const merged = new Map<string, RevaluationLine>();
  for (const l of lines) {
    const p = merged.get(l.code);
    if (p) { p.debit = r2(p.debit + l.debit); p.credit = r2(p.credit + l.credit); }
    else merged.set(l.code, { ...l });
  }
  const out: RevaluationLine[] = [];
  for (const l of merged.values()) {
    const net = r2(l.debit - l.credit);
    if (net > 0) out.push({ ...l, debit: net, credit: 0 });
    else if (net < 0) out.push({ ...l, debit: 0, credit: r2(-net) });
  }

  if (out.length < 2) return { ok: false, error: "Журналд дор хаяж 2 мөр шаардлагатай." };
  const dr = r2(out.reduce((s, l) => s + l.debit, 0));
  const cr = r2(out.reduce((s, l) => s + l.credit, 0));
  if (dr !== cr) return { ok: false, error: `Журнал баланслахгүй: дебет ${dr} ≠ кредит ${cr}.` };

  return { ok: true, nbv, surplus, loss, lines: out };
}
