import { createClient } from "@/lib/supabase/server";
import { TrialBalanceImportClient } from "./import-client";

export default async function TrialBalancePage() {
  const supabase = await createClient();

  // Аль хэдийн орсон онуудыг харуулна.
  const { data } = await supabase.from("trial_balances").select("year");
  const years = [
    ...new Set(
      ((data as { year: number }[] | null) ?? []).map((r) => r.year).filter(Boolean),
    ),
  ].sort((a, b) => b - a);

  const defaultYear = years[0] ?? new Date().getFullYear();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Гүйлгээ баланс</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Жилийн гүйлгээ балансыг Excel-ээс оруулж, санхүүгийн тайланг бодит тоогоор
        гаргана.
        {years.length > 0 ? ` Орсон он: ${years.join(", ")}.` : ""}
      </p>

      <div className="mt-6">
        <TrialBalanceImportClient defaultYear={defaultYear} />
      </div>
    </div>
  );
}
