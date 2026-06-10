import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_SELECT, type AccountRow, type AccountType } from "./types";
import { DeleteAccountButton } from "./delete-button";

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

  // Эх дансны нэрийг id-аар хайх map
  const nameById = new Map<number, string>();
  for (const a of accounts) nameById.set(a.id, a.name);

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

      {/* Хүснэгт */}
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white">
        {error ? (
          <div className="px-6 py-10 text-center text-sm text-red-600">
            Алдаа: {error.message}
            <p className="mt-2 text-zinc-500">
              accounts хүснэгт үүссэн эсэхийг шалгана уу (schema.sql).
            </p>
          </div>
        ) : shown.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-zinc-500">
            Данс байхгүй байна.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Код</th>
                  <th className="px-4 py-2">Дансны нэр</th>
                  <th className="px-4 py-2">Төрөл</th>
                  <th className="px-4 py-2">Эх данс</th>
                  <th className="px-4 py-2 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {shown.map((a) => {
                  const badge = TYPE_BADGE[a.type];
                  const parentName =
                    a.parent_id != null ? nameById.get(a.parent_id) : null;
                  // Код бүтцээс түвшин: AA0000=класс, AABB00=бүлэг, бусад=навч
                  const depth = a.code.endsWith("0000")
                    ? 0
                    : a.code.endsWith("00")
                      ? 1
                      : 2;
                  return (
                    <tr key={a.id} className="hover:bg-zinc-50">
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-rose-600">
                        {a.code}
                      </td>
                      <td className="px-4 py-2 text-zinc-800">
                        <div style={{ paddingLeft: depth * 18 }}>
                          {depth > 0 ? (
                            <span className="text-zinc-400">└ </span>
                          ) : null}
                          <span
                            className={depth === 0 ? "font-semibold" : undefined}
                          >
                            {a.name}
                          </span>
                          {a.name_en ? (
                            <span className="ml-2 text-xs text-zinc-400">
                              {a.name_en}
                            </span>
                          ) : null}
                          {a.note ? (
                            <div className="text-xs text-zinc-400">{a.note}</div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-zinc-500">
                        {parentName ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        <Link
                          href={`/accounts/${a.id}/edit`}
                          className="mr-1 rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Засах
                        </Link>
                        <DeleteAccountButton id={a.id} name={a.name} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
