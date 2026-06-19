import type { PitTier, SalaryType } from "@/lib/salary-calc";

// ── Ажилтан ─────────────────────────────────────────────────────────────────
export type EmployeeStatus = "active" | "inactive";

export type EmployeeRow = {
  id: number;
  name: string; // "Овог Нэр" нийлмэл (last_name + first_name-ээс автоматаар бүрдэнэ)
  last_name: string | null; // Овог
  first_name: string | null; // Нэр
  company: string | null;
  position: string | null;
  salary_type: SalaryType; // тогтмол / цагийн хөлс / гараар
  base_salary: number;
  phone_allowance: number;
  register: string | null;
  bank_account: string | null;
  hired_date: string | null; // YYYY-MM-DD
  experience_years: number; // туршлага (жил) — ЭА хоногт
  status: EmployeeStatus;
  is_active: boolean;
};

export const EMPLOYEE_SELECT =
  "id, name, last_name, first_name, company, position, salary_type, base_salary, phone_allowance, " +
  "register, bank_account, hired_date, experience_years, status, is_active";

// ── Цалингийн мөр ─────────────────────────────────────────────────────────────
export type SalaryRow = {
  id: number;
  employee_id: number;
  year: number;
  month: number;
  employee_name: string | null;
  company: string | null;
  salary_type: SalaryType;
  base_salary: number;
  worked_hours: number;
  month_hours: number;
  phone_allowance: number;
  bonus: number;
  vacation_amount: number;
  late_deduction: number; // хоцролт
  savings_deduction: number; // хуримтлал
  discipline_deduction: number; // сахилгын шийтгэл
  other_deduction: number; // бусад
  computed_salary: number;
  gross: number;
  sh_insurance: number;
  pit: number;
  advance: number;
  net: number;
  is_active: boolean;
};

export const SALARY_SELECT =
  "id, employee_id, year, month, employee_name, company, salary_type, base_salary, " +
  "worked_hours, month_hours, phone_allowance, bonus, vacation_amount, " +
  "late_deduction, savings_deduction, discipline_deduction, other_deduction, " +
  "computed_salary, gross, sh_insurance, pit, advance, net, is_active";

// ── Тохиргоо ─────────────────────────────────────────────────────────────────
export type SalarySettings = {
  id: number;
  year: number;
  month_hours: number[];
  sh_rate: number;
  sh_ceiling: number;
  pit_rate: number;
  advance_rate: number;
  pit_tiers: PitTier[] | null;
};

export const SETTINGS_SELECT =
  "id, year, month_hours, sh_rate, sh_ceiling, pit_rate, advance_rate, pit_tiers";

// ── Туслах ─────────────────────────────────────────────────────────────────
// Нийтлэг build — компанийн тогтмол утга байхгүй (шаардвал энд нэмнэ).
export const COMPANIES: readonly string[] = [];
export const TABS = ["employees", "calc", "summary", "settings"] as const;
export type Tab = (typeof TABS)[number];
