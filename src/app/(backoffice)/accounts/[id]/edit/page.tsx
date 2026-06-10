import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AccountForm, type ParentOption } from "../../account-form";
import { ACCOUNT_SELECT, type AccountRow } from "../../types";

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const accId = Number(id);
  const supabase = await createClient();

  const [{ data, error }, { data: parentRows }] = await Promise.all([
    supabase.from("accounts").select(ACCOUNT_SELECT).eq("id", accId).single(),
    supabase
      .from("accounts")
      .select("id, code, name")
      .eq("is_active", true)
      .order("code", { ascending: true })
      .limit(2000),
  ]);

  if (error || !data) notFound();
  const account = data as unknown as AccountRow;

  // Өөрийгөө эх данс болгож сонгуулахгүй
  const parents = ((parentRows as ParentOption[] | null) ?? []).filter(
    (p) => p.id !== accId,
  );

  return (
    <div>
      <Link href="/accounts" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Дансны жагсаалт
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Данс засах</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {account.code} — {account.name}
      </p>

      <div className="mt-6">
        <AccountForm mode="edit" account={account} parents={parents} />
      </div>
    </div>
  );
}
