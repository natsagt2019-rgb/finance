import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";

type SearchParams = { year?: string };

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// P&L дансыг удирдлагын тайлангийн хэсэгт хуваарилна.
function sectionOf(code: string, type: string): string {
  if (type === "income") {
    if (code.startsWith("84") || code.startsWith("85")) return "fin_income";
    return "sales";
  }
  if (code[0] === "6" || code.startsWith("71")) return "cogs";
  if (code.startsWith("70")) return "opex";
  if (code.startsWith("91")) return "tax";
  return "other_exp"; // 87, 88 — ханшийн гарз, бусад
}

function fmt(n: number): string {
  if (!n) return "—";
  return Math.round(n).toLocaleString("en-US");
}

type Acc = { code: string; name: string; type: string; vals: number[] }; // vals[0..11]
type DRow =
  | { kind: "section"; label: string }
  | { kind: "account"; code: string; name: string; vals: number[] }
  | { kind: "subtotal"; label: string; vals: number[] }
  | { kind: "computed"; label: string; vals: number[] };

const zero = () => Array(12).fill(0) as number[];
const addInto = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);
const subOf = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

export default async function IncomeMonthlyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const years = [2026, 2025];
  const year =
    sp.year && years.includes(Number(sp.year)) ? Number(sp.year) : 2026;

  const { data: pnl } = await supabase.rpc("pnl_monthly", { y: year });
  const { data: accRows } = await supabase
    .from("accounts")
    .select("code, name, type")
    .eq("is_active", true)
    .limit(5000);
  const meta = new Map<string, { name: string; type: string }>();
  for (const a of (accRows as { code: string; name: string; type: string }[] | null) ?? [])
    meta.set(a.code, { name: a.name, type: a.type });

  // Данс бүрийн сарын дүн (харагдах тэмдэг: орлого +, зардал +).
  const accs = new Map<string, Acc>();
  for (const r of (pnl as { code: string; mon: number; turnover: number }[] | null) ?? []) {
    const m = meta.get(r.code);
    if (!m) continue;
    let a = accs.get(r.code);
    if (!a) {
      a = { code: r.code, name: m.name, type: m.type, vals: zero() };
      accs.set(r.code, a);
    }
    const disp = m.type === "income" ? -Number(r.turnover) : Number(r.turnover);
    a.vals[r.mon - 1] += disp;
  }

  // Хэсгээр бүлэглэх.
  const sections: Record<string, Acc[]> = {
    sales: [], cogs: [], opex: [], other_exp: [], fin_income: [], tax: [],
  };
  for (const a of accs.values()) {
    const s = sectionOf(a.code, a.type);
    sections[s].push(a);
  }
  for (const k of Object.keys(sections))
    sections[k].sort((a, b) => a.code.localeCompare(b.code));

  const secTotal = (k: string) =>
    sections[k].reduce((acc, a) => addInto(acc, a.vals), zero());

  const tSales = secTotal("sales");
  const tCogs = secTotal("cogs");
  const tOpex = secTotal("opex");
  const tOther = secTotal("other_exp");
  const tFin = secTotal("fin_income");
  const tTax = secTotal("tax");
  const gross = subOf(tSales, tCogs);
  const ebit = addInto(subOf(subOf(gross, tOpex), tOther), tFin);
  const net = subOf(ebit, tTax);

  // Харагдах мөрүүд.
  const rows: DRow[] = [];
  const pushSection = (label: string, key: string, subLabel: string) => {
    if (sections[key].length === 0) return;
    rows.push({ kind: "section", label });
    for (const a of sections[key])
      rows.push({ kind: "account", code: a.code, name: a.name, vals: a.vals });
    rows.push({ kind: "subtotal", label: subLabel, vals: secTotal(key) });
  };

  pushSection("БОРЛУУЛАЛТЫН ОРЛОГО", "sales", "Нийт борлуулалтын орлого");
  pushSection("БОРЛУУЛАЛТЫН ӨРТӨГ", "cogs", "Нийт борлуулалтын өртөг");
  rows.push({ kind: "computed", label: "НИЙТ АШИГ", vals: gross });
  pushSection("ҮЙЛ АЖИЛЛАГААНЫ ЗАРДАЛ", "opex", "Нийт үйл ажиллагааны зардал");
  pushSection("БУСАД ЗАРДАЛ (ханшийн гарз г.м.)", "other_exp", "Нийт бусад зардал");
  pushSection("САНХҮҮГИЙН БА БУСАД ОРЛОГО", "fin_income", "Нийт санхүүгийн орлого");
  rows.push({ kind: "computed", label: "ТАТВАРЫН ӨМНӨХ АШИГ (EBIT)", vals: ebit });
  pushSection("ТАТВАРЫН ЗАРДАЛ", "tax", "Нийт татварын зардал");
  rows.push({ kind: "computed", label: "ЦЭВЭР АШИГ", vals: net });

  const hasData = accs.size > 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Орлогын дэлгэрэнгүй тайлан — сараар
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {year} оны удирдлагын дотоод тайлан. Журналаас сар бүрээр (шуурхай арга).
          </p>
        </div>
        <div className="flex items-end gap-2">
          <form method="get" className="flex items-center gap-2">
            <select
              name="year"
              defaultValue={String(year)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y} он</option>
              ))}
            </select>
            <button type="submit" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              Харах
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      {!hasData ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          {year} онд журналд орлого/зардлын гүйлгээ алга.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
          <table className="w-full text-xs">
            <thead className="bg-zinc-800 text-left font-medium text-white">
              <tr>
                <th className="sticky left-0 bg-zinc-800 px-2 py-2">Код</th>
                <th className="px-2 py-2">Үзүүлэлт</th>
                {MONTHS.map((m) => (
                  <th key={m} className="px-2 py-2 text-right">{m}-р сар</th>
                ))}
                <th className="px-2 py-2 text-right">Бүгд</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                if (r.kind === "section") {
                  return (
                    <tr key={i} className="bg-zinc-100">
                      <td colSpan={15} className="px-2 py-1.5 font-bold text-zinc-800">
                        {r.label}
                      </td>
                    </tr>
                  );
                }
                const isComputed = r.kind === "computed";
                const isSub = r.kind === "subtotal";
                const strong = isComputed || isSub;
                const label = r.kind === "account" ? r.name : r.label;
                const code = r.kind === "account" ? r.code : "";
                const total = sum(r.vals);
                return (
                  <tr
                    key={i}
                    className={
                      isComputed
                        ? "border-y border-amber-200 bg-amber-50 font-semibold text-zinc-900"
                        : isSub
                          ? "bg-zinc-50 font-semibold"
                          : "hover:bg-zinc-50"
                    }
                  >
                    <td className={`sticky left-0 px-2 py-1 font-mono text-[10px] text-zinc-400 ${isComputed ? "bg-amber-50" : isSub ? "bg-zinc-50" : "bg-white"}`}>
                      {code}
                    </td>
                    <td className={`px-2 py-1 ${strong ? "" : "pl-4 text-zinc-600"}`}>
                      {label}
                    </td>
                    {r.vals.map((v, j) => (
                      <td
                        key={j}
                        className={`px-2 py-1 text-right tabular-nums ${
                          v < 0 ? "text-red-600" : strong ? "text-zinc-900" : "text-zinc-500"
                        }`}
                      >
                        {fmt(v)}
                      </td>
                    ))}
                    <td className={`px-2 py-1 text-right tabular-nums font-semibold ${total < 0 ? "text-red-600" : "text-zinc-900"}`}>
                      {fmt(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
