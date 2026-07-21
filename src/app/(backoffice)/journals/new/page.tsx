import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { JournalForm } from "../journal-form";
import type { AccountOption } from "../types";

export default async function NewJournalPage() {
  const supabase = await createClient();

  const [{ data: accRows }, { data: partRows }, { data: bankRows }, { data: cashRegRows }] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, code, name")
        .eq("is_active", true)
        .order("code", { ascending: true })
        .limit(2000),
      supabase
        .from("partners")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(2000),
      supabase.from("bank_accounts").select("gl_code").eq("is_active", true),
      supabase.from("cash_registers").select("account_id").eq("is_active", true),
    ]);

  const accounts = (accRows as AccountOption[] | null) ?? [];
  const partners = (partRows as { id: number; name: string }[] | null) ?? [];

  // Касс/банкны GL дансны кодууд — эдгээр мөрд дүнг гараар бичихгүй, гүйлгээ холбоно.
  const bankCodes = ((bankRows as { gl_code: string | null }[] | null) ?? [])
    .map((b) => b.gl_code)
    .filter((c): c is string => !!c);
  const cashAccIds = new Set(
    ((cashRegRows as { account_id: number | null }[] | null) ?? [])
      .map((r) => r.account_id)
      .filter((x): x is number => x != null),
  );
  const cashCodes = accounts.filter((a) => cashAccIds.has(a.id)).map((a) => a.code);
  const cashBankCodes = [...new Set([...bankCodes, ...cashCodes])];

  // Серверийн өнөөдрийг ISO-гоор (Монголын цаг).
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/journals" className="hover:text-zinc-700 hover:underline">
          Журнал
        </Link>
        <span>›</span>
        <span className="text-zinc-700">Шинэ гар бичилт</span>
      </div>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
        Журналын гар бичилт
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Данс сонгож дебет/кредит бичнэ. Дебет = Кредит баланслахад хадгална.
      </p>

      {accounts.length === 0 ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Данс олдсонгүй. Эхлээд дансны төлөвлөгөөгөө оруулна уу.
        </div>
      ) : (
        <div className="mt-6">
          <JournalForm
            accounts={accounts}
            partners={partners}
            today={today}
            cashBankCodes={cashBankCodes}
          />
        </div>
      )}
    </div>
  );
}
