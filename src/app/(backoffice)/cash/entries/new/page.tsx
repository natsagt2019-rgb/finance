import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { balanceByRegister } from "@/lib/cash-calc";
import { EntryForm } from "../../entry-form";
import { nextDocNo } from "../../actions";
import {
  ENTRY_SELECT,
  REGISTER_SELECT,
  type AccountOption,
  type CashType,
  type EntryRow,
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

  const [
    { data: regData },
    { data: accData },
    { data: partData },
    { data: entData },
    nextIn,
    nextOut,
  ] = await Promise.all([
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
      .select("id, name, register")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(3000),
    supabase.from("cash_entries").select("id, register_id, type, amount_mnt").limit(50000),
    nextDocNo(supabase, "in"),
    nextDocNo(supabase, "out"),
  ]);

  const registers = (regData as RegisterRow[] | null) ?? [];
  const accounts = (accData as AccountOption[] | null) ?? [];
  const partners = (partData as PartnerOption[] | null) ?? [];

  // Касс бүрийн одоогийн үлдэгдэл (форм дээр харуулна).
  const balances = balanceByRegister(
    ((entData as Pick<EntryRow, "id" | "register_id" | "type" | "amount_mnt">[] | null) ?? []).map(
      (e) => ({
        id: e.id,
        date: "",
        type: e.type,
        amount_mnt: Number(e.amount_mnt),
        register_id: e.register_id,
      }),
    ),
  );

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
          balances={balances}
          nextDoc={{ in: nextIn, out: nextOut }}
          today={today}
        />
      </div>
    </div>
  );
}
