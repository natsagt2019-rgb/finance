import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { EntryForm } from "../../entry-form";
import {
  REGISTER_SELECT,
  type AccountOption,
  type CashType,
  type PartnerOption,
  type RegisterRow,
} from "../../types";

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const initialType: CashType = type === "out" ? "out" : "in";

  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });

  const [{ data: regData }, { data: accData }, { data: partData }] =
    await Promise.all([
      supabase
        .from("cash_registers")
        .select(REGISTER_SELECT)
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(2000),
      supabase
        .from("accounts")
        .select("id, code, name")
        .eq("is_active", true)
        .order("code", { ascending: true })
        .limit(3000),
      supabase
        .from("partners")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(3000),
    ]);

  const registers = (regData as RegisterRow[] | null) ?? [];
  const accounts = (accData as AccountOption[] | null) ?? [];
  const partners = (partData as PartnerOption[] | null) ?? [];

  return (
    <div>
      <Link
        href="/cash?tab=entries"
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Баримт
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Шинэ баримт</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Кассын орлого/зарлага бүртгэж, журнал автоматаар үүсгэнэ.
      </p>

      <div className="mt-6">
        <EntryForm
          initialType={initialType}
          registers={registers}
          accounts={accounts}
          partners={partners}
          today={today}
        />
      </div>
    </div>
  );
}
