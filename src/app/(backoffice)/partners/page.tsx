import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import type { PartnerRow, PartnerType } from "./actions";

type SearchParams = {
  q?: string;
  type?: string;
};

const ROW_LIMIT = 2000;

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const TYPE_BADGE: Record<PartnerType, { label: string; cls: string }> = {
  customer: { label: "Авлага", cls: "bg-green-100 text-green-700" },
  supplier: { label: "Өглөг", cls: "bg-amber-100 text-amber-700" },
  both: { label: "Хоёул", cls: "bg-zinc-100 text-zinc-600" },
};

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const search = (sp.q ?? "").trim();
  const selType = sp.type === "customer" || sp.type === "supplier" ? sp.type : "";

  // ── Харилцагчид ─────────────────────────────────────────────────────────
  let query = supabase
    .from("partners")
    .select("id, code, name, register, type, phone, email, address, is_active")
    .eq("is_active", true);

  if (selType) query = query.eq("type", selType);
  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `name.ilike.${term},code.ilike.${term},register.ilike.${term}`,
    );
  }

  const { data: rows, error } = await query
    .order("name", { ascending: true })
    .limit(ROW_LIMIT);

  const partners = (rows as PartnerRow[] | null) ?? [];

  // ── Мөнгөн гүйлгээний нэгтгэл (code-оор) ─────────────────────────────────
  const { data: cfRows } = await supabase
    .from("partner_cashflow")
    .select("master_code, total_income, total_expense");

  const cashByCode = new Map<string, { income: number; expense: number }>();
  for (const r of (cfRows as
    | { master_code: string; total_income: number | null; total_expense: number | null }[]
    | null) ?? []) {
    cashByCode.set(r.master_code, {
      income: Number(r.total_income) || 0,
      expense: Number(r.total_expense) || 0,
    });
  }

  let totalIncome = 0;
  let totalExpense = 0;
  for (const p of partners) {
    const cf = p.code ? cashByCode.get(p.code) : undefined;
    if (cf) {
      totalIncome += cf.income;
      totalExpense += cf.expense;
    }
  }

  const tabHref = (type: string) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (search) params.set("q", search);
    const qs = params.toString();
    return qs ? `/partners?${qs}` : "/partners";
  };

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
          <h1 className="text-2xl font-semibold text-zinc-900">Харилцагчид</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Харилцагчийн бүртгэл — нэр, код, регистр, төрөл.
          </p>
        </div>
        <Link
          href="/partners/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + Харилцагч нэмэх
        </Link>
      </div>

      {/* Шүүлт */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <Link href={tabHref("")} className={tabCls(!selType)}>
            Бүгд ({partners.length})
          </Link>
          <Link href={tabHref("customer")} className={tabCls(selType === "customer")}>
            Авлагатай
          </Link>
          <Link href={tabHref("supplier")} className={tabCls(selType === "supplier")}>
            Өглөгтэй
          </Link>
        </div>

        <form
          method="get"
          className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto"
        >
          {selType && <input type="hidden" name="type" value={selType} />}
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Нэр / код / регистр хайх…"
            className="w-full min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 sm:w-64 sm:flex-none"
          />
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Хайх
          </button>
          {search && (
            <Link
              href={tabHref(selType)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Цэвэрлэх
            </Link>
          )}
        </form>
      </div>

      {/* Хүснэгт */}
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white">
        {error ? (
          <div className="px-6 py-10 text-center text-sm text-red-600">
            Алдаа: {error.message}
            <p className="mt-2 text-zinc-500">
              partners хүснэгт үүссэн эсэхийг шалгана уу (schema.sql).
            </p>
          </div>
        ) : partners.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-zinc-500">
            Харилцагч олдсонгүй.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Код</th>
                  <th className="px-4 py-2">Нэр</th>
                  <th className="px-4 py-2">Регистр</th>
                  <th className="px-4 py-2">Утас</th>
                  <th className="px-4 py-2">Төрөл</th>
                  <th className="px-4 py-2 text-right">Орлого</th>
                  <th className="px-4 py-2 text-right">Зарлага</th>
                  <th className="px-4 py-2 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {partners.map((p) => {
                  const cf = p.code ? cashByCode.get(p.code) : undefined;
                  const badge = TYPE_BADGE[p.type] ?? TYPE_BADGE.both;
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50">
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-zinc-500">
                        {p.code || "—"}
                      </td>
                      <td className="px-4 py-2 font-medium text-zinc-800">
                        <Link
                          href={`/partners/${p.id}`}
                          className="hover:text-zinc-900 hover:underline"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                        {p.register || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                        {p.phone || "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                        {cf && cf.income ? (
                          <span className="font-medium text-green-700">
                            {fmtMoney(cf.income)}
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                        {cf && cf.expense ? (
                          <span className="font-medium text-red-700">
                            {fmtMoney(cf.expense)}
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        <Link
                          href={`/partners/${p.id}/edit`}
                          className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Засах
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm font-semibold">
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-right text-zinc-500">
                    Нийт {partners.length} харилцагч:
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-green-700">
                    {fmtMoney(totalIncome)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-red-700">
                    {fmtMoney(totalExpense)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
