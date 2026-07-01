import { createClient } from "@/lib/supabase/server";
import { CounterpartiesClient, type CpRow } from "./counterparties-client";

export const metadata = { title: "Харилцагчийн лавлах — Тохиргоо" };

export default async function CounterpartiesPage() {
  const supabase = await createClient();

  // Бүх бичлэгийг хуудаслаж ачаална (PostgREST 1000-cap).
  const all: CpRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from("bank_counterparties")
      .select("account_no, name")
      .order("account_no")
      .range(from, from + PAGE - 1);
    const page = (data as CpRow[] | null) ?? [];
    all.push(...page);
    if (page.length < PAGE) break;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Харилцагчийн лавлах (данс → нэр)
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Дансны хуулга импортлоход зарим банк (ж: ХААН) харилцагчийн нэр
          гаргадаггүй, зөвхөн харьцсан дансны дугаар өгдөг. Энэ лавлахаас
          харьцсан дансаар харилцагчийн нэрийг автоматаар нөхнө.
        </p>
      </div>

      <CounterpartiesClient rows={all} />
    </div>
  );
}
