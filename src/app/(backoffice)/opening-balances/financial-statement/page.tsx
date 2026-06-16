import { createClient } from "@/lib/supabase/server";
import { OpeningTabs } from "../opening-tabs";
import {
  OPENING_YEARS,
  fmtMoney,
  grandOpeningBalance,
  openDateFor,
  resolveYear,
} from "../shared";

type SearchParams = { year?: string };

const DEBIT_TYPES = new Set(["asset", "expense"]);

// Дансны төрлийг тайлангийн бүлэг болгон эрэмбэлнэ.
const TYPE_ORDER = ["asset", "liability", "equity", "income", "expense"] as const;
const TYPE_LABEL: Record<string, string> = {
  asset: "ХӨРӨНГӨ",
  liability: "ӨР ТӨЛБӨР",
  equity: "ӨМЧ",
  income: "ОРЛОГО",
  expense: "ЗАРДАЛ",
};

export default async function OpeningFsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const year = resolveYear(sp.year);
  const openDate = openDateFor(year);

  const [{ data: accRows }, { data: opRows }, balance] = await Promise.all([
    supabase
      .from("accounts")
      .select("code, name, type, fs_line")
      .eq("is_active", true)
      .limit(5000),
    supabase
      .from("journal_entries")
      .select("debit_code, credit_code, amount, source")
      .eq("is_opening", true)
      .eq("txn_date", openDate)
      .limit(50000),
    grandOpeningBalance(openDate),
  ]);

  const accounts =
    (accRows as
      | { code: string; name: string; type: string; fs_line: string | null }[]
      | null) ?? [];
  const meta = new Map(accounts.map((a) => [a.code, a]));

  // Данс бүрийн цэвэр эхний үлдэгдэл (debit-positive нэгтгэл).
  const netByCode = new Map<string, number>();
  for (const r of (opRows as
    | { debit_code: string | null; credit_code: string | null; amount: number }[]
    | null) ?? []) {
    const code = r.debit_code ?? r.credit_code;
    if (!code) continue;
    const dp = r.debit_code ? Number(r.amount) : -Number(r.amount);
    netByCode.set(code, (netByCode.get(code) ?? 0) + dp);
  }

  // Төрлөөр бүлэглэнэ. Харуулах дүн = байгалийн тэмдэг (хөрөнгө/зардал +,
  // өр/өмч/орлого − -ийг эргүүлж эерэг харуулна).
  type Line = { code: string; name: string; natural: number };
  const groups = new Map<string, { lines: Line[]; total: number }>();
  for (const [code, dp] of netByCode) {
    if (Math.abs(dp) < 0.005) continue;
    const m = meta.get(code);
    const type = m?.type ?? "asset";
    const natural = DEBIT_TYPES.has(type) ? dp : -dp; // байгалийн эерэг
    const g = groups.get(type) ?? { lines: [], total: 0 };
    g.lines.push({ code, name: m?.name ?? code, natural });
    g.total += natural;
    groups.set(type, g);
  }
  for (const g of groups.values())
    g.lines.sort((a, b) => a.code.localeCompare(b.code));

  const assetTotal = groups.get("asset")?.total ?? 0;
  const liabEquityTotal =
    (groups.get("liability")?.total ?? 0) + (groups.get("equity")?.total ?? 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">
        Санхүүгийн тайлангийн эхний үлдэгдэл
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Бүх дэд дэвтрийн (данс, харилцагч, хөрөнгө, бараа) эхний үлдэгдлийг
        нэгтгэсэн тайлант оны нээлтийн баланс. Зөвхөн харах — оруулга нь тус
        тусын таб дээр.
      </p>

      <div className="mt-5">
        <OpeningTabs year={year} years={OPENING_YEARS} balance={balance} />
      </div>

      {netByCode.size === 0 ? (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          {openDate} огноогоор эхний үлдэгдэл оруулаагүй байна. «Дансны» болон бусад
          таб дээр дүн оруулна уу.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-3 py-2">Код</th>
                <th className="px-3 py-2">Дансны нэр</th>
                <th className="px-3 py-2 text-right">Эхний үлдэгдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {TYPE_ORDER.filter((t) => groups.has(t)).map((type) => {
                const g = groups.get(type)!;
                return (
                  <FsGroup key={type} type={type} lines={g.lines} total={g.total} />
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold text-zinc-800">
                <td className="px-3 py-2" colSpan={2}>
                  НИЙТ ХӨРӨНГӨ
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtMoney(assetTotal)}
                </td>
              </tr>
              <tr className="bg-zinc-50 font-semibold text-zinc-800">
                <td className="px-3 py-2" colSpan={2}>
                  НИЙТ ӨР ТӨЛБӨР + ӨМЧ
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtMoney(liabEquityTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function FsGroup({
  type,
  lines,
  total,
}: {
  type: string;
  lines: { code: string; name: string; natural: number }[];
  total: number;
}) {
  return (
    <>
      <tr className="bg-zinc-100/70 text-xs font-semibold text-zinc-600">
        <td className="px-3 py-1.5" colSpan={2}>
          {TYPE_LABEL[type] ?? type}
        </td>
        <td className="px-3 py-1.5 text-right tabular-nums">{fmtMoney(total)}</td>
      </tr>
      {lines.map((l) => (
        <tr key={l.code}>
          <td className="px-3 py-1.5 font-mono text-xs text-zinc-500">{l.code}</td>
          <td className="px-3 py-1.5 text-zinc-700">{l.name}</td>
          <td className="px-3 py-1.5 text-right tabular-nums text-zinc-700">
            {fmtMoney(l.natural)}
          </td>
        </tr>
      ))}
    </>
  );
}
