import { createClient } from "@/lib/supabase/server";
import { StatementsTable, type AccountOpt } from "./statements-table";

type SearchParams = {
  account?: string;
  year?: string;
  month?: string;
  dir?: string;
};

type Txn = {
  id: number;
  account_id: string;
  company: string | null;
  bank: string | null;
  txn_date: string;
  description: string | null;
  counterparty: string | null;
  income: number | null;
  expense: number | null;
  income_code: string | null;
  expense_code: string | null;
  debit_code: string | null;
  credit_code: string | null;
};

const ACCOUNTS = ["TT", "TR", "GM", "MB"];
const YEARS = ["2026", "2025"];
const ROW_LIMIT = 500;

function fmtMoney(n: number | null): string {
  if (n == null) return "";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  // Жагсаалтын query — шүүлтийг order/limit-аас өмнө тавина.
  let rowsQuery = supabase
    .from("transactions")
    .select(
      "id,account_id,company,bank,txn_date,description,counterparty,income,expense,income_code,expense_code,debit_code,credit_code",
    );
  if (sp.account) rowsQuery = rowsQuery.eq("account_id", sp.account);
  if (sp.year) rowsQuery = rowsQuery.eq("year", Number(sp.year));
  if (sp.month) rowsQuery = rowsQuery.eq("month", Number(sp.month));
  if (sp.dir === "income") rowsQuery = rowsQuery.not("income", "is", null);
  if (sp.dir === "expense") rowsQuery = rowsQuery.not("expense", "is", null);

  const { data: rows, error } = await rowsQuery
    .order("txn_date", { ascending: false })
    .limit(ROW_LIMIT);

  // Нэгтгэл — monthly_cashflow view ашиглана (DB дотор GROUP BY хийдэг тул
  // 1000 мөрийн хязгаарт өртөхгүй, бүх гүйлгээг бүрэн хамруулна).
  let mcQuery = supabase
    .from("monthly_cashflow")
    .select("total_income,total_expense");
  if (sp.account) mcQuery = mcQuery.eq("account_id", sp.account);
  if (sp.year) mcQuery = mcQuery.eq("year", Number(sp.year));
  if (sp.month) mcQuery = mcQuery.eq("month", Number(sp.month));

  const { data: mcData } = await mcQuery;
  const mcRows =
    (mcData as { total_income: number | null; total_expense: number | null }[] | null) ?? [];
  const sumIncome = mcRows.reduce((s, r) => s + (Number(r.total_income) || 0), 0);
  const sumExpense = mcRows.reduce((s, r) => s + (Number(r.total_expense) || 0), 0);

  // dir шүүлт: зөвхөн орлого/зарлага харуулах горим (жагсаалттай нийцүүлэв).
  const totalIncome = sp.dir === "expense" ? 0 : sumIncome;
  const totalExpense = sp.dir === "income" ? 0 : sumExpense;
  const net = totalIncome - totalExpense;

  const txns = (rows as Txn[] | null) ?? [];

  // Дансны сонголтын жагсаалт (Дт/Кт засахад).
  const { data: accRows } = await supabase
    .from("accounts")
    .select("code,name")
    .eq("is_active", true)
    .order("code")
    .limit(5000);
  const accounts = (accRows as AccountOpt[] | null) ?? [];

  // ── Эхний / эцсийн үлдэгдэл ──────────────────────────────────────────
  // Он сонгосон үед account_balances-аас (данс шүүлтэд тохируулан) авна.
  // Гүйлгээт үлдэгдэл тул орлого/зарлага хоёуланг тооцно (dir шүүлтээс үл хамаарна).
  const selYear = sp.year ? Number(sp.year) : null;
  const selMonth = sp.month ? Number(sp.month) : null;
  const balanceAccounts = sp.account ? [sp.account] : ACCOUNTS;
  let openingCash = 0;
  let closingCash = 0;
  let hasBalance = false;

  if (selYear) {
    hasBalance = true;
    const { data: balRows } = await supabase
      .from("account_balances")
      .select("opening_balance")
      .eq("year", selYear)
      .in("account_id", balanceAccounts);
    const yearOpening = ((balRows as { opening_balance: number }[] | null) ?? []).reduce(
      (s, r) => s + Number(r.opening_balance),
      0,
    );

    const { data: netRows } = await supabase
      .from("monthly_cashflow")
      .select("month,total_income,total_expense")
      .eq("year", selYear)
      .in("account_id", balanceAccounts);

    let priorNet = 0;
    let periodNet = 0;
    for (const r of (netRows as { month: number; total_income: number | null; total_expense: number | null }[] | null) ?? []) {
      const n = (Number(r.total_income) || 0) - (Number(r.total_expense) || 0);
      if (selMonth) {
        if (r.month < selMonth) priorNet += n;
        else if (r.month === selMonth) periodNet += n;
      } else {
        periodNet += n;
      }
    }
    openingCash = yearOpening + priorNet;
    closingCash = openingCash + periodNet;
  }

  // Бүх шүүлт хадгалсан select-ийн утга
  const sel = (name: keyof SearchParams) => sp[name] ?? "";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Дансны хуулга</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Цэгцлэгчээс батлагдсан бүх гүйлгээний нэгдсэн жагсаалт.
      </p>

      {/* Шүүлт */}
      <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Данс
          <select
            name="account"
            defaultValue={sel("account")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
          >
            <option value="">Бүгд</option>
            {ACCOUNTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Он
          <select
            name="year"
            defaultValue={sel("year")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
          >
            <option value="">Бүгд</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Сар
          <select
            name="month"
            defaultValue={sel("month")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
          >
            <option value="">Бүгд</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Төрөл
          <select
            name="dir"
            defaultValue={sel("dir")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
          >
            <option value="">Бүгд</option>
            <option value="income">Орлого</option>
            <option value="expense">Зарлага</option>
          </select>
        </label>

        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Шүүх
        </button>
      </form>

      {/* Нэгтгэл */}
      <div
        className={`mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 ${
          hasBalance ? "lg:grid-cols-5" : ""
        }`}
      >
        {hasBalance && (
          <div className="rounded-2xl border border-zinc-300 bg-zinc-50 p-4">
            <div className="text-xs text-zinc-500">Эхний үлдэгдэл</div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-zinc-800">
              {fmtMoney(openingCash)}
            </div>
          </div>
        )}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="text-xs text-zinc-500">Нийт орлого</div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-green-700">
            {fmtMoney(totalIncome)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="text-xs text-zinc-500">Нийт зарлага</div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-red-700">
            {fmtMoney(totalExpense)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="text-xs text-zinc-500">Цэвэр</div>
          <div
            className={`mt-1 text-lg font-semibold tabular-nums ${
              net >= 0 ? "text-green-700" : "text-red-700"
            }`}
          >
            {fmtMoney(net)}
          </div>
        </div>
        {hasBalance && (
          <div className="rounded-2xl border border-zinc-300 bg-zinc-50 p-4">
            <div className="text-xs text-zinc-500">Эцсийн үлдэгдэл</div>
            <div
              className={`mt-1 text-lg font-semibold tabular-nums ${
                closingCash < 0 ? "text-red-700" : "text-zinc-800"
              }`}
            >
              {fmtMoney(closingCash)}
            </div>
          </div>
        )}
      </div>
      {!hasBalance && (
        <p className="mt-2 text-xs text-zinc-400">
          Эхний/эцсийн үлдэгдэл харахын тулд тодорхой он сонгоно уу.
        </p>
      )}

      {/* Хүснэгт */}
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white">
        {error ? (
          <div className="px-6 py-10 text-center text-sm text-red-600">
            Алдаа: {error.message}
            <p className="mt-2 text-zinc-500">
              transactions хүснэгт үүссэн эсэхийг шалгана уу (schema.sql).
            </p>
          </div>
        ) : txns.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-zinc-500">
            Гүйлгээ алга. Дансны хуулга цэгцлэгчээс хуулга оруулна уу.
          </div>
        ) : (
          <>
            <StatementsTable rows={txns} accounts={accounts} />
            {txns.length === ROW_LIMIT && (
              <div className="border-t border-zinc-100 px-6 py-3 text-xs text-zinc-400">
                Зөвхөн сүүлийн {ROW_LIMIT} мөр харагдаж байна. Нэгтгэл нь бүх
                шүүсэн мөрийг тооцсон.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
