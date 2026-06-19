import type { PitTier } from "@/lib/salary-calc";

// ── Ажилтан ─────────────────────────────────────────────────────────────────
export type EmployeeStatus = "active" | "inactive";

export type EmployeeRow = {
  id: number;
  name: string;
  company: string | null;
  position: string | null;
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
  "id, name, company, position, base_salary, phone_allowance, " +
  "register, bank_account, hired_date, experience_years, status, is_active";

// ── Цалингийн мөр ─────────────────────────────────────────────────────────────
export type SalaryRow = {
  id: number;
  employee_id: number;
  year: number;
  month: number;
  employee_name: string | null;
  company: string | null;
  base_salary: number;
  worked_hours: number;
  month_hours: number;
  phone_allowance: number;
  bonus: number;
  vacation_amount: number;
  other_deduction: number;
  computed_salary: number;
  gross: number;
  sh_insurance: number;
  pit: number;
  advance: number;
  net: number;
  is_active: boolean;
};

export const SALARY_SELECT =
  "id, employee_id, year, month, employee_name, company, base_salary, " +
  "worked_hours, month_hours, phone_allowance, bonus, vacation_amount, " +
  "other_deduction, computed_salary, gross, sh_insurance, pit, advance, net, is_active";

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
