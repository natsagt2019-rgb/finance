import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { loadCompany } from "@/lib/company";
import { buildPitReport, pitReportYears } from "@/lib/pit-report";
import { Tt11ExportButton } from "./tt11-export";

type SearchParams = { year?: string; period?: string };

// period: "annual" | "q1".."q4" | "1".."12"
function monthRange(period: string): [number, number] {
  if (period === "annual" || !period) return [1, 12];
  const q: Record<string, [number, number]> = {
    q1: [1, 3],
    q2: [4, 6],
    q3: [7, 9],
    q4: [10, 12],
  };
  if (q[period]) return q[period];
  const m = Number(period);
  if (Number.isInteger(m) && m >= 1 && m <= 12) return [m, m];
  return [1, 12];
}

function fmt(n: number): string {
  if (!n) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "annual", label: "Жилийн дүн" },
  { value: "q1", label: "I улирал" },
  { value: "q2", label: "II улирал" },
  { value: "q3", label: "III улирал" },
  { value: "q4", label: "IV улирал" },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}-р сар`,
  })),
];

function FormHead() {
  return (
    <div className="text-right text-[11px] leading-4 text-zinc-500">
      Хувь хүний орлогын
      <br />
      албан татварын тухай хууль (2019)
      <br />
      <span className="font-medium text-zinc-700">Суутган төлөгчийн тайлан</span>
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

export default async function PersonalIncomeTaxPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [years, company] = await Promise.all([
    pitReportYears(supabase),
    loadCompany(),
  ]);
  if (years.length === 0) years.push(new Date().getFullYear());
  const selYear =
    sp.year && years.includes(Number(sp.year)) ? Number(sp.year) : years[0];
  const period = sp.period || "annual";
  const [fromMonth, toMonth] = monthRange(period);

  const r = await buildPitReport(supabase, selYear, fromMonth, toMonth);

  // Албан ёсны TT-11 нэгтгэлийн мөрүүд.
  const count = r.rows.length;
  const taxGross = Math.round(r.total.taxable * r.pitRate * 100) / 100;
  const relief = Math.round((taxGross - r.total.pit) * 100) / 100;
  // Татвар ногдох орлогоос ХАСАГДСАН НДШ = Нийт − Татвар ногдуулах орлого.
  // Гадаад ажилтны НДШ хасагдахгүй тул энэ нь нийт НДШ-ээс бага байж болно.
  const deductibleSh = Math.round((r.total.gross - r.total.taxable) * 100) / 100;
  // Хасагдаагүй НДШ (гол төлөв гадаад ажилтных) — мөр 12.
  const nonDeductibleSh = Math.round((r.total.shInsurance - deductibleSh) * 100) / 100;
  type Tt11Row = {
    no: string;
    label: string;
    count?: number;
    value: number;
    strong?: boolean;
    indent?: boolean;
  };
  const tt11Rows: Tt11Row[] = [
    { no: "1", label: "Цалин, хөдөлмөрийн хөлс, шагнал, урамшуулал болон тэдгээртэй адилтгах орлого", count, value: r.total.gross, strong: true },
    { no: "2", label: "1.1. Хөдөлмөрийн гэрээгээр авч буй цалин, хөлс, нэмэгдэл, шагнал, амралтын олговор г.м.", count, value: r.total.gross, indent: true },
    { no: "10", label: "Татвар ногдох орлого (1−9)", count, value: r.total.gross, strong: true },
    { no: "11", label: "Эрүүл мэндийн болон нийгмийн даатгалын шимтгэл", value: r.total.shInsurance },
    { no: "12", label: "Үүнээс: татвар ногдох орлогоос хасагдахгүй НДШ (гадаад ажилтан)", value: nonDeductibleSh, indent: true },
    { no: "13", label: "Татвар ногдох орлогоос хасагдах НДШ (11−12)", value: deductibleSh },
    { no: "14", label: "Татвар ногдуулах орлого (10−13)", count, value: r.total.taxable, strong: true },
    { no: "15", label: `Ногдуулсан албан татвар (14 × ${(r.pitRate * 100).toFixed(0)}%)`, value: taxGross },
    { no: "16", label: "Хуулийн 23.1-д заасан татварын хөнгөлөлт", value: relief },
    { no: "17", label: "Суутгасан зохих албан татвар (15−16)", value: r.total.pit, strong: true },
  ];

  return (
    <div>
      {/* Удирдлагын мөр — хэвлэхэд харагдахгүй */}
      <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            ХХОАТ-ын тайлан — цалингаас суутгасан
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Албан ёсны маягтын хэлбэр. Хэвлэх товчоор PDF/цаасаар гаргана.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" className="flex items-center gap-2">
            <select name="year" defaultValue={String(selYear)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              {years.map((y) => (
                <option key={y} value={y}>{y} он</option>
              ))}
            </select>
            <select name="period" defaultValue={period} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              {PERIOD_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
              Шинэчлэх
            </button>
          </form>
          <Tt11ExportButton
            rows={r.rows}
            year={selYear}
            periodLabel={r.monthLabel}
          />
          <PrintButton />
        </div>
      </div>

      {/* ── Албан ёсны маягт ── */}
      <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-8 text-sm leading-6 text-zinc-800 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <FormHead />
        <h2 className="mt-2 text-center text-base font-bold uppercase text-zinc-900">
          Хувь хүний орлогын албан татварын тайлан
        </h2>
        <p className="text-center text-xs text-zinc-500">
          /Ажил олгогчоос цалин хөлснөөс суутган тооцсон — суутган төлөгчийн тайлан/
        </p>

        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-[13px]">
          <div>Суутган төлөгч: <b>{company.name || "—"}</b></div>
          <div>Тайлант үе: <b>{selYear} он, {r.monthLabel}</b></div>
          <div>Татвар төлөгчийн дугаар (ТТД): <b>{company.register || "—"}</b></div>
          <div>Татварын хувь: <b>{(r.pitRate * 100).toFixed(0)}% /шатлалт хасагдуулгатай/</b></div>
        </div>

        {/* TT-11 нэгтгэл (А. Шууд орлого) */}
        <table className="mt-4 w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-zinc-100 text-center text-zinc-600">
              <th className="border border-zinc-300 px-2 py-1.5 text-left">Үзүүлэлт</th>
              <th className="w-12 border border-zinc-300 px-2 py-1.5">Мөр</th>
              <th className="w-24 border border-zinc-300 px-2 py-1.5">Татвар төлөгчийн тоо</th>
              <th className="w-40 border border-zinc-300 px-2 py-1.5 text-right">Дүн</th>
            </tr>
          </thead>
          <tbody>
            {tt11Rows.map((row, i) => (
              <tr key={i} className={row.strong ? "bg-zinc-50 font-semibold" : ""}>
                <td className={`border border-zinc-300 px-2 py-1.5 ${row.indent ? "pl-6 text-zinc-600" : ""}`}>
                  {row.label}
                </td>
                <td className="border border-zinc-300 px-2 py-1.5 text-center text-zinc-500">{row.no}</td>
                <td className="border border-zinc-300 px-2 py-1.5 text-center tabular-nums">
                  {row.count != null ? row.count : ""}
                </td>
                <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Ажилтны дэлгэрэнгүй задаргаа */}
        <h3 className="mt-6 text-[12px] font-semibold text-zinc-700">
          Ажилтны дэлгэрэнгүй задаргаа
        </h3>
        <table className="mt-1 w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-zinc-100 text-center text-zinc-600">
              <th className="w-8 border border-zinc-300 px-2 py-1.5">№</th>
              <th className="w-28 border border-zinc-300 px-2 py-1.5">Регистр (ДД)</th>
              <th className="border border-zinc-300 px-2 py-1.5 text-left">Овог, нэр</th>
              <th className="w-28 border border-zinc-300 px-2 py-1.5 text-right">Нийт орлого</th>
              <th className="w-24 border border-zinc-300 px-2 py-1.5 text-right">ЭМНДШ</th>
              <th className="w-28 border border-zinc-300 px-2 py-1.5 text-right">Татвар ногдох орлого</th>
              <th className="w-24 border border-zinc-300 px-2 py-1.5 text-right">Хөнгөлөлт</th>
              <th className="w-28 border border-zinc-300 px-2 py-1.5 text-right">Ногдуулсан ХХОАТ</th>
            </tr>
          </thead>
          <tbody>
            {r.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="border border-zinc-300 px-2 py-4 text-center text-zinc-400">
                  Энэ хугацаанд цалингийн бүртгэл алга.
                </td>
              </tr>
            ) : (
              r.rows.map((row, i) => (
                <tr key={row.employeeId ?? `n${i}`} className="text-center">
                  <td className="border border-zinc-300 px-2 py-1 text-zinc-500">{i + 1}</td>
                  <td className="border border-zinc-300 px-2 py-1 tabular-nums">{row.register || "—"}</td>
                  <td className="border border-zinc-300 px-2 py-1 text-left">{row.name}</td>
                  <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(row.gross)}</td>
                  <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(row.shInsurance)}</td>
                  <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(row.taxable)}</td>
                  <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(row.reliefApplied)}</td>
                  <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums font-medium">{fmt(row.pit)}</td>
                </tr>
              ))
            )}
          </tbody>
          {r.rows.length > 0 && (
            <tfoot>
              <tr className="bg-zinc-50 text-center font-semibold">
                <td className="border border-zinc-300 px-2 py-1.5" colSpan={3}>Нийт ({r.rows.length} ажилтан)</td>
                <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(r.total.gross)}</td>
                <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(r.total.shInsurance)}</td>
                <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(r.total.taxable)}</td>
                <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(r.total.reliefApplied)}</td>
                <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(r.total.pit)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        <p className="mt-2 text-[11px] text-zinc-500">
          Татвар ногдох орлого = Нийт орлого − ЭМНДШ. Ногдуулсан ХХОАТ нь
          Арт.23.1 шатлалт хасагдуулгыг тооцсон цэвэр дүн. Гадаад ажилтны хувьд
          ХХОАТ-ыг ЭМНДШ хасахгүй нийт цалингаас тооцно (татвар ногдох = нийт цалин).
        </p>

        {/* Гарын үсэг */}
        <div className="mt-10 grid grid-cols-2 gap-12">
          <SignatureCell role="Захирал" name={company.director} />
          <SignatureCell role="Ерөнхий нягтлан бодогч" name={company.accountant} />
        </div>
      </div>
    </div>
  );
}
