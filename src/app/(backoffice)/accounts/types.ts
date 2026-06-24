export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "income"
  | "expense";

// ААНОАТ зөрүүгийн ангилал (А/144 журам). NULL = энгийн (зөрүүгүй).
export type TaxClass = "non_deductible" | "exempt_income" | "temp_diff";

export const TAX_CLASS_OPTIONS: { value: TaxClass; label: string; hint: string }[] = [
  {
    value: "non_deductible",
    label: "Хасагдахгүй зардал (байнгын нэмэгдэл)",
    hint: "Торгууль, алданги, хязгаараас давсан хүү/хандив — ААНОАТ хууль 16.1",
  },
  {
    value: "exempt_income",
    label: "Чөлөөлөгдөх орлого (байнгын хасагдал)",
    hint: "Татвараас чөлөөлөгдөх орлого — ААНОАТ хууль 21",
  },
  {
    value: "temp_diff",
    label: "Түр зөрүү",
    hint: "Элэгдлийн зөрүү, нөөцийн зардал — ААНОАТ хууль 13",
  },
];

export type AccountRow = {
  id: number;
  code: string;
  name: string;
  name_en: string | null;
  type: AccountType;
  parent_id: number | null;
  is_active: boolean;
  note: string | null;
  fs_line: string | null;
  account_number: string | null;
  currency: string | null;
  nature: string | null;
  journal_type: string | null;
  department_code: string | null;
  department_name: string | null;
  bank_name: string | null;
  bank_account: string | null;
  is_temp: boolean;
  temp_percent: number | null;
  is_cogs: boolean;
  tax_class: TaxClass | null;
};

export const ACCOUNT_SELECT =
  "id, code, name, name_en, type, parent_id, is_active, note, fs_line, " +
  "account_number, currency, nature, journal_type, department_code, " +
  "department_name, bank_name, bank_account, is_temp, temp_percent, is_cogs, " +
  "tax_class";

export const ACCOUNT_TYPES: AccountType[] = [
  "asset",
  "liability",
  "equity",
  "income",
  "expense",
];
