"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { computeRow, type SalaryParams } from "@/lib/salary-calc";
import {
  saveSalary,
  computeVacationAmount,
  type SalaryInputRow,
} from "./actions";
import type { EmployeeRow, SalaryRow } from "./types";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// Засаж болох оролтын мөр (компьютердсэн утга энд хадгалагдахгүй).
type EditRow = {
  employee_id: number;
  employee_name: string;
  company: string | null;
  base_salary: number;
  worked_hours: number;
  phone_allowance: number;
  bonus: number;
  vacation_amount: number;
  other_deduction: number;
  staff_inv_settle: number; // энэ удаа барагдуулах БМ авлага (other_deduction-д орсон)
};

const cellInput =
  "w-24 rounded border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-zinc-900";

export function CalcTab({
  employees,
  records,
  year,
  month,
  monthHours,
  params,
  staffReceivables = {},
}: {
  employees: EmployeeRow[];
  records: SalaryRow[];
  year: number;
  month: number;
  monthHours: number;
  params: SalaryParams;
  staffReceivables?: Record<number, number>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  // Эхний төлөв: ажилтан бүрд хадгалсан мөр байвал түүнээс, үгүй бол анхдагч.
  const initial: EditRow[] = useMemo(() => {
    const byEmp = new Map(records.map((r) => [r.employee_id, r]));
    return employees.map((e) => {
      const rec = byEmp.get(e.id);
      return {
        employee_id: e.id,
        employee_name: e.name,
        company: e.company,
        base_salary: rec ? Number(rec.base_salary) : Number(e.base_salary) || 0,
        worked_hours: rec ? Number(rec.worked_hours) : monthHours,
        phone_allowance: rec
          ? Number(rec.phone_allowance)
          : Number(e.phone_allowance) || 0,
        bonus: rec ? Number(rec.bonus) : 0,
        vacation_amount: rec ? Number(rec.vacation_amount) : 0,
        other_deduction: rec ? Number(rec.other_deduction) : 0,
        staff_inv_settle: 0,
      };
    });
    // employees/records/monthHours өөрчлөгдөхөд л дахин бодно.
  }, [employees, records, monthHours]);

  const [rows, setRows] = useState<EditRow[]>(initial);

  function update(id: number, field: keyof EditRow, value: number) {
    setRows((prev) =>
      prev.map((r) => (r.employee_id === id ? { ...r, [field]: value } : r)),
    );
  }

  // БМ дутагдлын нээлттэй авлагыг "бусад суутгал"-д татаж, барагдуулахаар тэмдэглэнэ.
  function pullStaffReceivable(empId: number, open: number) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.employee_id !== empId || r.staff_inv_settle > 0) return r;
        return {
          ...r,
          other_deduction: r.other_deduction + open,
          staff_inv_settle: open,
        };
      }),
    );
  }

  // ЭА дүнг сүүлийн 11 сарын хадгалсан цалингаас бодож талбарт бөглөнө.
  const [vacBusy, setVacBusy] = useState<number | null>(null);
  async function calcVacation(empId: number, name: string) {
    setVacBusy(empId);
    try {
      const res = await computeVacationAmount(empId, year, month);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      const v = res.result;
      update(empId, "vacation_amount", v.amount);
      alert(
        `${name} — ЭА тооцоо (сүүлийн ${v.monthsUsed} сар, туршлага ${res.years} жил):\n` +
          `• Хасагдах цалин: ${fmt(v.eligibleSalary)}₮\n` +
          `• Ажилласан өдөр: ${v.workedDays}\n` +
          `• 1 өдрийн дундаж: ${fmt(v.dailyAvg)}₮\n` +
          `• ЭА хоног: ${v.days}\n` +
          `• ЭА дүн: ${fmt(v.amount)}₮`,
      );
    } finally {
      setVacBusy(null);
    }
  }

  // Мөр бүрийн бодолт (salary-calc.ts — server-тэй ижил логик).
  const computed = rows.map((r) => ({
    row: r,
    c: computeRow(
      {
        base: r.base_salary,
        monthHours,
        workedHours: r.worked_hours,
        phoneAllowance: r.phone_allowance,
        bonus: r.bonus,
        vacationAmount: r.vacation_amount,
        otherDeduction: r.other_deduction,
      },
      params,
    ),
  }));

  const totals = computed.reduce(
    (s, { c }) => ({
      gross: s.gross + c.gross,
      sh: s.sh + c.sh_insurance,
      pit: s.pit + c.pit,
      adv: s.adv + c.advance,
      net: s.net + c.net,
    }),
    { gross: 0, sh: 0, pit: 0, adv: 0, net: 0 },
  );

  function handleSave() {
    setMsg(null);
    const payload: SalaryInputRow[] = rows.map((r) => ({
      employee_id: r.employee_id,
      employee_name: r.employee_name,
      company: r.company,
      base_salary: r.base_salary,
      worked_hours: r.worked_hours,
      phone_allowance: r.phone_allowance,
      bonus: r.bonus,
      vacation_amount: r.vacation_amount,
      other_deduction: r.other_deduction,
      staff_inv_settle: r.staff_inv_settle,
    }));
    startTransition(async () => {
      const res = await saveSalary(year, month, payload);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg(
        res.warning
          ? `${res.id} мөр хадгалагдлаа. ⚠ ${res.warning}`
          : `${res.id} мөр хадгалагдлаа.`,
      );
      router.refresh();
    });
  }

  if (employees.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">
        Ажилтан бүртгэгдээгүй байна. Эхлээд «Ажилтнууд» табаас ажилтан нэмнэ үү.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {year} оны {month}-р сар — сарын нийт цаг:{" "}
          <span className="font-medium text-zinc-800">{monthHours} цаг</span>
        </p>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-zinc-600">{msg}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2">Ажилтан</th>
              <th className="px-3 py-2 text-right">Үндсэн</th>
              <th className="px-3 py-2 text-right">Ажилл. цаг</th>
              <th className="px-3 py-2 text-right">Утас</th>
              <th className="px-3 py-2 text-right">Урамшуулал</th>
              <th className="px-3 py-2 text-right">ЭА</th>
              <th className="px-3 py-2 text-right">Бодогдсон</th>
              <th className="px-3 py-2 text-right">Нийт</th>
              <th className="px-3 py-2 text-right">ЭМНДШ</th>
              <th className="px-3 py-2 text-right">ХХОАТ</th>
              <th className="px-3 py-2 text-right">Урьдчилгаа</th>
              <th className="px-3 py-2 text-right">Бус.суут</th>
              <th className="px-3 py-2 text-right">Гарт олгох</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {computed.map(({ row: r, c }) => (
              <tr key={r.employee_id} className="hover:bg-zinc-50">
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="font-medium text-zinc-800">{r.employee_name}</div>
                  <div className="text-xs text-zinc-400">{r.company || "—"}</div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-500">
                  {fmt(r.base_salary)}
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={r.worked_hours}
                    onChange={(e) =>
                      update(r.employee_id, "worked_hours", Number(e.target.value))
                    }
                    className={`${cellInput} w-20`}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={r.phone_allowance}
                    onChange={(e) =>
                      update(r.employee_id, "phone_allowance", Number(e.target.value))
                    }
                    className={cellInput}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={r.bonus}
                    onChange={(e) =>
                      update(r.employee_id, "bonus", Number(e.target.value))
                    }
                    className={cellInput}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => calcVacation(r.employee_id, r.employee_name)}
                      disabled={vacBusy === r.employee_id}
                      title="Сүүлийн 11 сарын дунджаар ЭА бодох"
                      className="rounded border border-zinc-200 px-1.5 py-1 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
                    >
                      {vacBusy === r.employee_id ? "…" : "↻"}
                    </button>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={r.vacation_amount}
                      onChange={(e) =>
                        update(r.employee_id, "vacation_amount", Number(e.target.value))
                      }
                      className={cellInput}
                    />
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-800">
                  {fmt(c.computed_salary)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-zinc-900">
                  {fmt(c.gross)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                  {fmt(c.sh_insurance)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                  {fmt(c.pit)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-blue-700">
                  {fmt(c.advance)}
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={r.other_deduction}
                    onChange={(e) =>
                      update(r.employee_id, "other_deduction", Number(e.target.value))
                    }
                    className={cellInput}
                  />
                  {(() => {
                    const open = staffReceivables[r.employee_id] ?? 0;
                    if (r.staff_inv_settle > 0)
                      return (
                        <div className="mt-0.5 text-[10px] text-purple-600" title="БМ авлага барагдуулна">
                          БМ −{fmt(r.staff_inv_settle)} ✓
                        </div>
                      );
                    if (open > 0)
                      return (
                        <button
                          type="button"
                          onClick={() => pullStaffReceivable(r.employee_id, open)}
                          title="Бараа материалын дутагдлын авлагыг суутгалд татах"
                          className="mt-0.5 block w-full rounded border border-purple-200 px-1 py-0.5 text-[10px] font-medium text-purple-600 hover:bg-purple-50"
                        >
                          БМ авлага {fmt(open)} ↓
                        </button>
                      );
                    return null;
                  })()}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-green-700">
                  {fmt(c.net)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm font-semibold">
            <tr>
              <td colSpan={7} className="px-3 py-2 text-right text-zinc-500">
                Нийт {rows.length} ажилтан:
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-900">
                {fmt(totals.gross)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                {fmt(totals.sh)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                {fmt(totals.pit)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-blue-700">
                {fmt(totals.adv)}
              </td>
              <td />
              <td className="px-3 py-2 text-right tabular-nums text-green-700">
                {fmt(totals.net)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
