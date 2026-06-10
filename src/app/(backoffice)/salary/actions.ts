"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { postJournal } from "@/lib/post-journal";
import {
  computeRow,
  computeVacation,
  tenureYears,
  paramsFromSettings,
  DEFAULT_MONTH_HOURS_2026,
  type SalaryParams,
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
  return {
    name: get("name"),
    company: get("company") || null,
    position: get("position") || null,
    base_salary: num(formData.get("base_salary")),
    phone_allowance: num(formData.get("phone_allowance")),
    register: get("register") || null,
    bank_account: get("bank_account") || null,
    hired_date: get("hired_date") || null,
    experience_years: num(formData.get("experience_years")),
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

// ── Цалин тооцоо: тухайн сарын мөрүүдийг бодож хадгалах ──────────────────────
// calc-tab-аас ирэх нэг мөрийн оролт.
export type SalaryInputRow = {
  employee_id: number;
  employee_name: string;
  company: string | null;
  base_salary: number;
  worked_hours: number;
  phone_allowance: number;
  bonus: number;
  vacation_amount: number;
  other_deduction: number;
  staff_inv_settle?: number; // БМ дутагдлын авлагыг энэ удаа барагдуулах дүн
};

// Тохиргоог татаж SalaryParams + сарын цаг буцаана.
async function loadParams(
  supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"],
  year: number,
): Promise<{ params: SalaryParams; monthHours: number[] }> {
  const { data } = await supabase
    .from("salary_settings")
    .select("sh_rate, sh_ceiling, pit_rate, advance_rate, pit_tiers, month_hours")
    .eq("year", year)
    .maybeSingle();

  const monthHours =
    Array.isArray(data?.month_hours) && data.month_hours.length === 12
      ? (data.month_hours as number[])
      : DEFAULT_MONTH_HOURS_2026;

  return { params: paramsFromSettings(data), monthHours };
}

export async function saveSalary(
  year: number,
  month: number,
  rows: SalaryInputRow[],
): Promise<ActionResult> {
  const { supabase } = await requireAuth();
  if (month < 1 || month > 12) return { ok: false, error: "Сар буруу." };

  const { params, monthHours } = await loadParams(supabase, year);
  const mh = monthHours[month - 1] ?? 0;

  const records = rows.map((r) => {
    const c = computeRow(
      {
        base: r.base_salary,
        monthHours: mh,
        workedHours: r.worked_hours,
        phoneAllowance: r.phone_allowance,
        bonus: r.bonus,
        vacationAmount: r.vacation_amount,
        otherDeduction: r.other_deduction,
      },
      params,
    );
    return {
      employee_id: r.employee_id,
      year,
      month,
      employee_name: r.employee_name,
      company: r.company,
      base_salary: r.base_salary,
      worked_hours: r.worked_hours,
      month_hours: mh,
      phone_allowance: r.phone_allowance,
      bonus: r.bonus,
      vacation_amount: r.vacation_amount,
      other_deduction: r.other_deduction,
      ...c,
      is_active: true,
    };
  });

  if (records.length === 0) return { ok: false, error: "Хадгалах мөр алга." };

  const { error } = await supabase
    .from("salary_records")
    .upsert(records, { onConflict: "employee_id,year,month" });

  if (error) return { ok: false, error: error.message };

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

// ── Тохиргоо хадгалах ────────────────────────────────────────────────────────
export async function saveSettings(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAuth();

  const year = num(formData.get("year"));
  if (year < 2000 || year > 2100) return { ok: false, error: "Он буруу." };

  const monthHours: number[] = [];
  for (let m = 1; m <= 12; m++) monthHours.push(num(formData.get(`mh_${m}`)));

  const shRate = num(formData.get("sh_rate"));
  const shCeiling = num(formData.get("sh_ceiling"));
  const pitRate = num(formData.get("pit_rate"));
  const advanceRate = num(formData.get("advance_rate"));

  const { error } = await supabase.from("salary_settings").upsert(
    {
      year,
      month_hours: monthHours,
      sh_rate: shRate,
      sh_ceiling: shCeiling,
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
