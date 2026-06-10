// Гүйлгээ балансын доод P&L хураангуй (fino.mn-тэй ижил).
// Орлого − ББӨ − Зардал = татвар төлөхийн өмнөх ашиг; ОАТ 10% тооцоо; Ашиг.

export type PnlSummary = {
  income: number; // Орлого
  cogs: number; // ББӨ (борлуулсан бүтээгдэхүүний өртөг)
  expense: number; // Зардал (үйл ажиллагааны)
};

function fmt(n: number): string {
  if (!n) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export function PnlSummaryBox({ pnl }: { pnl: PnlSummary }) {
  const pbt = pnl.income - pnl.cogs - pnl.expense; // татвар өмнөх ашиг
  const tax = pbt > 0 ? pbt * 0.1 : 0; // ОАТ 10% (тооцоо)
  const profit = pbt - tax; // цэвэр ашиг

  const rows: { label: string; value: number; strong?: boolean }[] = [
    { label: "Орлого", value: pnl.income },
    { label: "ББӨ", value: pnl.cogs },
    { label: "Зардал", value: pnl.expense },
    { label: "ОАТ 10%", value: tax },
    { label: "Ашиг", value: profit, strong: true },
  ];

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-green-200 bg-green-50">
      {rows.map((r, i) => (
        <div
          key={i}
          className={`flex items-center justify-between border-b border-green-100 px-6 py-3 last:border-0 ${
            r.strong ? "bg-green-100/70" : ""
          }`}
        >
          <span
            className={`text-sm ${r.strong ? "font-bold text-green-900" : "font-semibold text-green-800"}`}
          >
            {r.label}
          </span>
          <span
            className={`tabular-nums ${
              r.strong
                ? "text-base font-bold text-green-900"
                : "text-sm font-medium text-green-700"
            }`}
          >
            {fmt(r.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
