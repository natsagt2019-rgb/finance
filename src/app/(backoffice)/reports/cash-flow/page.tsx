import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { RebuildCashFlowButton } from "./rebuild-button";
import {
  CASH_FLOW,
  computeStatement,
  type FsBalanceMap,
} from "@/lib/fs-report";

type SearchParams = { year?: string; period?: string };

function fmt(n: number): string {
  if (!n) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: yearRows } = await supabase
    .from("cash_flow_lines")
    .select("year");
  const years = [
    ...new Set(
      ((yearRows as { year: number }[] | null) ?? [])
        .map((r) => r.year)
        .filter(Boolean),
    ),
  ].sort((a, b) => b - a);
  if (years.length === 0) years.push(new Date().getFullYear());
  const selYear =
    sp.year && years.includes(Number(sp.year)) ? Number(sp.year) : years[0];
  const period = sp.period || "annual";

  // Мөнгөн гүйлгээний мөрүүд.
  const { data: cfRows, error } = await supabase
    .from("cash_flow_lines")
    .select("cf_code, amount")
    .eq("year", selYear)
    .eq("period", period);

  // Зарлагыг (".2.") сөрөг болгож оруулна — нэгтгэлд зөв хасагдана.
  const balances: FsBalanceMap = new Map();
  for (const r of (cfRows as { cf_code: string; amount: number | null }[] | null) ?? []) {
    const raw = Number(r.amount) || 0;
    const signed = r.cf_code.includes(".2.") ? -raw : raw;
    balances.set(r.cf_code, { opening: 0, closing: signed });
  }

  const rows = computeStatement(CASH_FLOW, balances);
  const netFlow = rows.find((r) => "code" in r && r.code === "4.1")?.closing ?? 0;
  const hasData = balances.size > 0;

  // Мөнгөний эхний/эцсийн үлдэгдэл — баланс 1.1.1-ээс.
  const { data: cashRow } = await supabase
    .from("fs_line_balances")
    .select("opening_total, closing_total")
    .eq("year", selYear)
    .eq("period", period)
    .eq("fs_line", "СБТ 1.1.1 Мөнгө, түүнтэй адилтгах хөрөнгө")
    .maybeSingle();

  const openingCash = Number(
    (cashRow as { opening_total: number | null } | null)?.opening_total ?? 0,
  );
  const closingCashBs = Number(
    (cashRow as { closing_total: number | null } | null)?.closing_total ?? 0,
  );
  const closingCashCalc = openingCash + netFlow;
  // Албан маягт (СС №361): эхний үлдэгдэл + цэвэр гүйлгээ + ханшийн өөрчлөлтийн
  // нөлөө = эцсийн үлдэгдэл. Шууд аргын гүйлгээ нь хийгдсэн өдрийн ханшаар, баланс
  // нь тайлант үеийн эцсийн ханшаар бичигддэг тул зөрүү нь голчлон валютын мөнгөн
  // хөрөнгийн ханшийн өөрчлөлт болно — албан маягтын тусдаа мөрөөр харуулна.
  const hasCashBs = cashRow != null;
  const fxEffect = hasCashBs ? closingCashBs - openingCash - netFlow : 0;
  const closingCash = hasCashBs ? closingCashBs : closingCashCalc;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Мөнгөн гүйлгээний тайлан
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            E-balance (СС №361), шууд арга. Гүйлгээний ангиллын кодоос дүгнэнэ
            (валютыг ханшаар MNT болгоно). Шинэ гүйлгээ кодлосны дараа «Дахин
            дүгнэх» дарж шинэчилнэ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form method="get" className="flex items-center gap-2">
            <select
              name="year"
              defaultValue={String(selYear)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y} он
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Шинэчлэх
            </button>
          </form>
          <RebuildCashFlowButton year={selYear} />
          <PrintButton />
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Алдаа: {error.message}
          <p className="mt-1 text-red-500">
            cash_flow_lines үүссэн эсэхийг шалгана уу (schema.sql §15).
          </p>
        </div>
      ) : null}

      {!hasData && !error ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          {selYear} оны мөнгөн гүйлгээ ороогүй байна.
        </div>
      ) : null}

      {hasData ? (
        <div className="mt-4 flex flex-wrap gap-3 print:hidden">
          <span
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              hasCashBs
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {hasCashBs
              ? `✓ Балансын мөнгөтэй тулсан (ханшийн нөлөө: ${fmt(fxEffect)})`
              : "⚠ Балансын мөнгөний үлдэгдэл алга — тулгалт хийгдсэнгүй (баланс дахин дүгнэнэ үү)"}
          </span>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left">Үзүүлэлт</th>
              <th className="px-4 py-2 text-right">Тайлант үе</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((r, i) => {
              if (r.kind === "section") {
                return (
                  <tr key={i} className="bg-zinc-100">
                    <td colSpan={2} className="px-4 py-2 font-bold text-zinc-900">
                      {r.label}
                    </td>
                  </tr>
                );
              }
              const isTotal = r.kind === "total";
              const isSub = r.kind === "subtotal";
              const strong = isTotal || isSub;
              return (
                <tr key={i} className={isTotal ? "bg-zinc-50 font-semibold" : ""}>
                  <td
                    className={`px-4 py-1.5 ${strong ? "font-semibold text-zinc-900" : "pl-8 text-zinc-700"}`}
                  >
                    {"label" in r ? r.label : ""}
                  </td>
                  <td
                    className={`px-4 py-1.5 text-right tabular-nums ${strong ? "font-semibold" : "text-zinc-600"}`}
                  >
                    {fmt(r.closing)}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-zinc-300">
              <td className="px-4 py-1.5 font-semibold text-zinc-900">
                5. Мөнгө, түүнтэй адилтгах хөрөнгийн эхний үлдэгдэл
              </td>
              <td className="px-4 py-1.5 text-right font-semibold tabular-nums">
                {fmt(openingCash)}
              </td>
            </tr>
            {hasCashBs ? (
              <tr>
                <td className="px-4 py-1.5 font-semibold text-zinc-900">
                  6. Гадаад валютын ханшийн өөрчлөлтийн нөлөө
                </td>
                <td className="px-4 py-1.5 text-right font-semibold tabular-nums">
                  {fmt(fxEffect)}
                </td>
              </tr>
            ) : null}
            <tr className="bg-zinc-50 font-semibold">
              <td className="px-4 py-1.5 text-zinc-900">
                {hasCashBs ? "7" : "6"}. Мөнгө, түүнтэй адилтгах хөрөнгийн эцсийн
                үлдэгдэл
              </td>
              <td className="px-4 py-1.5 text-right tabular-nums">
                {fmt(closingCash)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
