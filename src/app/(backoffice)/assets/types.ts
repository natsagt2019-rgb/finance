// ── Ангилал ─────────────────────────────────────────────────────────────────
export type CategoryRow = {
  id: number;
  code: string | null;
  name: string;
  useful_life_years: number;
  account_code: string | null;
  accum_account_code: string | null;
  is_active: boolean;
};

export const CATEGORY_SELECT =
  "id, code, name, useful_life_years, account_code, accum_account_code, is_active";

// ── Хөрөнгийн карт ───────────────────────────────────────────────────────────
export type AssetStatus = "active" | "disposed";

export type AssetRow = {
  id: number;
  name: string;
  code: string | null;
  category_id: number | null;
  company: string | null;
  acquired_date: string | null; // YYYY-MM-DD
  cost: number;
  salvage_value: number;
  useful_life_years: number | null;
  location: string | null;
  responsible: string | null;
  opening_date: string | null; // эхний үлдэгдлийн огноо
  opening_accum_depreciation: number; // тэр огноо дахь хуримтлагдсан элэгдэл
  status: AssetStatus;
  disposed_date: string | null;
  disposal_note: string | null;
  is_active: boolean;
};

export const ASSET_SELECT =
  "id, name, code, category_id, company, acquired_date, cost, salvage_value, " +
  "useful_life_years, location, responsible, opening_date, " +
  "opening_accum_depreciation, status, disposed_date, " +
  "disposal_note, is_active";

// ── Элэгдлийн снапшот ────────────────────────────────────────────────────────
export type DepreciationRow = {
  id: number;
  asset_id: number;
  year: number;
  month: number;
  asset_name: string | null;
  category_name: string | null;
  company: string | null;
  cost: number;
  monthly_depreciation: number;
  accumulated_depreciation: number;
  net_book_value: number;
  is_active: boolean;
};

export const DEPRECIATION_SELECT =
  "id, asset_id, year, month, asset_name, category_name, company, cost, " +
  "monthly_depreciation, accumulated_depreciation, net_book_value, is_active";

// ── Туслах ─────────────────────────────────────────────────────────────────
export const COMPANIES = ["ТҮМЭН РЕСУРС", "ТҮМЭН ТЭЭХ"] as const;
export const TABS = ["assets", "depreciation", "summary", "settings"] as const;
export type Tab = (typeof TABS)[number];
