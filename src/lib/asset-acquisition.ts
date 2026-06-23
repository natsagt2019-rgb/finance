// ============================================================
// Үндсэн хөрөнгийн ХУДАЛДАН АВАЛТЫН журнал бодох цөм — цэвэр функц.
// ============================================================
// asset-disposal.ts-тэй ижил хэв маяг. Журналыг дансны КОДоор бүрдүүлж буцаана;
// дуудагч код→id хөрвүүлж postJournal руу дамжуулна.
//
// ── Худалдан авалт ──
//   Дт хөрөнгийн данс (цэвэр өртөг)
//   Дт НӨАТ-ын авлага (худалдан авалтын НӨАТ)   ← НӨАТ > 0 бол
//   Кт тооцооны данс (нийт = өртөг + НӨАТ)       ← өглөг 310100 / касс / харилцах
// ============================================================

function r2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export type AcquisitionAccounts = {
  asset: string; // хөрөнгийн данс (category.account_code)
  inputVat: string; // НӨАТ-ын авлага (130600)
  settlement: string; // өглөг/мөнгө (310100 / 110100 / 110200)
};

export type AcquisitionInput = {
  cost: number; // цэвэр өртөг (НӨАТгүй)
  vat?: number; // худалдан авалтын НӨАТ (≥0)
  accounts: AcquisitionAccounts;
};

export type AcquisitionLine = {
  code: string;
  debit: number;
  credit: number;
  description: string;
};

export type AcquisitionResult =
  | { ok: true; cost: number; vat: number; gross: number; lines: AcquisitionLine[] }
  | { ok: false; error: string };

// Худалдан авалтын балансжсан журналын мөрүүдийг (код хэлбэрээр) бодно.
export function buildAcquisitionJournal(input: AcquisitionInput): AcquisitionResult {
  const cost = r2(input.cost);
  if (cost <= 0) return { ok: false, error: "Хөрөнгийн өртөг 0 байна." };

  const vat = r2(Math.max(input.vat ?? 0, 0));
  const gross = r2(cost + vat);
  const a = input.accounts;
  const note = "ҮХ худалдан авалт";

  const lines: AcquisitionLine[] = [
    { code: a.asset, debit: cost, credit: 0, description: note },
  ];
  if (vat > 0)
    lines.push({ code: a.inputVat, debit: vat, credit: 0, description: "Худалдан авалтын НӨАТ" });
  lines.push({ code: a.settlement, debit: 0, credit: gross, description: note });

  // Баланс шалгах.
  const dr = r2(lines.reduce((s, l) => s + l.debit, 0));
  const cr = r2(lines.reduce((s, l) => s + l.credit, 0));
  if (dr !== cr) return { ok: false, error: `Журнал баланслахгүй: дебет ${dr} ≠ кредит ${cr}.` };

  return { ok: true, cost, vat, gross, lines };
}
