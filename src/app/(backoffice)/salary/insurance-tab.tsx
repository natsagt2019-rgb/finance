import { Nd8ExportButton } from "./nd8-export";
import { PrintButton } from "@/components/print-button";
import type { EmployeeRow, SalaryRow } from "./types";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// Нийгмийн даатгал (ЭМНД)-ын сарын тайлан — З-НД-8 хэлбэрийн задаргаа.
// Ажилтан бүрээр: хөдөлмөрийн хөлс, ажил олгогчийн шимтгэл, даатгуулагчийн шимтгэл.
export function InsuranceTab({
  monthRecords,
  employees,
  year,
  month,
}: {
  monthRecords: SalaryRow[];
  employees: EmployeeRow[];
  year: number;
  month: number;
}) {
  const empById = new Map(employees.map((e) => [e.id, e]));
  const rows = monthRecords
    .filter((r) => (Number(r.gross) || 0) > 0)
    .map((r) => {
      const e = r.employee_id != null ? empById.get(r.employee_id) : undefined;
      const income = Number(r.gross) || 0;
      const employer = Number(r.employer_sh) || 0;
      const employee = Number(r.sh_insurance) || 0;
      return {
        id: r.employee_id ?? r.id,
        register: e?.register ?? "",
        occupation: e?.occupation_code ?? "",
        name: e?.name || r.employee_name || "—",
        income,
        employer,
        employee,
        total: employer + employee,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "mn"));

  const t = rows.reduce(
    (s, r) => ({
      income: s.income + r.income,
      employer: s.employer + r.employer,
      employee: s.employee + r.employee,
      total: s.total + r.total,
    }),
    { income: 0, employer: 0, employee: 0, total: 0 },
  );

  return (
    <div>
      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-500">
          {year} оны {month}-р сар — нийгмийн даатгалын шимтгэл (З-НД-8)
        </p>
        <div className="flex items-center gap-2">
          <Nd8ExportButton
            monthRecords={monthRecords}
            employees={employees}
            year={year}
            month={month}
          />
          <PrintButton />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            {year} оны {month}-р сард даатгуулагч алга. «Цалин тооцоо» табаас
            цалин бодож хадгална уу.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-3 py-2">№</th>
                <th className="px-3 py-2">Регистр</th>
                <th className="px-3 py-2">Ажил, мэргэжлийн ангилал</th>
                <th className="px-3 py-2">Овог, нэр</th>
                <th className="px-3 py-2 text-right">Хөдөлмөрийн хөлс</th>
                <th className="px-3 py-2 text-right">Ажил олгогч</th>
                <th className="px-3 py-2 text-right">Даатгуулагч</th>
                <th className="px-3 py-2 text-right">Нийт дүн</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r, i) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 text-zinc-400">{i + 1}</td>
                  <td className="px-3 py-2 tabular-nums">{r.register || "—"}</td>
                  <td className="px-3 py-2 tabular-nums text-zinc-500">{r.occupation || "—"}</td>
                  <td className="px-3 py-2 font-medium text-zinc-800">{r.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-900">{fmt(r.income)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-orange-700">{fmt(r.employer)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-700">{fmt(r.employee)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-zinc-900">{fmt(r.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm font-semibold">
              <tr>
                <td className="px-3 py-2 text-right text-zinc-500" colSpan={4}>
                  Нийт ({rows.length} даатгуулагч):
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-900">{fmt(t.income)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-orange-700">{fmt(t.employer)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-amber-700">{fmt(t.employee)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-900">{fmt(t.total)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <p className="mt-2 text-[11px] text-zinc-500">
        Ажил олгогч 14.5% (дээд хязгааргүй), даатгуулагч 11.5% (дээд хязгаар
        7,920,000₮/сар). «↧ND-8» товчоор албан ёсны маягтыг Excel-ээр татна.
      </p>
    </div>
  );
}
