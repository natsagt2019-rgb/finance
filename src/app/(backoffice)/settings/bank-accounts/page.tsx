import { createClient } from "@/lib/supabase/server";
import { BankAccountsClient, type BankAccountRow, type GlOption } from "./bank-accounts-client";

export const metadata = { title: "Банкны данс — Тохиргоо" };

export default async function BankAccountsSettingsPage() {
  const supabase = await createClient();

  const [{ data: accs }, { data: glAccs }] = await Promise.all([
    supabase
      .from("bank_accounts")
      .select("id, account_no, bank_type, label, gl_code, currency")
      .order("sort", { ascending: true })
      .order("id", { ascending: true })
      .limit(1000),
    // Мөнгөн хөрөнгийн (харилцах/касс) GL дансууд — 110-аар эхэлсэн.
    supabase
      .from("accounts")
      .select("code, name")
      .eq("is_active", true)
      .like("code", "110%")
      .order("code", { ascending: true })
      .limit(200),
  ]);

  const accounts = (accs as BankAccountRow[] | null) ?? [];
  const glOptions = (glAccs as GlOption[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Банкны данс</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Хуулга цэгцлэгчид ашиглах банкны дансаа бүртгэнэ. Хуулга оруулахад
          файлын нэрэн дэх дансны дугаараар тухайн дансыг таниж, банкны төрлөөр
          (ТДБ / Голомт / М банк) задлан унших parser-ийг сонгоно.
        </p>
      </div>

      <BankAccountsClient accounts={accounts} glOptions={glOptions} />
    </div>
  );
}
