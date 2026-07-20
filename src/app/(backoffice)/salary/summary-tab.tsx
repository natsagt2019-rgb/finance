import { SalaryToolbar, type SummaryExportRow } from "./salary-toolbar";
import type { SalaryRow } from "./types";

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
  advance: number;
  net: number;
};

export function SummaryTab({
  records,
  year,
}: {
  records: SalaryRow[];
  year: number;
}) {
  // Сар бүрээр нэгтгэнэ (1-12).
  const agg: MonthAgg[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    cnt: 0,
    gross: 0,
    sh: 0,
    employerSh: 0,
    pit: 0,
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
  }

  const shown = agg.filter((a) => a.cnt > 0);
  const totals = shown.reduce(
    (s, a) => ({
      gross: s.gross + a.gross,
      sh: s.sh + a.sh,
      employerSh: s.employerSh + a.employerSh,
      pit: s.pit + a.pit,
      advance: s.advance + a.advance,
      net: s.net + a.net,
    }),
    { gross: 0, sh: 0, employerSh: 0, pit: 0, advance: 0, net: 0 },
  );

  const exportRows: SummaryExportRow[] = shown.map((a) => ({
    month: `${a.month}-р сар`,
    cnt: a.cnt,
    gross: a.gross,
    sh: a.sh,
    employerSh: a.employerSh,
    pit: a.pit,
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
                <th className="px-4 py-2 text-right">Урьдчилгаа</th>
                <th className="px-4 py-2 text-right">Гарт олгох</th>
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
                  <td className="px-4 py-2 text-right tabular-nums text-blue-700">
                    {fmt(a.advance)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-green-700">
                    {fmt(a.net)}
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
                <td className="px-4 py-2 text-right tabular-nums text-blue-700">
                  {fmt(totals.advance)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-green-700">
                  {fmt(totals.net)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
