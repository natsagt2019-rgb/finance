"use server";

import { revalidatePath } from "next/cache";
import * as xlsx from "xlsx";

import { createClient } from "@/lib/supabase/server";
import { postJournal } from "@/lib/post-journal";
import {
  computeRow,
  computeVacation,
  tenureYears,
  paramsFromSettings,
  normalizeSalaryType,
  isForeignRegister,
  annualPitRelief,
  DEFAULT_MONTH_HOURS_2026,
  type SalaryParams,
  type SalaryType,
  type VacationResult,
} from "@/lib/salary-calc";

export type ActionResult =
  | { ok: true; id: number; warning?: string }
  | { ok: false; error: string };

// Бүх action нэвтэрсэн хэрэглэгч шаардана.
async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return { supabase, user };
}

function num(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// ── Ажилтан: нэмэх / засах / устгах ─────────────────────────────────────────
function readEmployee(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const statusRaw = get("status");
  const lastName = get("last_name");
  const firstName = get("first_name");
  return {
    last_name: lastName || null,
    first_name: firstName || null,
    name: [lastName, firstName].filter(Boolean).join(" "), // "Овог Нэр" нийлмэл
    company: get("company") || null,
    department: get("department") || null,
    position: get("position") || null,
    salary_type: normalizeSalaryType(get("salary_type")),
    base_salary: num(formData.get("base_salary")),
    phone_allowance: num(formData.get("phone_allowance")),
    register: get("register") || null,
    tin: get("tin") || null,
    bank_account: get("bank_account") || null,
    hired_date: get("hired_date") || null,
    experience_years: num(formData.get("experience_years")),
    disabled: ["on", "true", "1"].includes(get("disabled").toLowerCase()),
    status: statusRaw === "inactive" ? "inactive" : "active",
  };
}

export async function createEmployee(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readEmployee(formData);
  if (!v.name) return { ok: false, error: "Нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("employees")
    .insert(v)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/salary");
  return { ok: true, id: data.id as number };
}

export async function updateEmployee(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const v = readEmployee(formData);
  if (!v.name) return { ok: false, error: "Нэр заавал шаардлагатай." };

  const { data, error } = await supabase
    .from("employees")
    .update(v)
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/salary");
  return { ok: true, id: data.id as number };
}

export async function deleteEmployee(id: number): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("employees")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/salary");
  return { ok: true, id: data.id as number };
}

// ── Ажилтан: Excel-ээр бөөнөөр оруулах ───────────────────────────────────────
// Excel нүднээс огноог YYYY-MM-DD болгоно (Date | serial | текст).
function cellISO(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return null;
}

function cellNum(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export type EmployeeImportResult =
  | { ok: true; inserted: number; skipped: number }
  | { ok: false; error: string };

// Excel (загварын дагуу) → employees хүснэгтэд бөөнөөр оруулна.
// Давхардал: ДД/Регистр (байвал), үгүй бол "Овог Нэр"-ээр шалгаж алгасна.
export async function importEmployeesExcel(
  formData: FormData,
): Promise<EmployeeImportResult> {
  const { supabase } = await requireAuth();

  const file = formData.get("file");
  if (!file || typeof file === "string")
    return { ok: false, error: "Файл сонгоогүй байна." };

  let grid: unknown[][];
  try {
    const buf = Buffer.from(await (file as File).arrayBuffer());
    const wb = xlsx.read(buf, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    grid = xlsx.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  } catch (e) {
    return { ok: false, error: `Уншихад алдаа: ${(e as Error).message}` };
  }

  // Толгойн мөрөөс баганын индексийг олно.
  const headerRow = (grid[0] ?? []).map((c) => String(c ?? "").trim().toLowerCase());
  const find = (...keys: string[]) =>
    headerRow.findIndex((h) => keys.some((k) => h.includes(k)));
  const idx = {
    last: find("овог"),
    first: find("нэр"),
    company: find("компани"),
    department: find("хэлтэс", "тасаг"),
    position: find("тушаал"),
    hired: find("огноо"),
    exp: find("туршлага"),
    base: find("үндсэн", "цалин"),
    phone: find("утас"),
    register: find("регистр", "дд"),
    tin: find("ттд", "татвар"),
    bank: find("данс"),
    status: find("төлөв"),
  };
  if (idx.first < 0)
    return { ok: false, error: "«Нэр» багана олдсонгүй. Загварыг ашиглана уу." };

  // Байгаа ажилтнууд — давхардал шалгах (регистр + нийлмэл нэр).
  const { data: existing } = await supabase
    .from("employees")
    .select("name, register")
    .limit(20000);
  const seenReg = new Set<string>();
  const seenName = new Set<string>();
  for (const e of (existing as { name: string | null; register: string | null }[] | null) ?? []) {
    if (e.register) seenReg.add(e.register.trim().toLowerCase());
    if (e.name) seenName.add(e.name.trim().toLowerCase());
  }

  const at = (row: unknown[], i: number) =>
    i >= 0 ? String(row[i] ?? "").trim() : "";

  const toInsert: Record<string, unknown>[] = [];
  let skipped = 0;
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i] ?? [];
    const firstName = at(row, idx.first);
    if (!firstName) continue;
    const lastName = at(row, idx.last);
    const name = [lastName, firstName].filter(Boolean).join(" ");
    const register = at(row, idx.register);

    const regKey = register.toLowerCase();
    const nameKey = name.toLowerCase();
    if ((register && seenReg.has(regKey)) || (!register && seenName.has(nameKey))) {
      skipped++;
      continue;
    }
    if (register) seenReg.add(regKey);
    seenName.add(nameKey);

    const statusRaw = at(row, idx.status).toLowerCase();
    toInsert.push({
      last_name: lastName || null,
      first_name: firstName,
      name,
      company: at(row, idx.company) || null,
      department: at(row, idx.department) || null,
      position: at(row, idx.position) || null,
      hired_date: idx.hired >= 0 ? cellISO(row[idx.hired]) : null,
      experience_years: idx.exp >= 0 ? cellNum(row[idx.exp]) : 0,
      base_salary: idx.base >= 0 ? cellNum(row[idx.base]) : 0,
      phone_allowance: idx.phone >= 0 ? cellNum(row[idx.phone]) : 0,
      register: register || null,
      tin: at(row, idx.tin) || null,
      bank_account: at(row, idx.bank) || null,
      status: statusRaw.includes("идэвхгүй") ? "inactive" : "active",
      is_active: true,
    });
  }

  if (toInsert.length === 0)
    return { ok: false, error: "Оруулах мөр олдсонгүй (бүгд хоосон эсвэл давхардсан)." };

  const { error } = await supabase.from("employees").insert(toInsert);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/salary");
  return { ok: true, inserted: toInsert.length, skipped };
}

// ── Цалин тооцоо: тухайн сарын мөрүүдийг бодож хадгалах ──────────────────────
// calc-tab-аас ирэх нэг мөрийн оролт.
export type SalaryInputRow = {
  employee_id: number;
  employee_name: string;
  company: string | null;
  department: string | null;
  salary_type: SalaryType;
  base_salary: number;
  worked_hours: number;
  manual_amount: number; // "manual" төрөлд бодогдсон цалин
  // Цагийн үзүүлэлт (мэдээллийн — Үе 1)
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
  late_deduction: number; // хоцролт
  savings_deduction: number; // хуримтлал
  discipline_deduction: number; // сахилгын шийтгэл
  other_deduction: number; // бусад
  staff_inv_settle?: number; // БМ дутагдлын авлагыг энэ удаа барагдуулах дүн
};

// Тохиргоог татаж SalaryParams + сарын цаг буцаана.
async function loadParams(
  supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"],
  year: number,
): Promise<{ params: SalaryParams; monthHours: number[] }> {
  const { data } = await supabase
    .from("salary_settings")
    .select("sh_rate, sh_ceiling, employer_sh_rate, pit_rate, advance_rate, pit_tiers, month_hours")
    .eq("year", year)
    .maybeSingle();

  const monthHours =
    Array.isArray(data?.month_hours) && data.month_hours.length === 12
      ? (data.month_hours as number[])
      : DEFAULT_MONTH_HOURS_2026;

  return { params: paramsFromSettings(data), monthHours };
}

// Тухайн сарын цалингийн журнал (нэгтгэсэн) — journal_entries (тайлангийн эх сурвалж).
//   Дт 720100 Цалин зардал (нийт) + Дт 720200 ЭМНДШ зардал (ажил олгогч)
//   Кт 320200 ЭМНДШ өглөг (ажилтан+ажил олгогч) + Кт 320300 ХХОАТ
//   Кт 130400 урьдчилгаа/бусад суутгал + Кт 320100 цэвэр цалингийн өглөг
// idempotent: тухайн сарын source='salary' бичилтийг солино.
async function postSalaryJournal(
  supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"],
  year: number,
  month: number,
  records: {
    gross: number;
    sh_insurance: number;
    employer_sh: number;
    pit: number;
    advance: number;
    net: number;
    late_deduction: number;
    savings_deduction: number;
    discipline_deduction: number;
    other_deduction: number;
  }[],
): Promise<void> {
  const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
  const sum = (k: keyof (typeof records)[number]) =>
    records.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const gross = r2(sum("gross"));
  if (gross <= 0) return;
  const sh = r2(sum("sh_insurance"));
  const employerSh = r2(sum("employer_sh"));
  const pit = r2(sum("pit"));
  // Урьдчилгаа + бүх нэмэлт суутгал (хоцролт/хуримтлал/сахилга/бусад).
  const advOther = r2(
    sum("advance") +
      sum("late_deduction") +
      sum("savings_deduction") +
      sum("discipline_deduction") +
      sum("other_deduction"),
  );
  const net = r2(sum("net"));

  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const date = `${year}-${pad(month)}-${pad(lastDay)}`;
  const tag = `${year}-${pad(month)}`;

  await supabase.from("journal_entries").delete().eq("source", "salary").eq("txn_date", date);

  const rows: Record<string, unknown>[] = [];
  const push = (amt: number, dt: string, kt: string, desc: string) => {
    if (r2(amt) > 0)
      rows.push({
        txn_date: date, description: desc, amount: r2(amt),
        debit_code: dt, credit_code: kt, is_opening: false, source: "salary",
      });
  };
  // Ажилтны тал: Дт 720100 (нийт цалин) / Кт суутгал + цэвэр өглөг.
  push(sh, "720100", "320200", `${tag} цалин: НДШ суутгал`);
  push(pit, "720100", "320300", `${tag} цалин: ХХОАТ суутгал`);
  push(advOther, "720100", "130400", `${tag} цалин: урьдчилгаа/бусад суутгал`);
  push(net, "720100", "320100", `${tag} цалин: цэвэр өглөг`);
  // Ажил олгогчийн тал: Дт 720200 ЭМНДШ зардал / Кт 320200 ЭМНДШ өглөг.
  push(employerSh, "720200", "320200", `${tag} цалин: ажил олгогчийн ЭМНДШ`);
  if (rows.length > 0) await supabase.from("journal_entries").insert(rows);
}

// Нэгтгэл табаас: тухайн сарын хадгалсан цалингаас GL журнал бичих (идемпотент).
export async function postSalaryMonthJournal(
  year: number,
  month: number,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  if (month < 1 || month > 12) return { ok: false, error: "Сар буруу." };

  const { data, error } = await supabase
    .from("salary_records")
    .select(
      "gross, sh_insurance, employer_sh, pit, advance, net, late_deduction, savings_deduction, discipline_deduction, other_deduction",
    )
    .eq("year", year)
    .eq("month", month)
    .eq("is_active", true)
    .limit(20000);
  if (error) return { ok: false, error: error.message };

  const records = (data ?? []).map((r) => ({
    gross: Number(r.gross) || 0,
    sh_insurance: Number(r.sh_insurance) || 0,
    employer_sh: Number(r.employer_sh) || 0,
    pit: Number(r.pit) || 0,
    advance: Number(r.advance) || 0,
    net: Number(r.net) || 0,
    late_deduction: Number(r.late_deduction) || 0,
    savings_deduction: Number(r.savings_deduction) || 0,
    discipline_deduction: Number(r.discipline_deduction) || 0,
    other_deduction: Number(r.other_deduction) || 0,
  }));
  if (records.length === 0)
    return { ok: false, error: "Энэ сард хадгалсан цалин алга." };

  await postSalaryJournal(supabase, year, month, records);
  revalidatePath("/journals");
  revalidatePath("/salary");
  return { ok: true, id: records.length };
}

// ── Хугацаа хаалтын шалгалт ──────────────────────────────────────────────────
async function isPeriodClosed(
  supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"],
  year: number,
  month: number,
): Promise<boolean> {
  const { data } = await supabase
    .from("salary_closed_periods")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  return data != null;
}

export async function closeSalaryPeriod(
  year: number,
  month: number,
  note?: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireAuth();
  if (month < 1 || month > 12) return { ok: false, error: "Сар буруу." };
  const { error } = await supabase.from("salary_closed_periods").insert({
    year,
    month,
    closed_by: user.email ?? null,
    note: note ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/salary");
  return { ok: true, id: year * 100 + month };
}

export async function reopenSalaryPeriod(
  year: number,
  month: number,
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  const { error } = await supabase
    .from("salary_closed_periods")
    .delete()
    .eq("year", year)
    .eq("month", month);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/salary");
  return { ok: true, id: year * 100 + month };
}

export async function saveSalary(
  year: number,
  month: number,
  rows: SalaryInputRow[],
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  if (month < 1 || month > 12) return { ok: false, error: "Сар буруу." };

  if (await isPeriodClosed(supabase, year, month))
    return {
      ok: false,
      error: `${year} оны ${month}-р сарын цалин хаагдсан байна. Өөрчлөлт хийхийн тулд эхлээд хугацааг нээнэ үү.`,
    };

  const { params, monthHours } = await loadParams(supabase, year);
  const mh = monthHours[month - 1] ?? 0;

  // Гадаад ажилтан (регистрээр) — ХХОАТ-ыг НДШ хасахгүй нийт цалингаас бодно.
  // Хөгжлийн бэрхшээлтэй — орлого албан татвараас чөлөөлөгдөнө (22.1.2).
  const empIds = rows.map((r) => r.employee_id).filter((v): v is number => v != null);
  const foreignById = new Map<number, boolean>();
  const disabledById = new Map<number, boolean>();
  if (empIds.length > 0) {
    const { data: empRegs } = await supabase
      .from("employees")
      .select("id, register, disabled")
      .in("id", empIds);
    for (const e of (empRegs as { id: number; register: string | null; disabled: boolean | null }[] | null) ?? []) {
      foreignById.set(e.id, isForeignRegister(e.register));
      disabledById.set(e.id, e.disabled === true);
    }
  }

  const records = rows.map((r) => {
    const salaryType = normalizeSalaryType(r.salary_type);
    const c = computeRow(
      {
        base: r.base_salary,
        monthHours: mh,
        workedHours: r.worked_hours,
        salaryType,
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
        foreign: foreignById.get(r.employee_id) ?? false,
        disabled: disabledById.get(r.employee_id) ?? false,
      },
      params,
    );
    return {
      employee_id: r.employee_id,
      year,
      month,
      employee_name: r.employee_name,
      company: r.company,
      department: r.department,
      salary_type: salaryType,
      base_salary: r.base_salary,
      worked_hours: r.worked_hours,
      month_hours: mh,
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
      ...c,
      is_active: true,
    };
  });

  // 12-р сар: резидентийн шатлалт хөнгөлөлтийг жилийн ӨССӨН дүнгээр нэг дор
  // тооцно (Хууль 25.5, 27.1). 1-11 сард хөнгөлөлт 0 тул Дек-т бүрэн эдэлнэ.
  if (month === 12) {
    const { data: prior } = await supabase
      .from("salary_records")
      .select("employee_id, gross, sh_insurance")
      .eq("year", year)
      .lt("month", 12)
      .eq("is_active", true)
      .in("employee_id", empIds);
    const priorTaxable = new Map<number, number>();
    for (const p of (prior as { employee_id: number; gross: number; sh_insurance: number }[] | null) ?? []) {
      const t = (Number(p.gross) || 0) - (Number(p.sh_insurance) || 0);
      priorTaxable.set(p.employee_id, (priorTaxable.get(p.employee_id) ?? 0) + t);
    }
    const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
    for (const rec of records) {
      const id = rec.employee_id;
      if (id == null || foreignById.get(id) || disabledById.get(id)) continue;
      const decTaxable = (Number(rec.gross) || 0) - (Number(rec.sh_insurance) || 0);
      const annualTaxable = (priorTaxable.get(id) ?? 0) + decTaxable;
      const relief = annualPitRelief(annualTaxable);
      const newPit = r2(Math.max(0, decTaxable * params.pitRate - relief));
      const otherDed =
        (Number(rec.advance) || 0) +
        (Number(rec.late_deduction) || 0) +
        (Number(rec.savings_deduction) || 0) +
        (Number(rec.discipline_deduction) || 0) +
        (Number(rec.other_deduction) || 0);
      rec.pit = newPit;
      rec.net = r2((Number(rec.gross) || 0) - (Number(rec.sh_insurance) || 0) - newPit - otherDed);
    }
  }

  if (records.length === 0) return { ok: false, error: "Хадгалах мөр алга." };

  const { error } = await supabase
    .from("salary_records")
    .upsert(records, { onConflict: "employee_id,year,month" });

  if (error) return { ok: false, error: error.message };

  // Цалингийн нэгтгэсэн журнал (Дт 700101 / Кт суутгал+цэвэр өглөг).
  await postSalaryJournal(supabase, year, month, records);
  revalidatePath("/journals");

  // БМ дутагдлын авлага барагдуулах (Дт Цалин хөлсний өглөг / Кт Ажилчдын авлага).
  const settleRows = rows.filter((r) => (r.staff_inv_settle ?? 0) > 0);
  let warning: string | undefined;
  if (settleRows.length > 0) {
    warning = await settleStaffReceivables(supabase, year, month, settleRows);
    revalidatePath("/journals");
  }

  revalidatePath("/salary");
  return { ok: true, id: records.length, warning };
}

// Тэмдэглэсэн дүнгээр ажилтны нээлттэй авлагыг (FIFO) барагдуулж журнал бичнэ.
// Алдаа гарвал хэрэглэгчид анхааруулга (string) буцаана; цалин хадгалагдсан хэвээр.
async function settleStaffReceivables(
  supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"],
  year: number,
  month: number,
  settleRows: SalaryInputRow[],
): Promise<string | undefined> {
  // Барагдуулах данс — inventory тохиргооноос.
  const { data: inv } = await supabase
    .from("inv_settings")
    .select("salary_payable_account_id, staff_receivable_account_id")
    .eq("id", 1)
    .maybeSingle();
  const payableId = (inv?.salary_payable_account_id as number | null) ?? null;
  const recvId = (inv?.staff_receivable_account_id as number | null) ?? null;
  if (payableId == null || recvId == null)
    return "БМ авлага суутгал хадгалагдсан ч журнал үүсээгүй: Бараа материал → Тохиргоонд «Цалин хөлсний өглөг» ба «Ажилчдын авлага» данс тохируулна уу.";

  // Цалингийн период доторх журналын огноо (сарын сүүлийн өдөр).
  const lastDay = new Date(year, month, 0).getDate();
  const date = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const warnings: string[] = [];

  for (const row of settleRows) {
    let toSettle = Math.round((Number(row.staff_inv_settle) || 0) * 100) / 100;
    if (toSettle <= 0) continue;

    // Тухайн ажилтны хадгалсан цалингийн мөрийн id (холбоход).
    const { data: rec } = await supabase
      .from("salary_records")
      .select("id")
      .eq("employee_id", row.employee_id)
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();
    const salaryRecordId = (rec?.id as number | null) ?? null;

    // Нээлттэй авлагууд (хуучин нь эхэнд — FIFO).
    const { data: openRecs } = await supabase
      .from("staff_receivables")
      .select("id, amount, recovered")
      .eq("employee_id", row.employee_id)
      .eq("status", "open")
      .order("date", { ascending: true })
      .order("id", { ascending: true });

    let allocated = 0;
    for (const r of openRecs ?? []) {
      if (toSettle <= 1e-6) break;
      const open = (Number(r.amount) || 0) - (Number(r.recovered) || 0);
      if (open <= 0) continue;
      const take = Math.min(open, toSettle);
      const newRecovered = Math.round((Number(r.recovered) + take) * 100) / 100;
      const fullyPaid = newRecovered >= Number(r.amount) - 1e-6;
      await supabase
        .from("staff_receivables")
        .update({
          recovered: newRecovered,
          status: fullyPaid ? "recovered" : "open",
          salary_record_id: salaryRecordId,
        })
        .eq("id", r.id);
      allocated += take;
      toSettle -= take;
    }

    if (allocated <= 0) continue;

    const posted = await postJournal(supabase, {
      date,
      description: `БМ дутагдлын авлага цалингаас суутгах — ${row.employee_name}`,
      reference: `${year}-${String(month).padStart(2, "0")} цалин`,
      partner_id: null,
      source: "salary",
      lines: [
        {
          account_id: payableId,
          debit: allocated,
          credit: 0,
          description: "Цалин хөлсний өглөгөөс суутгах",
        },
        {
          account_id: recvId,
          debit: 0,
          credit: allocated,
          description: "Ажилчдын авлага барагдуулах",
        },
      ],
    });
    if (posted.ok) {
      // Барагдсан авлагуудад журналын дугаарыг холбоно.
      await supabase
        .from("staff_receivables")
        .update({ settle_journal_id: posted.id })
        .eq("employee_id", row.employee_id)
        .eq("salary_record_id", salaryRecordId)
        .gt("recovered", 0);
    } else {
      warnings.push(`${row.employee_name}: ${posted.error}`);
    }
  }

  return warnings.length ? warnings.join("; ") : undefined;
}

// ── Цалин: Excel-ээс тухайн сарын мөрүүдийг бөөнөөр оруулах ───────────────────
export type SalaryImportResult =
  | { ok: true; saved: number; skipped: number; warning?: string }
  | { ok: false; error: string };

// Excel (цалингийн загвар) → тухайн сарын salary_records. Регистрээр ажилтан
// тааруулж, «Бодогдсон цалин» (manual) + нэмэгдэл + суутгалыг saveSalary-д өгнө.
export async function importSalaryExcel(
  year: number,
  month: number,
  formData: FormData,
): Promise<SalaryImportResult> {
  const { supabase } = await requireAuth();
  if (month < 1 || month > 12) return { ok: false, error: "Сар буруу." };

  const file = formData.get("file");
  if (!file || typeof file === "string")
    return { ok: false, error: "Файл сонгоогүй байна." };

  let grid: unknown[][];
  try {
    const buf = Buffer.from(await (file as File).arrayBuffer());
    const wb = xlsx.read(buf, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    grid = xlsx.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  } catch (e) {
    return { ok: false, error: `Уншихад алдаа: ${(e as Error).message}` };
  }

  const headerRow = (grid[0] ?? []).map((c) => String(c ?? "").trim().toLowerCase());
  const find = (...keys: string[]) =>
    headerRow.findIndex((h) => keys.some((k) => h.includes(k)));
  const idx = {
    register: find("регистр", "дд"),
    last: find("овог"),
    first: find("нэр"),
    computed: find("бодогдсон", "үндсэн", "цалин"),
    allowance: find("нэмэгдэл"),
    deduction: find("суутгал"),
  };
  if (idx.computed < 0 && idx.register < 0)
    return {
      ok: false,
      error: "«Регистр» ба «Бодогдсон цалин» багана олдсонгүй. Загварыг ашиглана уу.",
    };

  // Ажилтнууд — регистр/нэрээр тааруулах.
  type EmpMini = {
    id: number;
    name: string | null;
    company: string | null;
    department: string | null;
    register: string | null;
  };
  const { data: empRows } = await supabase
    .from("employees")
    .select("id, name, company, department, register")
    .limit(20000);
  const cReg = (s: unknown) => String(s ?? "").replace(/[\r\n\s]+/g, "").toUpperCase();
  const cName = (s: unknown) => String(s ?? "").replace(/[\r\n\s]+/g, "").toUpperCase();
  const byReg = new Map<string, EmpMini>();
  const byName = new Map<string, EmpMini>();
  for (const e of (empRows as EmpMini[] | null) ?? []) {
    if (e.register) byReg.set(cReg(e.register), e);
    if (e.name) byName.set(cName(e.name), e);
  }

  const at = (row: unknown[], i: number) => (i >= 0 ? row[i] : null);
  const rows: SalaryInputRow[] = [];
  let skipped = 0;
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i] ?? [];
    const reg = cReg(at(row, idx.register));
    const nameKey = cName(
      `${String(at(row, idx.last) ?? "")} ${String(at(row, idx.first) ?? "")}`,
    );
    const emp = (reg && byReg.get(reg)) || (nameKey && byName.get(nameKey)) || null;
    const computed = cellNum(at(row, idx.computed));
    if (!emp || computed <= 0) {
      if (reg || nameKey.trim()) skipped++;
      continue;
    }
    rows.push({
      employee_id: emp.id,
      employee_name: emp.name ?? "",
      company: emp.company,
      department: emp.department,
      salary_type: "manual",
      base_salary: 0,
      worked_hours: 0,
      manual_amount: computed,
      overtime_hours: 0,
      holiday_overtime_hours: 0,
      late_minutes: 0,
      phone_allowance: 0,
      bonus: cellNum(at(row, idx.allowance)),
      vacation_amount: 0,
      transport_allowance: 0,
      meal_allowance: 0,
      fuel_allowance: 0,
      tenure_allowance: 0,
      overtime_pay: 0,
      holiday_overtime_pay: 0,
      late_deduction: 0,
      savings_deduction: 0,
      discipline_deduction: 0,
      other_deduction: cellNum(at(row, idx.deduction)),
      staff_inv_settle: 0,
    });
  }

  if (rows.length === 0)
    return { ok: false, error: "Оруулах мөр олдсонгүй (ажилтан тохирсонгүй эсвэл цалин 0)." };

  const res = await saveSalary(year, month, rows);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, saved: rows.length, skipped, warning: res.warning };
}

// ── Тохиргоо хадгалах ────────────────────────────────────────────────────────
export async function saveSettings(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAuth();

  const year = num(formData.get("year"));
  if (year < 2000 || year > 2100) return { ok: false, error: "Он буруу." };

  const monthHours: number[] = [];
  for (let m = 1; m <= 12; m++) monthHours.push(num(formData.get(`mh_${m}`)));

  const shRate = num(formData.get("sh_rate"));
  const shCeiling = num(formData.get("sh_ceiling"));
  const employerShRate = num(formData.get("employer_sh_rate"));
  const pitRate = num(formData.get("pit_rate"));
  const advanceRate = num(formData.get("advance_rate"));

  const { error } = await supabase.from("salary_settings").upsert(
    {
      year,
      month_hours: monthHours,
      sh_rate: shRate,
      sh_ceiling: shCeiling,
      employer_sh_rate: employerShRate,
      pit_rate: pitRate,
      advance_rate: advanceRate,
    },
    { onConflict: "year" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/salary");
  return { ok: true, id: year };
}

// ── ЭА (ээлжийн амралт) дүн бодох ────────────────────────────────────────────
// TSALIN_TURUL.md §4: (year, month)-ийн ӨМНӨХ сүүлийн 11 сарын хадгалсан
// цалингаас 1 өдрийн дундаж гарган, туршлагаас хамаарах ЭА хоногоор үржүүлнэ.
export type VacationActionResult =
  | { ok: true; result: VacationResult; years: number }
  | { ok: false; error: string };

export async function computeVacationAmount(
  employeeId: number,
  year: number,
  month: number,
): Promise<VacationActionResult> {
  const { supabase } = await requireAuth();

  const { data: emp, error: empErr } = await supabase
    .from("employees")
    .select("experience_years, hired_date")
    .eq("id", employeeId)
    .single();
  if (empErr || !emp) return { ok: false, error: "Ажилтан олдсонгүй." };

  // Туршлага: гараар оруулсан жил, үгүй бол ажилд орсон огнооноос тооцоо.
  const asOf = `${year}-${String(month).padStart(2, "0")}-01`;
  const years =
    Number(emp.experience_years) > 0
      ? Number(emp.experience_years)
      : tenureYears(emp.hired_date as string | null, asOf);

  // Сүүлийн 11 сар (тухайн сарыг оруулахгүй).
  const target = year * 12 + month;
  const startIdx = target - 11;

  const { data: recs } = await supabase
    .from("salary_records")
    .select("year, month, gross, vacation_amount, bonus, worked_hours")
    .eq("employee_id", employeeId)
    .eq("is_active", true);

  const months = (recs ?? [])
    .filter((r) => {
      const idx = (r.year as number) * 12 + (r.month as number);
      return idx >= startIdx && idx < target;
    })
    .map((r) => ({
      gross: Number(r.gross) || 0,
      vacation_amount: Number(r.vacation_amount) || 0,
      bonus: Number(r.bonus) || 0,
      worked_hours: Number(r.worked_hours) || 0,
    }));

  if (months.length === 0)
    return {
      ok: false,
      error:
        "Сүүлийн 11 сарын хадгалсан цалин олдсонгүй. Эхлээд өмнөх саруудын цалинг бодож хадгална уу.",
    };

  return { ok: true, result: computeVacation(months, years), years };
}
