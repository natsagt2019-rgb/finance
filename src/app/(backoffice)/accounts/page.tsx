import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_SELECT, type AccountRow, type AccountType } from "./types";
import { AccountTree } from "./account-tree";

const ROW_LIMIT = 2000;

const TYPE_BADGE: Record<AccountType, { label: string; cls: string }> = {
  asset: { label: "Хөрөнгө", cls: "bg-blue-100 text-blue-700" },
  liability: { label: "Өр төлбөр", cls: "bg-red-100 text-red-700" },
  equity: { label: "Өмч", cls: "bg-purple-100 text-purple-700" },
  income: { label: "Орлого", cls: "bg-green-100 text-green-700" },
  expense: { label: "Зардал", cls: "bg-orange-100 text-orange-700" },
};

const TYPE_ORDER: AccountType[] = [
  "asset",
  "liability",
  "equity",
  "income",
  "expense",
];

type SearchParams = {
  type?: string;
};

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const selType =
    sp.type && TYPE_ORDER.includes(sp.type as AccountType)
      ? (sp.type as AccountType)
      : "";

  const { data: rows, error } = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT)
    .eq("is_active", true)
    .order("code", { ascending: true })
    .limit(ROW_LIMIT);

  const accounts = (rows as AccountRow[] | null) ?? [];

  // Төрөл тус бүрийн тоо
  const counts = new Map<AccountType, number>();
  for (const a of accounts) counts.set(a.type, (counts.get(a.type) ?? 0) + 1);

  const shown = selType
    ? accounts.filter((a) => a.type === selType)
    : accounts;

  const tabHref = (type: string) =>
    type ? `/accounts?type=${type}` : "/accounts";

  const tabCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${
      active
        ? "bg-zinc-900 text-white"
        : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Дансны жагсаалт
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Аж ахуйн нэгжийн дансны мод — код, нэр, ангилал, эх данс.
          </p>
        </div>
        <Link
          href="/accounts/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + Данс нэмэх
        </Link>
      </div>

      {/* Шүүлтийн tab */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link href={tabHref("")} className={tabCls(!selType)}>
          Бүгд ({accounts.length})
        </Link>
        {TYPE_ORDER.map((t) => (
          <Link key={t} href={tabHref(t)} className={tabCls(selType === t)}>
            {TYPE_BADGE[t].label} ({counts.get(t) ?? 0})
          </Link>
        ))}
      </div>

      {/* Модлог харагдац */}
      <div className="mt-4">
        {error ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center text-sm text-red-600">
            Алдаа: {error.message}
            <p className="mt-2 text-zinc-500">
              accounts хүснэгт үүссэн эсэхийг шалгана уу (schema.sql).
            </p>
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">
            Данс байхгүй байна.
          </div>
        ) : (
          <AccountTree accounts={shown} />
        )}
      </div>
    </div>
  );
}
