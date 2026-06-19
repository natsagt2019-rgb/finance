import { createClient } from "@/lib/supabase/server";
import { FxRevaluationView } from "./fx-revaluation-view";
import type { FxAccount, FxRevaluationRow } from "./types";

type AccRow = {
  id: number;
  code: string;
  name: string;
  currency: string | null;
  nature: string | null;
  type: string | null;
};

export default async function FxRevaluationPage() {
  const supabase = await createClient();

  // Бүх идэвхтэй данс (нэмэх dropdown + олз/гарз шалгалт).
  const { data: accData } = await supabase
    .from("accounts")
    .select("id, code, name, currency, nature, type")
    .eq("is_active", true)
    .order("code", { ascending: true })
    .limit(5000);
  const allAcc = (accData as AccRow[] | null) ?? [];

  // Валютын данс — currency нь MNT биш (тохируулсан бол).
  const foreign = allAcc.filter(
    (a) => a.currency && a.currency.toUpperCase() !== "MNT",
  );

  // Олз (income, нэр "ханш"+"олз/ашиг") ба гарз (expense, "ханш"+"гарз/алдагдал").
  const norm = (s: string) => s.toLowerCase();
  const hasGain = allAcc.some(
    (a) =>
      a.type === "income" &&
      norm(a.name).includes("ханш") &&
      (norm(a.name).includes("олз") || norm(a.name).includes("ашиг")),
  );
  const hasLoss = allAcc.some(
    (a) =>
      a.type === "expense" &&
      norm(a.name).includes("ханш") &&
      (norm(a.name).includes("гарз") || norm(a.name).includes("алдагдал")),
  );
  const fxAccountsReady = hasGain && hasLoss;

  // Валютын дансны одоогийн дэвтрийн үлдэгдэл (дебет-эерэг) — нэгдсэн дэвтэр
  // journal_entries-ээс (банкны постинг + албан журналын тусгал). Тайлантай
  // ижил эх сурвалж: debit_code/credit_code/amount, данс КОДоор.
  const bookByCode = new Map<string, number>();
  if (foreign.length > 0) {
    const codes = foreign.map((a) => a.code);
    const codeSet = new Set(codes);
    const { data: jeData } = await supabase
      .from("journal_entries")
      .select("debit_code, credit_code, amount")
      .or(`debit_code.in.(${codes.join(",")}),credit_code.in.(${codes.join(",")})`)
      .limit(100000);
    for (const e of (jeData as
      | { debit_code: string | null; credit_code: string | null; amount: number }[]
      | null) ?? []) {
      const amt = Number(e.amount) || 0;
      if (e.debit_code && codeSet.has(e.debit_code))
        bookByCode.set(e.debit_code, (bookByCode.get(e.debit_code) ?? 0) + amt);
      if (e.credit_code && codeSet.has(e.credit_code))
        bookByCode.set(e.credit_code, (bookByCode.get(e.credit_code) ?? 0) - amt);
    }
  }

  const accounts: FxAccount[] = foreign.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    currency: (a.currency ?? "").toUpperCase(),
    nature: a.nature,
    type: a.type,
    bookBalance: Math.round((bookByCode.get(a.code) ?? 0) * 100) / 100,
  }));

  // Тэгшитгэлийн түүх.
  const { data: histData } = await supabase
    .from("fx_revaluations")
    .select(
      "id, reval_date, description, journal_id, total_gain, total_loss, created_at",
    )
    .order("reval_date", { ascending: false })
    .limit(50);
  const history = (histData as FxRevaluationRow[] | null) ?? [];

  const fmt = (n: number) =>
    !n ? "—" : Math.round(n).toLocaleString("en-US");

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">
        💱 Ханшийн тэгшитгэл
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Тайлант үеийн эцэст валютын дансны үлдэгдлийг тухайн үеийн ханшаар дахин
        үнэлж, олз/гарзыг ерөнхий журналд автоматаар бичнэ.
      </p>

      <div className="mt-6">
        <FxRevaluationView accounts={accounts} fxAccountsReady={fxAccountsReady} />
      </div>

      {/* Түүх */}
      {history.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">
            Өмнөх тэгшитгэлүүд
          </h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Огноо</th>
                  <th className="px-3 py-2">Тайлбар</th>
                  <th className="px-3 py-2 text-right">Олз (₮)</th>
                  <th className="px-3 py-2 text-right">Гарз (₮)</th>
                  <th className="px-3 py-2 text-right">Журнал</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-zinc-50">
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-700">
                      {h.reval_date}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {h.description || "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-green-700">
                      {fmt(h.total_gain)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                      {fmt(h.total_loss)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {h.journal_id ? (
                        <a
                          href="/journals"
                          className="text-zinc-500 underline hover:text-zinc-900"
                        >
                          #{h.journal_id}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
