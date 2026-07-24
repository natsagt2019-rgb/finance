import { createClient } from "@/lib/supabase/server";
import { loadRegistry } from "@/lib/bank-registry";
import { StatementsTable, type AccountOpt } from "./statements-table";

type SearchParams = {
  account?: string;
  year?: string;
  month?: string;
  dir?: string;
  coded?: string; // "" бүгд | "no" холболт хийгээгүй | "yes" хийсэн
};

// Холболт хийгээгүй (Дт эсвэл Кт код дутуу) гүйлгээний PostgREST нөхцөл.
const UNCODED_OR = "debit_code.is.null,debit_code.eq.,credit_code.is.null,credit_code.eq.";

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
  exchange_rate: number | null;
  income_code: string | null;
  expense_code: string | null;
  debit_code: string | null;
  credit_code: string | null;
  journal_id: number | null;
  contra?: string[]; // журналдсан гүйлгээний харьцсан данс(ууд) — журналын банк бус мөр
  draft?: boolean; // түр холболт (ноорог журнал) — тайланд ороогүй
};

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

  // Бүртгэлтэй банкны дансууд (Тохиргоо → Банкны данс) — шүүлт ба үлдэгдэлд.
  const registry = await loadRegistry(supabase);
  const accountList = registry.map((a) => ({ id: a.accountNo, label: a.label }));
  const ACCOUNTS = registry.map((a) => a.accountNo);
  // Дансны дугаар → банкны GL код (split журналын банкны талд).
  const bankGlByAccount: Record<string, string | null> = Object.fromEntries(
    registry.map((a) => [a.accountNo, a.glCode]),
  );

  // Жагсаалтын query — шүүлтийг order/limit-аас өмнө тавина.
  let rowsQuery = supabase
    .from("transactions")
    .select(
      "id,account_id,company,bank,txn_date,description,counterparty,income,expense,exchange_rate,income_code,expense_code,debit_code,credit_code,journal_id",
    );
  if (sp.account) rowsQuery = rowsQuery.eq("account_id", sp.account);
  if (sp.year) rowsQuery = rowsQuery.eq("year", Number(sp.year));
  if (sp.month) rowsQuery = rowsQuery.eq("month", Number(sp.month));
  if (sp.dir === "income") rowsQuery = rowsQuery.not("income", "is", null);
  if (sp.dir === "expense") rowsQuery = rowsQuery.not("expense", "is", null);
  if (sp.coded === "no") {
    // Журналдсан (задалсан/и-баримт холбосон) гүйлгээг «дутуу»-д тооцохгүй.
    rowsQuery = rowsQuery.or(UNCODED_OR).is("journal_id", null);
  } else if (sp.coded === "yes") {
    rowsQuery = rowsQuery
      .not("debit_code", "is", null)
      .neq("debit_code", "")
      .not("credit_code", "is", null)
      .neq("credit_code", "");
  }

  const { data: rows, error } = await rowsQuery
    .order("txn_date", { ascending: false })
    .limit(ROW_LIMIT);

  // Холболт хийгээгүй гүйлгээний нийт тоо (одоогийн данс/он/сар шүүлтэд).
  let cntQuery = supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .or(UNCODED_OR)
    .is("journal_id", null);
  if (sp.account) cntQuery = cntQuery.eq("account_id", sp.account);
  if (sp.year) cntQuery = cntQuery.eq("year", Number(sp.year));
  if (sp.month) cntQuery = cntQuery.eq("month", Number(sp.month));
  const { count: uncodedCount } = await cntQuery;

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

  const txns = (rows as Txn[] | null) ?? [];

  // Журналдсан гүйлгээний харьцсан данс — журналын банк бус мөрийн код(ууд).
  const bankGlSet = new Set(
    Object.values(bankGlByAccount).filter((c): c is string => !!c),
  );
  const jIds = [
    ...new Set(txns.map((t) => t.journal_id).filter((x): x is number => x != null)),
  ];
  if (jIds.length) {
    const { data: jlRows } = await supabase
      .from("journal_lines")
      .select("journal_id, account_id")
      .in("journal_id", jIds)
      .limit(10000);
    const jl =
      (jlRows as { journal_id: number; account_id: number | null }[] | null) ?? [];
    const accIds2 = [
      ...new Set(jl.map((l) => l.account_id).filter((x): x is number => x != null)),
    ];
    const codeById = new Map<number, string>();
    if (accIds2.length) {
      const { data: ac } = await supabase
        .from("accounts")
        .select("id, code")
        .in("id", accIds2);
      for (const a of (ac as { id: number; code: string }[] | null) ?? [])
        codeById.set(a.id, a.code);
    }
    const contraByJournal = new Map<number, string[]>();
    for (const l of jl) {
      const code = l.account_id != null ? codeById.get(l.account_id) : undefined;
      if (!code || bankGlSet.has(code)) continue; // банкны тал биш = харьцсан данс
      const arr = contraByJournal.get(l.journal_id) ?? [];
      if (!arr.includes(code)) arr.push(code);
      contraByJournal.set(l.journal_id, arr);
    }
    // Ноорог журнал = «түр холболт» (тайланд ороогүй, дараа батлагдана).
    const { data: jStat } = await supabase
      .from("journals")
      .select("id, status")
      .in("id", jIds);
    const draftSet = new Set(
      ((jStat as { id: number; status: string }[] | null) ?? [])
        .filter((j) => j.status === "draft")
        .map((j) => j.id),
    );
    for (const t of txns)
      if (t.journal_id != null) {
        t.contra = contraByJournal.get(t.journal_id) ?? [];
        t.draft = draftSet.has(t.journal_id);
      }
  }

  // dir шүүлт: зөвхөн орлого/зарлага харуулах горим (жагсаалттай нийцүүлэв).
  // Холболтын шүүлт идэвхтэй үед monthly_cashflow тооцох боломжгүй тул
  // нэгтгэлийг шүүсэн мөрүүдээс гаргана.
  let totalIncome: number;
  let totalExpense: number;
  if (sp.coded === "no" || sp.coded === "yes") {
    // Валютын гүйлгээг ханшаар MNT болгож нэгтгэнэ (rate=1 бол төгрөг хэвээр).
    const mnt = (v: number | null, rate: number | null) =>
      (Number(v) || 0) * (Number(rate) || 1);
    totalIncome =
      sp.dir === "expense" ? 0 : txns.reduce((s, r) => s + mnt(r.income, r.exchange_rate), 0);
    totalExpense =
      sp.dir === "income" ? 0 : txns.reduce((s, r) => s + mnt(r.expense, r.exchange_rate), 0);
  } else {
    totalIncome = sp.dir === "expense" ? 0 : sumIncome;
    totalExpense = sp.dir === "income" ? 0 : sumExpense;
  }
  const net = totalIncome - totalExpense;

  // Дансны сонголтын жагсаалт (Дт/Кт засахад).
  const { data: accRows } = await supabase
    .from("accounts")
    .select("code,name")
    .eq("is_active", true)
    .order("code")
    .limit(5000);
  const accounts = (accRows as AccountOpt[] | null) ?? [];

  // Харилцагчийн нэрийн санал (мөр дээр засахад) — лавлах (данс→нэр) +
  // бүртгэлтэй харилцагчид. Том/жижиг үсгийн зөрүүг нэгтгэж лавлахын
  // каноник нэрийг түрүүлж авна.
  const [{ data: cpRefRows }, { data: partnerRows }] = await Promise.all([
    supabase.from("bank_counterparties").select("name").limit(20000),
    supabase.from("partners").select("name").limit(20000),
  ]);
  const cpByKey = new Map<string, string>();
  for (const r of [
    ...((cpRefRows as { name: string | null }[] | null) ?? []),
    ...((partnerRows as { name: string | null }[] | null) ?? []),
  ]) {
    const n = (r.name ?? "").trim().replace(/\s+/g, " ");
    if (!n) continue;
    const k = n.toUpperCase();
    if (!cpByKey.has(k)) cpByKey.set(k, n);
  }
  const partnerNames = [...cpByKey.values()].sort((a, b) => a.localeCompare(b));

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
            {accountList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
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

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Холболт
          <select
            name="coded"
            defaultValue={sel("coded")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
          >
            <option value="">Бүгд</option>
            <option value="no">Хийгээгүй (дутуу)</option>
            <option value="yes">Хийсэн</option>
          </select>
        </label>

        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Шүүх
        </button>

        {(uncodedCount ?? 0) > 0 && sp.coded !== "no" && (
          <a
            href={`/statements?${new URLSearchParams({
              ...(sp.account ? { account: sp.account } : {}),
              ...(sp.year ? { year: sp.year } : {}),
              ...(sp.month ? { month: sp.month } : {}),
              coded: "no",
            }).toString()}`}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
          >
            ⚠ {uncodedCount} холболт хийгээгүй →
          </a>
        )}
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
            <StatementsTable
              rows={txns}
              accounts={accounts}
              partnerNames={partnerNames}
              bankGlByAccount={bankGlByAccount}
            />
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
