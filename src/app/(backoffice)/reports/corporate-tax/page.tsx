import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { reportYears } from "@/lib/fs-from-journal";
import {
  buildTaxReport,
  CIT_BRACKET,
  type TaxParams,
} from "@/lib/tax-report";

type SearchParams = {
  year?: string;
  from?: string;
  to?: string;
  small?: string;
  loss?: string;
  wht?: string;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function fmt(n: number): string {
  if (!n) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const TAX_CLASS_LABEL: Record<string, string> = {
  non_deductible: "Хасагдахгүй зардал",
  exempt_income: "Чөлөөлөгдөх орлого",
  temp_diff: "Түр зөрүү",
};

export default async function CorporateTaxPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const years = await reportYears(supabase);
  if (years.length === 0) years.push(new Date().getFullYear());
  const selYear =
    sp.year && years.includes(Number(sp.year)) ? Number(sp.year) : years[0];

  const from = sp.from && ISO.test(sp.from) ? sp.from : "";
  const to = sp.to && ISO.test(sp.to) ? sp.to : "";
  const rangeMode = !!(from && to);

  const pFrom = rangeMode ? from : `${selYear}-01-01`;
  const pTo = rangeMode ? to : `${selYear}-12-31`;

  const params: TaxParams = {
    smallBusiness: sp.small === "1",
    priorLoss: Math.max(0, Number(sp.loss) || 0),
    withholdingPaid: Math.max(0, Number(sp.wht) || 0),
  };

  const r = await buildTaxReport(supabase, pFrom, pTo, params);
  const label = rangeMode ? `${from} → ${to}` : `${selYear} он`;

  // Тооцооны гүүрийн мөрүүд (танилцуулга).
  const bridge: { label: string; value: number; strong?: boolean; sign?: string }[] = [
    { label: "Татвар төлөхийн өмнөх ашиг (алдагдал)", value: r.profitBeforeTax, strong: true },
    { label: "(+) Хасагдахгүй зардал /байнгын/", value: r.permanentAdd, sign: "+" },
    { label: "(−) Татвараас чөлөөлөгдөх орлого /байнгын/", value: r.permanentLess, sign: "−" },
    { label: "(±) Түр зөрүүний цэвэр нөлөө", value: r.tempDiff, sign: "±" },
    { label: "Татвар ногдох орлого /алдагдал хасахын өмнө/", value: r.taxableBeforeLoss, strong: true },
    { label: "(−) Өмнөх жилийн алдагдал шилжүүлэлт", value: r.lossUsed, sign: "−" },
    { label: "Татвар ногдох орлого", value: r.taxableIncome, strong: true },
    { label: `Ногдсон албан татвар /${r.smallBusiness ? "1%" : "10% / 25%"}/`, value: r.taxGross, strong: true },
    { label: "(−) Суутгасан / урьдчилж төлсөн татвар", value: r.withholdingPaid, sign: "−" },
    { label: "ТӨЛБӨЛ ЗОХИХ ААНОАТ", value: r.taxPayable, strong: true },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            ААНОАТ тайлан — зөрүүгийн тулгалт
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            А/144 журам · ААНОАТ хууль 2019.03.22 — {label}. Татвар төлөхийн
            өмнөх ашгийг татвар ногдох орлого руу хөрвүүлнэ.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {!rangeMode && (
            <form method="get" className="flex items-center gap-2">
              <select
                name="year"
                defaultValue={String(selYear)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} он
                  </option>
                ))}
              </select>
              {params.smallBusiness && <input type="hidden" name="small" value="1" />}
              {params.priorLoss > 0 && <input type="hidden" name="loss" value={String(params.priorLoss)} />}
              {params.withholdingPaid > 0 && <input type="hidden" name="wht" value={String(params.withholdingPaid)} />}
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Шинэчлэх
              </button>
            </form>
          )}
          <PrintButton />
        </div>
      </div>

      {/* Татварын параметр */}
      <form
        method="get"
        className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm print:hidden"
      >
        <input type="hidden" name="year" value={String(selYear)} />
        {rangeMode && <input type="hidden" name="from" value={from} />}
        {rangeMode && <input type="hidden" name="to" value={to} />}
        <label className="flex items-center gap-2 text-zinc-700">
          <input
            type="checkbox"
            name="small"
            value="1"
            defaultChecked={params.smallBusiness}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Жижиг ААН (1% хувь · орлого &lt; 300 сая)
        </label>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Өмнөх жилийн алдагдал (₮)
          </label>
          <input
            type="number"
            name="loss"
            step="0.01"
            min="0"
            defaultValue={params.priorLoss || ""}
            placeholder="0"
            className="w-44 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Суутгасан татвар (₮)
          </label>
          <input
            type="number"
            name="wht"
            step="0.01"
            min="0"
            defaultValue={params.withholdingPaid || ""}
            placeholder="0"
            className="w-44 rounded-lg border border-zinc-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-3 py-2 font-medium text-white hover:bg-zinc-700"
        >
          Тооцоолох
        </button>
      </form>

      {/* Тооцооны гүүр */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left">Үзүүлэлт</th>
              <th className="px-4 py-2 text-right">Дүн (₮)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {bridge.map((b, i) => {
              const isPayable = b.label.startsWith("ТӨЛБӨЛ");
              return (
                <tr
                  key={i}
                  className={
                    isPayable
                      ? "border-t-2 border-zinc-300 bg-amber-50 font-semibold"
                      : b.strong
                        ? "bg-zinc-50/60 font-semibold"
                        : ""
                  }
                >
                  <td
                    className={`px-4 py-1.5 ${b.strong ? "font-semibold text-zinc-900" : "text-zinc-700"}`}
                  >
                    {b.label}
                  </td>
                  <td
                    className={`px-4 py-1.5 text-right tabular-nums ${b.strong ? "font-semibold text-zinc-900" : "text-zinc-600"}`}
                  >
                    {fmt(b.value)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {r.taxableIncome > CIT_BRACKET && !r.smallBusiness && (
        <p className="mt-2 text-xs text-zinc-500 print:hidden">
          Татвар ногдох орлого 6 тэрбум ₮-аас давсан тул илүү дүнд 25% хувь
          ноогдсон.
        </p>
      )}

      {/* Зөрүүгийн дэлгэрэнгүй тулгалт */}
      <h2 className="mt-8 text-lg font-semibold text-zinc-900">
        Зөрүүгийн дэлгэрэнгүй тулгалт (данс бүрээр)
      </h2>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left">Данс</th>
              <th className="px-4 py-2 text-left">Зөрүүний төрөл</th>
              <th className="px-4 py-2 text-right">Санхүүгийн дүн</th>
              <th className="px-4 py-2 text-right">Татварын дүн</th>
              <th className="px-4 py-2 text-right">Зөрүү</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {r.lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  Зөрүүтэй данс алга. Дансны жагсаалтаас орлого/зардлын дансанд
                  «ААНОАТ зөрүүгийн ангилал» сонгож тэмдэглэнэ үү.
                </td>
              </tr>
            ) : (
              r.lines.map((ln) => (
                <tr key={ln.code}>
                  <td className="px-4 py-1.5 text-zinc-700">
                    {ln.code} — {ln.name}
                  </td>
                  <td className="px-4 py-1.5 text-zinc-600">
                    {TAX_CLASS_LABEL[ln.taxClass] ?? ln.taxClass}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-zinc-600">
                    {fmt(ln.financial)}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-zinc-600">
                    {fmt(ln.tax)}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums font-medium text-zinc-900">
                    {fmt(ln.diff)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Түр зөрүүний (temp_diff) татварын талыг гараар тогтоох хэсэг дараагийн
        шатанд нэмэгдэнэ. Одоогоор хасагдахгүй зардал ба чөлөөлөгдөх орлогын
        байнгын зөрүүг автоматаар тооцож байна.
      </p>
    </div>
  );
}
