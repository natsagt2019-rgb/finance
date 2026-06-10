import { createClient } from "@/lib/supabase/server";
import { TrialBalanceImportClient } from "./import-client";
import { TrialBalanceView } from "./trial-balance-view";
import type { TbAccount } from "@/lib/trial-balance-view";

type SearchParams = { year?: string };

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  // Аль хэдийн орсон онуудыг харуулна.
  const { data: yearRows } = await supabase.from("trial_balances").select("year");
  const years = [
    ...new Set(
      ((yearRows as { year: number }[] | null) ?? [])
        .map((r) => r.year)
        .filter(Boolean),
    ),
  ].sort((a, b) => b - a);

  const defaultYear = years[0] ?? new Date().getFullYear();
  const viewYear =
    sp.year && years.includes(Number(sp.year)) ? Number(sp.year) : defaultYear;

  // Сонгосон оны гүйлгээ балансыг харуулахаар татна.
  let accounts: TbAccount[] = [];
  if (years.length > 0) {
    const { data: tb } = await supabase
      .from("trial_balances")
      .select("account_code, account_name, opening_balance, closing_balance")
      .eq("year", viewYear)
      .eq("period", "annual")
      .limit(5000);
    accounts = (
      (tb as
        | {
            account_code: string;
            account_name: string | null;
            opening_balance: number | null;
            closing_balance: number | null;
          }[]
        | null) ?? []
    ).map((r) => ({
      code: r.account_code,
      name: r.account_name ?? "",
      opening: Number(r.opening_balance) || 0,
      closing: Number(r.closing_balance) || 0,
    }));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 print:hidden">
        Гүйлгээ баланс
      </h1>
      <p className="mt-1 text-sm text-zinc-500 print:hidden">
        Жилийн гүйлгээ балансыг Excel-ээс оруулна. Эндээс санхүүгийн 4 тайлан
        бодит тоогоор гарна — баланс ↔ орлого ↔ гүйлгээ баланс хоорондоо тулна.
        {years.length > 0 ? ` Орсон он: ${years.join(", ")}.` : ""}
      </p>

      <div className="mt-6 print:hidden">
        <TrialBalanceImportClient defaultYear={defaultYear} />
      </div>

      {/* Гүйлгээ балансын харагдац */}
      {accounts.length > 0 && (
        <div className="mt-10">
          {years.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-2 print:hidden">
              {years.map((y) => (
                <a
                  key={y}
                  href={`/reports/trial-balance?year=${y}`}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    y === viewYear
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {y} он
                </a>
              ))}
            </div>
          )}
          <TrialBalanceView year={viewYear} accounts={accounts} />
        </div>
      )}
    </div>
  );
}
