// Үндсэн байгууллагын мэдээлэл. DB-ийн company_settings (нэг мөр)-оос уншина.
// Тохиргоо → Байгууллага хуудаснаас бүртгэнэ/засна. Бүртгээгүй бол хоосон утга.
import { createClient } from "@/lib/supabase/server";

export type CompanyInfo = {
  name: string; // "Компани" ХХК
  nameUpper: string; // ИХ ҮСГЭЭР
  address: string;
  phone: string;
  email: string;
  web: string;
  register: string; // ТТД
  taxId: string; // НӨАТ дугаар
  bankName: string;
  bankAccount: string;
  bankIban: string;
  director: string; // захирал (гарын үсэг)
  accountant: string; // нягтлан (гарын үсэг)
  isVatPayer: boolean; // НӨАТ төлөгч эсэх (нэхэмжлэлд 10% тооцох)
};

// Бүртгээгүй үеийн хоосон утга (нийтлэг build — тодорхой компани hardcode-логүй).
export const EMPTY_COMPANY: CompanyInfo = {
  name: "",
  nameUpper: "",
  address: "",
  phone: "",
  email: "",
  web: "",
  register: "",
  taxId: "",
  bankName: "",
  bankAccount: "",
  bankIban: "",
  director: "",
  accountant: "",
  isVatPayer: true,
};

export const COMPANY_SELECT =
  "name, name_upper, address, phone, email, web, register, tax_id, " +
  "bank_name, bank_account, bank_iban, director, accountant, is_vat_payer";

type Row = {
  name: string;
  name_upper: string;
  address: string;
  phone: string;
  email: string;
  web: string;
  register: string;
  tax_id: string;
  bank_name: string;
  bank_account: string;
  bank_iban: string;
  director: string;
  accountant: string;
  is_vat_payer: boolean;
};

function rowToInfo(r: Row): CompanyInfo {
  return {
    name: r.name ?? "",
    nameUpper: r.name_upper ?? "",
    address: r.address ?? "",
    phone: r.phone ?? "",
    email: r.email ?? "",
    web: r.web ?? "",
    register: r.register ?? "",
    taxId: r.tax_id ?? "",
    bankName: r.bank_name ?? "",
    bankAccount: r.bank_account ?? "",
    bankIban: r.bank_iban ?? "",
    director: r.director ?? "",
    accountant: r.accountant ?? "",
    isVatPayer: r.is_vat_payer ?? true,
  };
}

// Байгууллагын мэдээллийг уншина (бүртгээгүй бол EMPTY_COMPANY).
export async function loadCompany(): Promise<CompanyInfo> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_settings")
    .select(COMPANY_SELECT)
    .eq("id", 1)
    .maybeSingle();
  return data ? rowToInfo(data as unknown as Row) : EMPTY_COMPANY;
}

// Байгууллага бүртгэгдсэн эсэх (нэр оруулсан мөр байгаа эсэх).
export async function isCompanyRegistered(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_settings")
    .select("name")
    .eq("id", 1)
    .maybeSingle();
  return !!(data && typeof data.name === "string" && data.name.trim() !== "");
}

export const VAT_RATE = 0.1; // НӨАТ 10%
