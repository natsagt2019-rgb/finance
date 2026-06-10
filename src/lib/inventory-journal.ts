// ============================================================
// Бараа материалын журнал үүсгэгч — move → Дт/Кт мөрүүд.
// ============================================================
// Цэвэр функц. Эх дүрэм: БМ_Журнаалын_Бичилт.docx (МУБНББС).
// Данс бүрийг inv_settings-ийн бодит accounts.id-аар resolve хийнэ.
// ============================================================

import type { LineInput } from "@/app/(backoffice)/journals/types";
import { categoryLabel, type MoveLite } from "./inventory-calc";

// Журнал бодоход хэрэгтэй тохиргооны хөнгөн хэлбэр (resolved account_id-ууд).
export type InvJournalSettings = {
  categoryAccounts: Record<string, number | null>; // "120201" → account_id
  apAccountId: number | null;
  vatAccountId: number | null;
  shortageExpenseAccountId: number | null;
  staffReceivableAccountId: number | null;
};

// Журнал бодоход хэрэгтэй move-ийн хэсэг.
export type MoveForJournal = {
  type: MoveLite["type"];
  category_code: string;
  qty: number;
  total_cost: number; // бараа материалын өртөг (НӨАТ-гүй)
  vat_amount: number;
  counter_account_id: number | null; // зардал/өглөг/мөнгө тал (override)
};

export type BuildResult =
  | { ok: true; lines: LineInput[]; description: string }
  | { ok: false; error: string };

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// move → журналын мөрүүд. counter_account_id нь чиглэлээс хамаарч дебет эсвэл
// кредит тал болно. Хэрэв шаардлагатай данс тохируулагдаагүй бол алдаа буцаана.
export function buildJournalLines(
  move: MoveForJournal,
  settings: InvJournalSettings,
): BuildResult {
  const invId = settings.categoryAccounts[move.category_code] ?? null;
  const cat = categoryLabel(move.category_code);
  const cost = r2(move.total_cost);
  const vat = r2(move.vat_amount);

  if (cost <= 0) return { ok: false, error: "Журналд бичих дүн 0 байна." };
  if (invId == null)
    return {
      ok: false,
      error: `«${cat}» ангиллын бараа материалын данс тохируулаагүй байна (Тохиргоо таб).`,
    };

  // Чиглэл бүрийн нөгөө тал (зардал/өглөг/мөнгө/авлага).
  const lines: LineInput[] = [];

  switch (move.type) {
    // ── ОРЛОГО: Дт бараа (+НӨАТ) / Кт өглөг (эсвэл касс/банк) ──
    case "receipt": {
      const credit = move.counter_account_id ?? settings.apAccountId;
      if (credit == null)
        return { ok: false, error: "Кредит данс (өглөг/касс) тохируулаагүй байна." };
      lines.push({
        account_id: invId,
        debit: cost,
        credit: 0,
        description: `Бараа материал хүлээн авах — ${cat}`,
      });
      if (vat > 0) {
        if (settings.vatAccountId == null)
          return { ok: false, error: "НӨАТ-ын авлагын данс тохируулаагүй байна." };
        lines.push({
          account_id: settings.vatAccountId,
          debit: vat,
          credit: 0,
          description: "НӨАТ-ын суутгал (eBarimt)",
        });
      }
      lines.push({
        account_id: credit,
        debit: 0,
        credit: r2(cost + vat),
        description: "Нийлүүлэгчийн өглөг / төлбөр",
      });
      return { ok: true, lines, description: `БМ орлого — ${cat}` };
    }

    // ── ЗАРЛАГА / УСТГАЛ / ТООЛЛОГЫН ДУТАГДАЛ: Дт зардал/авлага / Кт бараа ──
    case "issue":
    case "disposal":
    case "count_adj": {
      const debit =
        move.counter_account_id ??
        (move.type === "issue" ? null : settings.shortageExpenseAccountId);
      if (debit == null)
        return {
          ok: false,
          error: "Дебет данс (зардал/авлага) тохируулаагүй байна.",
        };
      const label =
        move.type === "issue"
          ? `Бараа материал зарцуулах — ${cat}`
          : move.type === "disposal"
            ? `Бараа материал устгах — ${cat}`
            : `Тооллогын дутагдал — ${cat}`;
      lines.push({
        account_id: debit,
        debit: cost,
        credit: 0,
        description: label,
      });
      lines.push({
        account_id: invId,
        debit: 0,
        credit: cost,
        description: cat,
      });
      return { ok: true, lines, description: label };
    }

    // ── НИЙЛҮҮЛЭГЧИД БУЦААХ: Дт өглөг (+НӨАТ буцаалт) / Кт бараа ──
    case "return_supplier": {
      const debit = move.counter_account_id ?? settings.apAccountId;
      if (debit == null)
        return { ok: false, error: "Дебет данс (өглөг) тохируулаагүй байна." };
      lines.push({
        account_id: debit,
        debit: r2(cost + vat),
        credit: 0,
        description: `Нийлүүлэгчид буцаах — ${cat}`,
      });
      lines.push({
        account_id: invId,
        debit: 0,
        credit: cost,
        description: cat,
      });
      if (vat > 0) {
        if (settings.vatAccountId == null)
          return { ok: false, error: "НӨАТ-ын авлагын данс тохируулаагүй байна." };
        lines.push({
          account_id: settings.vatAccountId,
          debit: 0,
          credit: vat,
          description: "НӨАТ-ын буцаалт",
        });
      }
      return { ok: true, lines, description: `БМ буцаалт — ${cat}` };
    }

    // ── ДОТООД БУЦААЛТ (ашиглагдаагүй): Дт бараа / Кт зардал ──
    case "return_in": {
      const credit = move.counter_account_id;
      if (credit == null)
        return { ok: false, error: "Кредит данс (зардал) тохируулаагүй байна." };
      lines.push({
        account_id: invId,
        debit: cost,
        credit: 0,
        description: `Агуулахад буцааж хүлээлгэх — ${cat}`,
      });
      lines.push({
        account_id: credit,
        debit: 0,
        credit: cost,
        description: "Зардлаас хасах",
      });
      return { ok: true, lines, description: `БМ дотоод буцаалт — ${cat}` };
    }

    default:
      return { ok: false, error: "Тодорхойгүй гүйлгээний төрөл." };
  }
}
