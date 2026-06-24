// ============================================================
// Үндсэн хөрөнгийн ХАСАЛТ / БОРЛУУЛАЛТЫН журнал бодох цөм — цэвэр функц.
// ============================================================
// asset-calc.ts-тэй адил: page (preview) болон action (хадгалах) хоёул дуудна
// — бүртгэлийн логикийн нэг эх сурвалж. Журналыг дансны КОДоор бүрдүүлнэ;
// дуудагч код→id хөрвүүлж postJournal руу дамжуулна.
//
// Хасах огнооны сар ХҮРТЭЛ хуримтлагдсан элэгдлийг (asset-calc.ts-ээр) тооцоод
// тэр дүнгээр контра дансыг хаана. Тиймээс хасахаас өмнө тухайн сарын элэгдлийг
// бодсон байх ёстой (хуримтлагдсан дүнд тухайн сар орсон гэж үзнэ).
//
// ── Хасалт (актлах, орлогогүй) ──
//   Дт хуримтлагдсан элэгдэл (accum)
//   Дт ҮХ хассаны гарз (NBV)              ← NBV > 0 бол
//   Кт хөрөнгийн данс (өртөг)
//
// ── Борлуулалт (орлоготой) ──
//   Дт тооцооны данс (нийт = үнэ + НӨАТ)
//   Дт хуримтлагдсан элэгдэл (accum)      ← accum > 0 бол
//   Кт хөрөнгийн данс (өртөг)
//   Кт НӨАТ-ын өглөг (НӨАТ)               ← НӨАТ > 0 бол
//   Кт ҮХ борлуулсны олз (үнэ − NBV)      ← олзтой бол
//   Дт ҮХ хассаны гарз (NBV − үнэ)        ← гарзтай бол
// ============================================================

function r2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export type DisposalType = "writeoff" | "sale";

// Журналд орох дансны кодууд (категори/тохиргооноос).
export type DisposalAccounts = {
  asset: string; // хөрөнгийн данс (category.account_code)
  accum: string; // хуримтлагдсан элэгдэл (category.accum_account_code)
  gain: string; // ҮХ борлуулсны олз (620500)
  loss: string; // ҮХ хассаны гарз (820100)
  vatPayable: string; // НӨАТ-ын өглөг (330100)
  settlement: string; // борлуулалтын тооцоо хүлээх данс (110100/110200/130100)
};

export type DisposalInput = {
  type: DisposalType;
  cost: number; // анхны өртөг
  accumulated: number; // хасах огноо хүртэлх хуримтлагдсан элэгдэл
  proceeds?: number; // борлуулалтын үнэ (НӨАТгүй, цэвэр)
  vat?: number; // НӨАТ-ын дүн (≥0)
  accounts: DisposalAccounts;
};

export type DisposalLine = {
  code: string;
  debit: number;
  credit: number;
  description: string;
};

export type DisposalResult =
  | {
      ok: true;
      nbv: number; // үлдэгдэл (дансны) өртөг = өртөг − хуримтлагдсан
      gain: number; // олз (≥0)
      loss: number; // гарз (≥0)
      proceeds: number;
      vat: number;
      gross: number; // тооцоонд хүлээх нийт дүн (үнэ + НӨАТ)
      lines: DisposalLine[];
    }
  | { ok: false; error: string };

// Хасалт/борлуулалтын балансжсан журналын мөрүүдийг (код хэлбэрээр) бодно.
export function buildDisposalJournal(input: DisposalInput): DisposalResult {
  const cost = r2(input.cost);
  if (cost <= 0) return { ok: false, error: "Хөрөнгийн өртөг 0 байна." };

  // Хуримтлагдсан элэгдэл өртгөөс хэтрэхгүй.
  const accum = r2(Math.min(Math.max(input.accumulated, 0), cost));
  const nbv = r2(cost - accum);
  const a = input.accounts;

  const lines: DisposalLine[] = [];
  const note = input.type === "sale" ? "ҮХ борлуулалт" : "ҮХ хасалт";

  if (input.type === "writeoff") {
    // Хасалт — орлогогүй актлах.
    if (accum > 0) lines.push({ code: a.accum, debit: accum, credit: 0, description: note });
    if (nbv > 0) lines.push({ code: a.loss, debit: nbv, credit: 0, description: note });
    lines.push({ code: a.asset, debit: 0, credit: cost, description: note });

    return finalize(lines, { nbv, gain: 0, loss: nbv, proceeds: 0, vat: 0, gross: 0 });
  }

  // Борлуулалт.
  const proceeds = r2(Math.max(input.proceeds ?? 0, 0));
  const vat = r2(Math.max(input.vat ?? 0, 0));
  const gross = r2(proceeds + vat);
  const diff = r2(proceeds - nbv); // + → олз, − → гарз
  const gain = diff > 0 ? diff : 0;
  const loss = diff < 0 ? r2(-diff) : 0;

  if (gross > 0) lines.push({ code: a.settlement, debit: gross, credit: 0, description: note });
  if (accum > 0) lines.push({ code: a.accum, debit: accum, credit: 0, description: note });
  if (loss > 0) lines.push({ code: a.loss, debit: loss, credit: 0, description: note });
  lines.push({ code: a.asset, debit: 0, credit: cost, description: note });
  if (vat > 0) lines.push({ code: a.vatPayable, debit: 0, credit: vat, description: "Борлуулалтын НӨАТ" });
  if (gain > 0) lines.push({ code: a.gain, debit: 0, credit: gain, description: note });

  return finalize(lines, { nbv, gain, loss, proceeds, vat, gross });
}

// Балансыг шалгаж, ижил (код+тал) мөрүүдийг нэгтгэнэ.
function finalize(
  rawLines: DisposalLine[],
  meta: { nbv: number; gain: number; loss: number; proceeds: number; vat: number; gross: number },
): DisposalResult {
  // Ижил данс давхар орвол (ж: тооцоо ба хөрөнгийн данс ижил тохиолдвол) нэгтгэх.
  const merged = new Map<string, DisposalLine>();
  for (const l of rawLines) {
    const key = l.code;
    const prev = merged.get(key);
    if (prev) {
      prev.debit = r2(prev.debit + l.debit);
      prev.credit = r2(prev.credit + l.credit);
    } else {
      merged.set(key, { ...l });
    }
  }
  // Дт/Кт цэвэршүүлэх (нэг данс хоёр талд орвол зөрүүгээр).
  const lines: DisposalLine[] = [];
  for (const l of merged.values()) {
    const net = r2(l.debit - l.credit);
    if (net > 0) lines.push({ ...l, debit: net, credit: 0 });
    else if (net < 0) lines.push({ ...l, debit: 0, credit: r2(-net) });
    // net === 0 → мөр хасагдана
  }

  if (lines.length < 2) return { ok: false, error: "Журналд дор хаяж 2 мөр шаардлагатай." };
  const dr = r2(lines.reduce((s, l) => s + l.debit, 0));
  const cr = r2(lines.reduce((s, l) => s + l.credit, 0));
  if (dr !== cr)
    return { ok: false, error: `Журнал баланслахгүй: дебет ${dr} ≠ кредит ${cr}.` };

  return { ok: true, lines, ...meta };
}
