// bank-registry.ts — Бүртгэлтэй банкны дансны нэгдсэн эх сурвалж.
//
// Өмнө нь данс бүрийн нэр/валют/GL/компани нь config.ts-д hardcode хийгдсэн
// богино код (TT/GM/MB/TR…)-оор зохион байгуулагдсан. Одоо бүгд bank_accounts
// хүснэгтээс (дансны бүтэн дугаараар) динамикаар уншигдана. Хуулга цэгцлэгчээс
// импортлоход гүйлгээний account_id нь яг энэ дугаар болж хадгалагдана.
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type RegistryAccount = {
  accountNo: string; // gүйлгээний account_id — дансны бүтэн дугаар
  bankType: string; // 'tdb' | 'golomt' | 'mbank' | 'khas' …
  label: string; // UI дэлгэцийн нэр
  glCode: string | null; // харилцах дансны GL код
  currency: string; // 'MNT' | 'USD' | 'EUR' …
  company: string | null; // 'ТҮМЭН ТЭЭХ ХХК' | 'ТҮМЭН РЕСУРС ХХК' | null
  sort: number;
};

// Идэвхтэй бүх банкны дансыг эрэмбэлж буцаана.
export async function loadRegistry(
  supabase: SupabaseClient,
): Promise<RegistryAccount[]> {
  const { data } = await supabase
    .from("bank_accounts")
    .select("account_no, bank_type, label, gl_code, currency, company, sort")
    .eq("is_active", true)
    .order("sort", { ascending: true })
    .order("id", { ascending: true })
    .limit(1000);

  return (
    (data as
      | {
          account_no: string;
          bank_type: string | null;
          label: string | null;
          gl_code: string | null;
          currency: string | null;
          company: string | null;
          sort: number | null;
        }[]
      | null) ?? []
  ).map((a) => ({
    accountNo: a.account_no,
    bankType: a.bank_type ?? "tdb",
    label: a.label || a.account_no,
    glCode: a.gl_code,
    currency: a.currency || "MNT",
    company: a.company,
    sort: a.sort ?? 0,
  }));
}

// accountNo → label (дэлгэцийн нэр) map.
export function displayMap(accounts: RegistryAccount[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const a of accounts) m[a.accountNo] = a.label;
  return m;
}

// accountNo → currency map.
export function currencyMap(accounts: RegistryAccount[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const a of accounts) m[a.accountNo] = a.currency;
  return m;
}

// Бүртгэлд буй компаниудыг (давхцалгүй, эрэмбээр) буцаана — компанийн dropdown-д.
export function companyList(accounts: RegistryAccount[]): string[] {
  const seen: string[] = [];
  for (const a of accounts) {
    if (a.company && !seen.includes(a.company)) seen.push(a.company);
  }
  return seen;
}

// Компаниар шүүх (null company → зөвхөн "бүгд"-д орно). company=null бол бүгд.
export function accountsForCompany(
  accounts: RegistryAccount[],
  company: string | null,
): RegistryAccount[] {
  if (!company) return accounts;
  return accounts.filter((a) => a.company === company);
}
