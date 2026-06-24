"use client";

import { Fragment, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  computeRow,
  normalizeSalaryType,
  SALARY_TYPE_LABELS,
  type SalaryParams,
  type SalaryType,
} from "@/lib/salary-calc";
import {
  saveSalary,
  computeVacationAmount,
  type SalaryInputRow,
} from "./actions";
import type { EmployeeRow, SalaryRow } from "./types";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// Засаж болох оролтын мөр (компьютердсон утга энд хадгалагдахгүй).
type EditRow = {
  employee_id: number;
  employee_name: string;
  company: string | null;
  department: string | null;
  salary_type: SalaryType;
  base_salary: number;
  worked_hours: number;
  manual_amount: number; // "manual" төрөлд гараар оруулсан бодогдсон цалин
  // Цагийн үзүүлэлт
  overtime_hours: number;
  holiday_overtime_hours: number;
  late_minutes: number;
  // Нэмэгдэл
  phone_allowance: number;
  bonus: number;
  vacation_amount: number;
  transport_allowance: number;
  meal_allowance: number;
  fuel_allowance: number;
  tenure_allowance: number;
  overtime_pay: number;
  holiday_overtime_pay: number;
  // Суутгал
  late_deduction: number;
  savings_deduction: number;
  discipline_deduction: number;
  other_deduction: number;
  staff_inv_settle: number; // энэ удаа барагдуулах БМ авлага (other_deduction-д орсон)
};

// Цалингийн төрлийн богино шошго (хүснэгтэд).
const TYPE_BADGE: Record<SalaryType, string> = {
  fixed: "Тогтмол",
  hourly: "Цаг",
  manual: "Гараар",
};

