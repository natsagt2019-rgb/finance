import {
  isForeignRegister,
  pitDeduction,
  DEFAULT_PIT_TIERS,
  PIT_RATE,
} from "@/lib/salary-calc";
import { SalaryToolbar, type SummaryExportRow } from "./salary-toolbar";
import { Nd8ExportButton } from "./nd8-export";
import { PostJournalButton } from "./post-journal-button";
import type { EmployeeRow, SalaryRow } from "./types";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

type MonthAgg = {
  month: number;
  cnt: number;
  gross: number;
  sh: number;
  employerSh: number;
  pit: number;
  reliefDiff: number; // өссөн дүнгийн хөнгөлөлт − сарын хөнгөлөлт (резидент)
  advance: number;
  net: number;
};

export function SummaryTab({
  records,
  employees,
  postedMonths,
  year,
}: {
  records: SalaryRow[];
  employees: EmployeeRow[];
  postedMonths: number[];
  year: number;
}) {
  const postedSet = new Set(postedMonths);
  const empById = new Map(employees.map((e) => [e.id, e]));
  // Сар бүрээр нэгтгэнэ (1-12).
  const agg: MonthAgg[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    cnt: 0,
    gross: 0,
    sh: 0,
    employerSh: 0,
    pit: 0,
    reliefDiff: 0,
    advance: 0,
    net: 0,
  }));
  for (const r of records) {
    const a = agg[r.month - 1];
    if (!a) continue;
    a.cnt += 1;
    a.gross += Number(r.gross) || 0;
    a.sh += Number(r.sh_insurance) || 0;
    a.employerSh += Number(r.employer_sh) || 0;
    a.pit += Number(r.pit) || 0;
    a.advance += Number(r.advance) || 0;
    a.net += Number(r.net) || 0;

    // Хөнгөлөлтийн зөрүү (резидент): сарын шатлалт хөнгөлөлт − хэрэглэсэн хөнгөлөлт.
    // Хөнгөлөлтийг сар бүр эдлүүлэхгүй, зөвхөн 12-р сард жилийн өссөн дүнгээр тооцно.
    // Тиймээс 1-11 сард энэ багана нь ХОЙШЛУУЛСАН (Дек-т эдлэх) хөнгөлөлтийг харуулна.
    const e = r.employee_id != null ? empById.get(r.employee_id) : undefined;
    const resident = !!e && !isForeignRegister(e.register) && !e.disabled;
    if (resident) {
      const taxable = (Number(r.gross) || 0) - (Number(r.sh_insurance) || 0);
      const applied = Math.max(0, taxable * PIT_RATE - (Number(r.pit) || 0));
      const monthly = pitDeduction(taxable, DEFAULT_PIT_TIERS);
      a.reliefDiff += monthly - applied;
    }
  }

  const shown = agg.filter((a) => a.cnt > 0);
  const totals = shown.reduce(
    (s, a) => ({
      gross: s.gross + a.gross,
      sh: s.sh + a.sh,
      employerSh: s.employerSh + a.employerSh,
      pit: s.pit + a.pit,
      reliefDiff: s.reliefDiff + a.reliefDiff,
      advance: s.advance + a.advance,
      net: s.net + a.net,
    }),
    { gross: 0, sh: 0, employerSh: 0, pit: 0, reliefDiff: 0, advance: 0, net: 0 },
  );

  const exportRows: SummaryExportRow[] = shown.map((a) => ({
    month: `${a.month}-р сар`,
    cnt: a.cnt,
    gross: a.gross,
    sh: a.sh,
    employerSh: a.employerSh,
    pit: a.pit,
    reliefDiff: a.reliefDiff,
    advance: a.advance,
    net: a.net,
  }));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-zinc-500">{year} оны цалингийн нэгтгэл</p>
        <div className="no-print">
          <SalaryToolbar rows={exportRows} fileLabel={String(year)} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        {shown.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            {year} онд хадгалсан цалингийн тооцоо алга. «Цалин тооцоо» табаас
            бодож хадгална уу.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-4 py-2">Сар</th>
                <th className="px-4 py-2 text-right">Ажилтан</th>
                <th className="px-4 py-2 text-right">Нийт цалин</th>
                <th className="px-4 py-2 text-right">ЭМНДШ (ажилтан)</th>
                <th className="px-4 py-2 text-right">ЭМНДШ (ажил олгогч)</th>
                <th className="px-4 py-2 text-right">ХХОАТ</th>
                <th className="px-4 py-2 text-right">Хөнгөлөлтийн зөрүү</th>
                <th className="px-4 py-2 text-right">Урьдчилгаа</th>
                <th className="px-4 py-2 text-right">Гарт олгох</th>
                <th className="no-print px-4 py-2 text-center">НД-8</th>
                <th className="no-print px-4 py-2 text-center">Журнал</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shown.map((a) => (
                <tr key={a.month} className="hover:bg-zinc-50">
                  <td className="px-4 py-2 font-medium text-zinc-800">
                    {a.month}-р сар
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-500">
                    {a.cnt}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-900">
                    {fmt(a.gross)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                    {fmt(a.sh)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-orange-700">
                    {fmt(a.employerSh)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                    {fmt(a.pit)}
                  </td>
                  <td className={`px-4 py-2 text-right tabular-nums ${a.reliefDiff < 0 ? "text-rose-600" : "text-purple-600"}`}>
                    {a.reliefDiff ? fmt(a.reliefDiff) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-blue-700">
                    {fmt(a.advance)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-green-700">
                    {fmt(a.net)}
                  </td>
                  <td className="no-print px-4 py-2 text-center">
                    <Nd8ExportButton
                      monthRecords={records.filter((r) => r.month === a.month)}
                      employees={employees}
                      year={year}
                      month={a.month}
                    />
                  </td>
                  <td className="no-print px-4 py-2 text-center">
                    <PostJournalButton
                      year={year}
                      month={a.month}
                      posted={postedSet.has(a.month)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm font-semibold">
              <tr>
                <td colSpan={2} className="px-4 py-2 text-right text-zinc-500">
                  Жилийн дүн:
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-zinc-900">
                  {fmt(totals.gross)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                  {fmt(totals.sh)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-orange-700">
                  {fmt(totals.employerSh)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-amber-700">
                  {fmt(totals.pit)}
                </td>
                <td className={`px-4 py-2 text-right tabular-nums ${totals.reliefDiff < 0 ? "text-rose-600" : "text-purple-600"}`}>
                  {fmt(totals.reliefDiff)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-blue-700">
                  {fmt(totals.advance)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-green-700">
                  {fmt(totals.net)}
                </td>
                <td className="no-print" />
                <td className="no-print" />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
