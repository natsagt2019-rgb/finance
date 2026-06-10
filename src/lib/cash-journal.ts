// ============================================================
// Кассын журнал үүсгэгч — баримт → Дт/Кт мөрүүд.
// ============================================================
// Цэвэр функц. Бэлэн мөнгөний данс (кассынх) нэг тал, нөгөө тал нь
// counter_account (орлого/зардал/авлага/өглөг). Дүн MNT-ээр.
//   in  (орлого):  Дт касс / Кт counter
//   out (зарлага): Дт counter / Кт касс
// ============================================================

import type { LineInput } from "@/app/(backoffice)/journals/types";
import type { CashType } from "./cash-calc";

export type CashJournalSettings = {
  defaultIncomeAccountId: number | null; // орлогын анхдагч Кт
  defaultExpenseAccountId: number | null; // зарлагын анхдагч Дт
};

export type EntryForJournal = {
  type: CashType;
  amount_mnt: number;
  cash_account_id: number | null; // кассын бэлэн мөнгөний данс (register)
  counter_account_id: number | null; // нөгөө тал (override)
};

export type BuildResult =
  | { ok: true; lines: LineInput[]; description: string }
  | { ok: false; error: string };

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function buildCashJournalLines(
  entry: EntryForJournal,
  settings: CashJournalSettings,
): BuildResult {
  const amount = r2(entry.amount_mnt);
  if (amount <= 0) return { ok: false, error: "Журналд бичих дүн 0 байна." };

  const cash = entry.cash_account_id;
  if (cash == null)
    return {
      ok: false,
      error: "Кассын бэлэн мөнгөний данс тохируулаагүй байна (Касс табаас данс сонгоно уу).",
    };

  const counter =
    entry.counter_account_id ??
    (entry.type === "in"
      ? settings.defaultIncomeAccountId
      : settings.defaultExpenseAccountId);
  if (counter == null)
    return {
      ok: false,
      error:
        entry.type === "in"
          ? "Орлогын нөгөө тал данс тохируулаагүй байна (баримт дээр сонгох эсвэл Тохиргоо таб)."
          : "Зарлагын нөгөө тал данс тохируулаагүй байна (баримт дээр сонгох эсвэл Тохиргоо таб).",
    };

  const lines: LineInput[] =
    entry.type === "in"
      ? [
          {
            account_id: cash,
            debit: amount,
            credit: 0,
            description: "Кассын орлого",
          },
          {
            account_id: counter,
            debit: 0,
            credit: amount,
            description: "Орлогын эх үүсвэр",
          },
        ]
      : [
          {
            account_id: counter,
            debit: amount,
            credit: 0,
            description: "Кассын зарлагын зориулалт",
          },
          {
            account_id: cash,
            debit: 0,
            credit: amount,
            description: "Кассын зарлага",
          },
        ];

  return {
    ok: true,
    lines,
    description: entry.type === "in" ? "Кассын орлого" : "Кассын зарлага",
  };
}