const numCls =
  "w-full rounded border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-300";

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
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Эхний төлөв: ажилтан бүрд хадгалсан мөр байвал түүнээс, үгүй бол анхдагч.
  const initial: EditRow[] = useMemo(() => {
    const byEmp = new Map(records.map((r) => [r.employee_id, r]));
    return employees.map((e) => {
      const rec = byEmp.get(e.id);
      const salaryType = normalizeSalaryType(rec?.salary_type ?? e.salary_type);
      const numOr = (v: number | null | undefined, d = 0) =>
        rec ? Number(v) || 0 : d;
      return {
        employee_id: e.id,
        employee_name: e.name,
        company: e.company,
        department: e.department,
        salary_type: salaryType,
        base_salary: rec ? Number(rec.base_salary) : Number(e.base_salary) || 0,
        worked_hours: rec
          ? Number(rec.worked_hours)
          : salaryType === "fixed"
            ? monthHours
            : 0,
        manual_amount: rec ? Number(rec.computed_salary) : 0,
        overtime_hours: numOr(rec?.overtime_hours),
        holiday_overtime_hours: numOr(rec?.holiday_overtime_hours),
        late_minutes: numOr(rec?.late_minutes),
        phone_allowance: rec
          ? Number(rec.phone_allowance)
          : Number(e.phone_allowance) || 0,
        bonus: numOr(rec?.bonus),
        vacation_amount: numOr(rec?.vacation_amount),
        transport_allowance: numOr(rec?.transport_allowance),
        meal_allowance: numOr(rec?.meal_allowance),
        fuel_allowance: numOr(rec?.fuel_allowance),
        tenure_allowance: numOr(rec?.tenure_allowance),
        overtime_pay: numOr(rec?.overtime_pay),
        holiday_overtime_pay: numOr(rec?.holiday_overtime_pay),
        late_deduction: numOr(rec?.late_deduction),
        savings_deduction: numOr(rec?.savings_deduction),
        discipline_deduction: numOr(rec?.discipline_deduction),
        other_deduction: numOr(rec?.other_deduction),
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

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  // Мөр бүрийн бодолт (salary-calc.ts — server-тэй ижил логик) + задаргааны нийлбэр.
  const computed = rows.map((r) => {
    const allowTotal =
      r.phone_allowance +
      r.bonus +
      r.vacation_amount +
      r.transport_allowance +
      r.meal_allowance +
      r.fuel_allowance +
      r.tenure_allowance +
      r.overtime_pay +
      r.holiday_overtime_pay;
    const dedTotal =
      r.late_deduction +
      r.savings_deduction +
      r.discipline_deduction +
      r.other_deduction;
    return {
      row: r,
      allowTotal,
      dedTotal,
      c: computeRow(
        {
          base: r.base_salary,
          monthHours,
          workedHours: r.worked_hours,
          salaryType: r.salary_type,
          manualAmount: r.manual_amount,
          phoneAllowance: r.phone_allowance,
          bonus: r.bonus,
          vacationAmount: r.vacation_amount,
          transportAllowance: r.transport_allowance,
          mealAllowance: r.meal_allowance,
          fuelAllowance: r.fuel_allowance,
          tenureAllowance: r.tenure_allowance,
          overtimePay: r.overtime_pay,
          holidayOvertimePay: r.holiday_overtime_pay,
          lateDeduction: r.late_deduction,
          savingsDeduction: r.savings_deduction,
          disciplineDeduction: r.discipline_deduction,
          otherDeduction: r.other_deduction,
        },
        params,
      ),
    };
  });

  const totals = computed.reduce(
    (s, { c, allowTotal, dedTotal }) => ({
      allow: s.allow + allowTotal,
      gross: s.gross + c.gross,
      sh: s.sh + c.sh_insurance,
      pit: s.pit + c.pit,
      adv: s.adv + c.advance,
      ded: s.ded + dedTotal,
      net: s.net + c.net,
    }),
    { allow: 0, gross: 0, sh: 0, pit: 0, adv: 0, ded: 0, net: 0 },
  );

  function handleSave() {
    setMsg(null);
    const payload: SalaryInputRow[] = rows.map((r) => ({
      employee_id: r.employee_id,
      employee_name: r.employee_name,
      company: r.company,
      department: r.department,
      salary_type: r.salary_type,
      base_salary: r.base_salary,
      worked_hours: r.worked_hours,
      manual_amount: r.manual_amount,
      overtime_hours: r.overtime_hours,
      holiday_overtime_hours: r.holiday_overtime_hours,
      late_minutes: r.late_minutes,
      phone_allowance: r.phone_allowance,
      bonus: r.bonus,
      vacation_amount: r.vacation_amount,
      transport_allowance: r.transport_allowance,
      meal_allowance: r.meal_allowance,
      fuel_allowance: r.fuel_allowance,
      tenure_allowance: r.tenure_allowance,
      overtime_pay: r.overtime_pay,
      holiday_overtime_pay: r.holiday_overtime_pay,
      late_deduction: r.late_deduction,
      savings_deduction: r.savings_deduction,
      discipline_deduction: r.discipline_deduction,
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

  const COLSPAN = 9;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {year} оны {month}-р сар — сарын нийт цаг:{" "}
          <span className="font-medium text-zinc-800">{monthHours} цаг</span>
          <span className="ml-2 text-zinc-400">
            (мөр дэлгэхэд цаг, нэмэгдэл, суутгал гарна)
          </span>
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
              <th className="px-3 py-2 text-right">Бодогдсон</th>
              <th className="px-3 py-2 text-right">Нэмэгдэл</th>
              <th className="px-3 py-2 text-right">Нийт</th>
              <th className="px-3 py-2 text-right">ЭМНДШ</th>
              <th className="px-3 py-2 text-right">ХХОАТ</th>
              <th className="px-3 py-2 text-right">Урьдчилгаа</th>
              <th className="px-3 py-2 text-right">Суутгал</th>
              <th className="px-3 py-2 text-right">Гарт олгох</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {computed.map(({ row: r, c, allowTotal, dedTotal }) => {
              const isOpen = expanded.has(r.employee_id);
              const open = staffReceivables[r.employee_id] ?? 0;
              return (
                <Fragment key={r.employee_id}>
                  <tr className="hover:bg-zinc-50">
                    <td className="whitespace-nowrap px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggle(r.employee_id)}
                        className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:bg-zinc-200"
                        title={isOpen ? "Хураах" : "Дэлгэрэнгүй"}
                      >
                        {isOpen ? "▾" : "▸"}
                      </button>
                      <span className="font-medium text-zinc-800">
                        {r.employee_name}
                      </span>
                      {r.salary_type !== "fixed" && (
                        <span
                          className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600"
                          title={SALARY_TYPE_LABELS[r.salary_type]}
                        >
                          {TYPE_BADGE[r.salary_type]}
                        </span>
                      )}
                      <div className="ml-6 text-xs text-zinc-400">
                        {[r.company, r.department].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-800">
                      {r.salary_type === "manual" ? (
                        <input
                          type="number"
                          step="1000"
                          min="0"
                          value={r.manual_amount}
                          onChange={(e) =>
                            update(r.employee_id, "manual_amount", Number(e.target.value))
                          }
                          className={`${numCls} w-28`}
                          title="Бодогдсон цалинг гараар оруулна"
                        />
                      ) : (
                        fmt(c.computed_salary)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-600">
                      {allowTotal ? fmt(allowTotal) : "—"}
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
                    <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                      {dedTotal ? fmt(dedTotal) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-green-700">
                      {fmt(c.net)}
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="bg-zinc-50/60">
                      <td colSpan={COLSPAN} className="px-4 py-3">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                          {/* Цаг */}
                          <Section title="Цаг бүртгэл">
                            <Field
                              label="Ажилласан цаг"
                              step="0.5"
                              value={r.worked_hours}
                              disabled={r.salary_type === "manual"}
                              onChange={(v) => update(r.employee_id, "worked_hours", v)}
                            />
                            <Field
                              label="Илүү цаг"
                              step="0.5"
                              value={r.overtime_hours}
                              onChange={(v) => update(r.employee_id, "overtime_hours", v)}
                            />
                            <Field
                              label="Баярын илүү цаг"
                              step="0.5"
                              value={r.holiday_overtime_hours}
                              onChange={(v) =>
                                update(r.employee_id, "holiday_overtime_hours", v)
                              }
                            />
                            <Field
                              label="Хоцорсон минут"
                              step="1"
                              value={r.late_minutes}
                              onChange={(v) => update(r.employee_id, "late_minutes", v)}
                            />
                          </Section>

                          {/* Нэмэгдэл */}
                          <Section title="Нэмэгдэл">
                            <Field
                              label="Утас"
                              value={r.phone_allowance}
                              onChange={(v) => update(r.employee_id, "phone_allowance", v)}
                            />
                            <Field
                              label="Шагнал/урамшуулал"
                              value={r.bonus}
                              onChange={(v) => update(r.employee_id, "bonus", v)}
                            />
                            <FieldWithButton
                              label="ЭА (амралт)"
                              value={r.vacation_amount}
                              onChange={(v) => update(r.employee_id, "vacation_amount", v)}
                              busy={vacBusy === r.employee_id}
                              onButton={() =>
                                calcVacation(r.employee_id, r.employee_name)
                              }
                              buttonTitle="Сүүлийн 11 сарын дунджаар ЭА бодох"
                            />
                            <Field
                              label="Унаа"
                              value={r.transport_allowance}
                              onChange={(v) =>
                                update(r.employee_id, "transport_allowance", v)
                              }
                            />
                            <Field
                              label="Хоол"
                              value={r.meal_allowance}
                              onChange={(v) => update(r.employee_id, "meal_allowance", v)}
                            />
                            <Field
                              label="Түлээ/нүүрс"
                              value={r.fuel_allowance}
                              onChange={(v) => update(r.employee_id, "fuel_allowance", v)}
                            />
                            <Field
                              label="Удаан жилийн"
                              value={r.tenure_allowance}
                              onChange={(v) =>
                                update(r.employee_id, "tenure_allowance", v)
                              }
                            />
                            <Field
                              label="Илүү цагийн мөнгө"
                              value={r.overtime_pay}
                              onChange={(v) => update(r.employee_id, "overtime_pay", v)}
                            />
                            <Field
                              label="Баярын илүү цаг мөнгө"
                              value={r.holiday_overtime_pay}
                              onChange={(v) =>
                                update(r.employee_id, "holiday_overtime_pay", v)
                              }
                            />
                          </Section>

                          {/* Суутгал */}
                          <Section title="Суутгал">
                            <Field
                              label="Хоцролт"
                              value={r.late_deduction}
                              onChange={(v) => update(r.employee_id, "late_deduction", v)}
                            />
                            <Field
                              label="Хуримтлал"
                              value={r.savings_deduction}
                              onChange={(v) =>
                                update(r.employee_id, "savings_deduction", v)
                              }
                            />
                            <Field
                              label="Сахилгын шийтгэл"
                              value={r.discipline_deduction}
                              onChange={(v) =>
                                update(r.employee_id, "discipline_deduction", v)
                              }
                            />
                            <Field
                              label="Бусад"
                              value={r.other_deduction}
                              onChange={(v) => update(r.employee_id, "other_deduction", v)}
                            />
                            {r.staff_inv_settle > 0 ? (
                              <div className="col-span-2 text-[11px] text-purple-600">
                                БМ авлага −{fmt(r.staff_inv_settle)} суутгахаар
                                тэмдэглэв ✓
                              </div>
                            ) : open > 0 ? (
                              <button
                                type="button"
                                onClick={() => pullStaffReceivable(r.employee_id, open)}
                                title="Бараа материалын дутагдлын авлагыг суутгалд татах"
                                className="col-span-2 rounded border border-purple-200 px-2 py-1 text-[11px] font-medium text-purple-600 hover:bg-purple-50"
                              >
                                БМ авлага {fmt(open)}₮ суутгалд татах ↓
                              </button>
                            ) : null}
                          </Section>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm font-semibold">
            <tr>
              <td className="px-3 py-2 text-right text-zinc-500">
                Нийт {rows.length} ажилтан:
              </td>
              <td />
              <td className="px-3 py-2 text-right tabular-nums text-zinc-600">
                {fmt(totals.allow)}
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
              <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                {fmt(totals.ded)}
              </td>
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

// ── Дэлгэрэнгүй талбарын туслах бүрэлдэхүүн ──────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="mb-2 text-xs font-semibold text-zinc-500">{title}</div>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step = "1000",
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <input
        type="number"
        step={step}
        min="0"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={numCls}
      />
    </label>
  );
}

function FieldWithButton({
  label,
  value,
  onChange,
  onButton,
  busy,
  buttonTitle,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onButton: () => void;
  busy: boolean;
  buttonTitle: string;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onButton}
          disabled={busy}
          title={buttonTitle}
          className="rounded border border-zinc-200 px-1.5 py-1 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
        >
          {busy ? "…" : "↻"}
        </button>
        <input
          type="number"
          step="1000"
          min="0"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={numCls}
        />
      </div>
    </label>
  );
}
