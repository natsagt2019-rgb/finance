import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { loadCompany } from "@/lib/company";
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

const TAX_CLASS_KIND: Record<string, string> = {
  non_deductible: "Байнгын",
  exempt_income: "Байнгын",
  temp_diff: "Түр",
};

// Албан ёсны маягтын толгой (тушаалын лавлагаа).
function FormHead() {
  return (
    <div className="text-right text-[11px] leading-4 text-zinc-500">
      Аж ахуйн нэгжийн орлогын
      <br />
      албан татварын тухай хууль (2019)
      <br />
      <span className="font-medium text-zinc-700">
        Сангийн сайдын 2020 оны А/144 тушаалын хавсралт
      </span>
    </div>
  );
}

function SignatureCell({ role, name }: { role: string; name: string }) {
  return (
    <div>
      <p>{role}:</p>
      <div className="mt-6 text-center">
        <p className="border-b border-zinc-500 pb-1">
          {name ? <span className="font-medium text-zinc-800">{name}</span> : <>&nbsp;</>}
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">/ гарын үсэг, тэмдэг /</p>
      </div>
    </div>
  );
}

export default async function CorporateTaxPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [years, company] = await Promise.all([
    reportYears(supabase),
    loadCompany(),
  ]);
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
  const periodText = rangeMode ? `${from} — ${to}` : `${selYear} он`;

  // Албан ёсны тооцооны мөрүүд (дугаарлалтай).
  const lines: { no: string; label: string; value: number; strong?: boolean }[] = [
    { no: "1", label: "Татвар төлөхийн өмнөх ашиг (алдагдал)", value: r.profitBeforeTax, strong: true },
    { no: "2", label: "Нэмэх: Татварын хувьд хасагдахгүй зардал /байнгын зөрүү/", value: r.permanentAdd },
    { no: "3", label: "Хасах: Татвараас чөлөөлөгдөх орлого /байнгын зөрүү/", value: r.permanentLess },
    { no: "4", label: "Нэмэх (хасах): Түр зөрүүний цэвэр нөлөө", value: r.tempDiff },
    { no: "5", label: "Татвар ногдох орлого /алдагдал шилжүүлэхээс өмнө/", value: r.taxableBeforeLoss, strong: true },
    { no: "6", label: "Хасах: Өмнөх оны алдагдлын шилжүүлэг /≤50%/", value: r.lossUsed },
    { no: "7", label: "Татвар ногдох орлого", value: r.taxableIncome, strong: true },
    { no: "8", label: `Ногдуулсан албан татвар /${r.smallBusiness ? "1%" : "10% / 25%"}/`, value: r.taxGross, strong: true },
    { no: "9", label: "Хасах: Суутгасан / урьдчилж төлсөн татвар", value: r.withholdingPaid },
    { no: "10", label: "Төлбөл зохих албан татвар", value: r.taxPayable, strong: true },
  ];

  return (
    <div>
      {/* Удирдлагын мөр — хэвлэхэд харагдахгүй */}
      <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            ААНОАТ-ын тайлан — зөрүүгийн тулгалт
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Албан ёсны маягтын хэлбэр. Хэвлэх товчоор PDF/цаасаар гаргана.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {!rangeMode && (
            <form method="get" className="flex items-end gap-2">
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
              <label className="flex items-center gap-1.5 text-sm text-zinc-700">
                <input type="checkbox" name="small" value="1" defaultChecked={params.smallBusiness} className="h-4 w-4 rounded border-zinc-300" />
                Жижиг ААН (1%)
              </label>
              <div>
                <label className="block text-[11px] text-zinc-500">Өмнөх алдагдал</label>
                <input type="number" name="loss" step="0.01" min="0" defaultValue={params.priorLoss || ""} placeholder="0" className="w-36 rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500">Суутгасан татвар</label>
                <input type="number" name="wht" step="0.01" min="0" defaultValue={params.withholdingPaid || ""} placeholder="0" className="w-36 rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
              </div>
              <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                Тооцоолох
              </button>
            </form>
          )}
          <PrintButton />
        </div>
      </div>

      {/* ── Албан ёсны маягт ── */}
      <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-8 text-sm leading-6 text-zinc-800 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <FormHead />
        <h2 className="mt-2 text-center text-base font-bold uppercase text-zinc-900">
          Аж ахуйн нэгжийн орлогын албан татварын тайлан
        </h2>
        <p className="text-center text-xs text-zinc-500">
          /Санхүүгийн болон татварын тайлангийн үзүүлэлт хоорондын зөрүүг тулгасан тооцоо/
        </p>

        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-[13px]">
          <div>Татвар төлөгч: <b>{company.name || "—"}</b></div>
          <div>Тайлант үе: <b>{periodText}</b></div>
          <div>Татвар төлөгчийн дугаар (ТТД): <b>{company.register || "—"}</b></div>
          <div>Хэмжих нэгж: <b>төгрөг</b></div>
        </div>

        {/* Тооцооны хүснэгт */}
        <table className="mt-4 w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-zinc-100 text-center text-zinc-600">
              <th className="w-10 border border-zinc-300 px-2 py-1.5">№</th>
              <th className="border border-zinc-300 px-2 py-1.5 text-left">Үзүүлэлт</th>
              <th className="w-44 border border-zinc-300 px-2 py-1.5 text-right">Дүн</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((ln) => (
              <tr key={ln.no} className={ln.strong ? "bg-zinc-50 font-semibold" : ""}>
                <td className="border border-zinc-300 px-2 py-1.5 text-center text-zinc-500">{ln.no}</td>
                <td className="border border-zinc-300 px-2 py-1.5">{ln.label}</td>
                <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(ln.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {r.taxableIncome > CIT_BRACKET && !r.smallBusiness && (
          <p className="mt-1 text-[11px] text-zinc-500">
            * Татвар ногдох орлого 6.0 тэрбум төгрөгөөс давсан тул түүнээс дээш дүнд 25 хувиар татвар ногдуулав.
          </p>
        )}

        {/* Зөрүүгийн дэлгэрэнгүй (А/144) */}
        <h3 className="mt-6 text-center text-[13px] font-bold uppercase text-zinc-900">
          Зөрүүгийн дэлгэрэнгүй тулгалт
        </h3>
        <table className="mt-2 w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-zinc-100 text-center text-zinc-600">
              <th className="w-8 border border-zinc-300 px-2 py-1.5">№</th>
              <th className="border border-zinc-300 px-2 py-1.5 text-left">Данс / үзүүлэлт</th>
              <th className="w-28 border border-zinc-300 px-2 py-1.5 text-right">Санхүүгийн дүн</th>
              <th className="w-28 border border-zinc-300 px-2 py-1.5 text-right">Татварын дүн</th>
              <th className="w-24 border border-zinc-300 px-2 py-1.5 text-right">Зөрүү</th>
              <th className="w-20 border border-zinc-300 px-2 py-1.5">Төрөл</th>
            </tr>
          </thead>
          <tbody>
            {r.lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-zinc-300 px-2 py-4 text-center text-zinc-400">
                  Зөрүүтэй данс алга. /Дансны жагсаалтаас «ААНОАТ зөрүүгийн ангилал» сонгож тэмдэглэнэ/
                </td>
              </tr>
            ) : (
              r.lines.map((l, i) => (
                <tr key={l.code} className="text-center">
                  <td className="border border-zinc-300 px-2 py-1 text-zinc-500">{i + 1}</td>
                  <td className="border border-zinc-300 px-2 py-1 text-left">{l.code} — {l.name}</td>
                  <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(l.financial)}</td>
                  <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(l.tax)}</td>
                  <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums font-medium">{fmt(l.diff)}</td>
                  <td className="border border-zinc-300 px-2 py-1">{TAX_CLASS_KIND[l.taxClass]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Гарын үсэг */}
        <div className="mt-10 grid grid-cols-2 gap-12">
          <SignatureCell role="Захирал" name={company.director} />
          <SignatureCell role="Ерөнхий нягтлан бодогч" name={company.accountant} />
        </div>
      </div>
    </div>
  );
}
