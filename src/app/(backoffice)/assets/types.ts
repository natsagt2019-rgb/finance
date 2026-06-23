// ── Ангилал ─────────────────────────────────────────────────────────────────
export type CategoryRow = {
  id: number;
  code: string | null;
  name: string;
  useful_life_years: number;
  account_code: string | null; // хөрөнгийн данс
  accum_account_code: string | null; // хуримтлагдсан элэгдэл (Кт)
  expense_account_code: string | null; // элэгдлийн зардал (Дт)
  is_active: boolean;
};

export const CATEGORY_SELECT =
  "id, code, name, useful_life_years, account_code, accum_account_code, " +
  "expense_account_code, is_active";

// ── Байршил (мастер) ─────────────────────────────────────────────────────────
export type LocationRow = {
  id: number;
  code: string | null;
  name: string;
  is_active: boolean;
};

export const LOCATION_SELECT = "id, code, name, is_active";

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
  location_id: number | null; // байршлын лавлах (asset_locations)
  barcode: string | null; // баар код
  responsible: string | null;
  opening_date: string | null; // эхний үлдэгдлийн огноо
  opening_accum_depreciation: number; // тэр огноо дахь хуримтлагдсан элэгдэл
  acquisition_vat: number;
  acquisition_journal_id: number | null;
  status: AssetStatus;
  disposed_date: string | null;
  disposal_note: string | null;
  disposal_type: "writeoff" | "sale" | null;
  disposal_proceeds: number;
  disposal_vat: number;
  disposal_journal_id: number | null;
  is_active: boolean;
};

export const ASSET_SELECT =
  "id, name, code, category_id, company, acquired_date, cost, salvage_value, " +
  "useful_life_years, location, location_id, barcode, responsible, opening_date, " +
  "opening_accum_depreciation, acquisition_vat, acquisition_journal_id, " +
  "status, disposed_date, " +
  "disposal_note, disposal_type, disposal_proceeds, disposal_vat, " +
  "disposal_journal_id, is_active";

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
export const COMPANIES: readonly string[] = [];
export const TABS = ["assets", "depreciation", "summary", "locations", "settings"] as const;
export type Tab = (typeof TABS)[number];
