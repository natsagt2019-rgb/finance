// Кассын модулийн төрлүүд + Supabase select мөрүүд.

import type { CashType } from "@/lib/cash-calc";

export const COMPANIES = ["ТҮМЭН РЕСУРС", "ТҮМЭН ТЭЭХ"] as const;

export const CURRENCIES = ["MNT", "USD", "CNY", "EUR", "RUB"] as const;

export const TABS = ["entries", "book", "registers", "settings"] as const;
export type Tab = (typeof TABS)[number];

export type { CashType };

// ── Касс (бэлэн мөнгөний цэг) ─────────────────────────────────────────────────
export type RegisterRow = {
  id: number;
  name: string;
  currency: string;
  account_id: number | null;
  company: string | null;
  note: string | null;
  is_active: boolean;
};

export const REGISTER_SELECT =
  "id, name, currency, account_id, company, note, is_active";

// ── Баримт (орлого/зарлага) ────────────────────────────────────────────────────
export type EntryRow = {
  id: number;
  date: string; // YYYY-MM-DD
  type: CashType;
  register_id: number;
  amount: number;
  rate: number;
  amount_mnt: number;
  partner_id: number | null;
  counter_account_id: number | null;
  doc_no: string | null;
  description: string | null;
  company: string | null;
  journal_id: number | null;
  month: number | null;
  year: number | null;
};

export const ENTRY_SELECT =
  "id, date, type, register_id, amount, rate, amount_mnt, partner_id, " +
  "counter_account_id, doc_no, description, company, journal_id, month, year";

// ── Тохиргоо ─────────────────────────────────────────────────────────────────
export type CashSettings = {
  id: number;
  default_income_account_id: number | null;
  default_expense_account_id: number | null;
  auto_journal: boolean;
};

export const SETTINGS_SELECT =
  "id, default_income_account_id, default_expense_account_id, auto_journal";

// ── Туслах (dropdown-д) ──────────────────────────────────────────────────────
export type AccountOption = { id: number; code: string; name: string };
export type PartnerOption = { id: number; name: string };
