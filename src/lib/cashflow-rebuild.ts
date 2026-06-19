// Дотоод ангиллын код (transactions.income_code/expense_code) → E-balance
// CC№361 мөнгөн гүйлгээний тайлангийн мөрийн код (cf_code).
//
// Мөнгөн гүйлгээний тайлан (reports/cash-flow) нь cash_flow_lines хүснэгтээс
// уншина. Энэ зураглалаар transactions-аас дахин дүгнэж тэр хүснэгтийг бичнэ
// (rebuildCashFlow action). cf_code-ууд нь fs-report.ts → CASH_FLOW мөрүүдтэй
// тааран ('1.2.5'→"Түлш…", '1.2.9'→"Бусад…") тайланд харагдана.
export const CASHFLOW_CF_MAP: Record<string, string> = {
  // ── Орлого ──
  "1.1.1": "1.1.1", // Тээврийн орлого → Бараа/үйлчилгээний орлого
  "1.1.2": "1.1.1", // Авлага/тооцоо цуглуулалт → орлого
  "1.1.3": "1.1.6", // Хүүгийн орлого → бусад мөнгөн орлого
  "1.1.4": "1.1.6", // Буцаалт → бусад
  "5.1.2": "3.1.1", // Охин компаниас зээл авсан → санхүүжилт (зээл авсан)
  "5.1.3": "1.1.6", // Ажилтан зээл буцаалт → бусад
  // ── Зарлага ──
  "1.2.1": "1.2.5", // Поткийн зардал (ББӨ) → Түлш, шатахуун, тээврийн хөлс, сэлбэг
  "1.2.2": "1.2.5", // Поткийн зардал (өмнөх сар) → мөн
  "2.1.1": "1.2.1", // Цалин → Ажиллагчдад төлсөн
  "2.2.2": "1.2.1", // Мост Мони (цалин шилжүүлэг) → Ажиллагчдад төлсөн
  "2.2.4": "1.2.2", // НДШ/ЭМНДШ → Нийгмийн даатгалын байгууллагад төлсөн
  "2.2.1": "1.2.7", // ХХОАТ → Татварын байгууллагад төлсөн
  "2.2.3": "1.2.7", // НӨАТ/ААН татвар → Татварын байгууллагад төлсөн
  "2.1.3": "1.2.9", // Томилолт → бусад мөнгөн зарлага
  "2.1.5": "1.2.9", // Сургалт → бусад
  "2.1.10": "1.2.9", // Түрээс → бусад
  "2.1.14": "1.2.9", // Банкны шимтгэл → бусад
  "5.2.3": "1.2.9", // Ажилтан зээл олголт → бусад
  "3.2.1": "2.2.1", // Компьютер/техник → Хөрөнгө оруулалт (ҮХ олж эзэмшихэд төлсөн)
  "3.2.2": "2.2.1", // Тавилга → мөн
  "5.2.2": "3.2.1", // Охин компанид зээл эргэн төлсөн → санхүүжилт (зээл төлсөн)
};

export type CashFlowTxn = {
  income: number | null;
  expense: number | null;
  exchange_rate: number | null;
  income_code: string | null;
  expense_code: string | null;
};

export type CashFlowAgg = {
  rows: { cf_code: string; amount: number }[];
  income: number; // MNT — орлогын талын нийт (мэдээллийн)
  expense: number; // MNT — зарлагын талын нийт (мэдээллийн)
  unmapped: string[]; // зураглагдаагүй ангиллын кодууд (алгассан)
};

// Гүйлгээнүүдийг E-balance cf_code-оор нэгтгэнэ. Валютыг ханшаар MNT болгоно
// (exchange_rate; MNT-д 1). amount эерэг хадгална — тайлан ".2." кодыг сөрөг
// болгож хасна. Зураглагдаагүй ангиллыг алгасаж, кодыг unmapped-д буцаана.
export function aggregateCashFlow(txns: CashFlowTxn[]): CashFlowAgg {
  const agg = new Map<string, number>();
  const unmapped = new Set<string>();
  for (const t of txns) {
    const rate = Number(t.exchange_rate) || 1;
    if (Number(t.income) > 0 && t.income_code) {
      const cf = CASHFLOW_CF_MAP[t.income_code];
      if (!cf) {
        unmapped.add(t.income_code);
        continue;
      }
      agg.set(cf, (agg.get(cf) ?? 0) + Number(t.income) * rate);
    } else if (Number(t.expense) > 0 && t.expense_code) {
      const cf = CASHFLOW_CF_MAP[t.expense_code];
      if (!cf) {
        unmapped.add(t.expense_code);
        continue;
      }
      agg.set(cf, (agg.get(cf) ?? 0) + Number(t.expense) * rate);
    }
  }
  const round2 = (n: number) => Math.round(n * 100) / 100;
  let income = 0;
  let expense = 0;
  const rows = [...agg].map(([cf_code, amount]) => {
    if (cf_code.includes(".2.")) expense += amount;
    else income += amount;
    return { cf_code, amount: round2(amount) };
  });
  return { rows, income: round2(income), expense: round2(expense), unmapped: [...unmapped] };
}
