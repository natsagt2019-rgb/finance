import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { AccountForm, type ParentOption } from "../account-form";

export default async function NewAccountPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accounts")
    .select("id, code, name")
    .eq("is_active", true)
    .order("code", { ascending: true })
    .limit(2000);

  const parents = (data as ParentOption[] | null) ?? [];

  return (
    <div>
      <Link href="/accounts" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Дансны жагсаалт
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Шинэ данс</h1>
      <p className="mt-1 text-sm text-zinc-500">Дансны мэдээллийг оруулна уу.</p>

      <div className="mt-6">
        <AccountForm mode="create" parents={parents} />
      </div>
    </div>
  );
}
