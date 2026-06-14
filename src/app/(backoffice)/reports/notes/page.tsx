import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";

type SearchParams = { year?: string };

type Acc = { code: string; name: string; type: string; fs_line: string | null };
type TbRow = { code: string; opening: number; closing: number };

function fmt(n: number): string {
  if (!n) return "—";
  return Math.round(n).toLocaleString("en-US");
}

// type → тайлангийн хэсэг (дэс дараа + гарчиг).
const SECTIONS: { key: string; label: string; debit: boolean }[] = [
  { key: "asset", label: "1. ХӨРӨНГӨ", debit: true },
  { key: "liability", label: "2. ӨР ТӨЛБӨР", debit: false },
  { key: "equity", label: "3. ӨМЧ", debit: false },
  { key: "income", label: "4. ОРЛОГО", debit: false },
  { key: "expense", label: "5. ЗАРДАЛ", debit: true },
];

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const years = [2026, 2025];
  const year = sp.year && years.includes(Number(sp.year)) ? Number(sp.year) : 2026;

  const [{ data: tb }, { data: accData }] = await Promise.all([
    supabase.rpc("trial_balance_range", { d_from: `${year}-01-01`, d_to: `${year}-12-31` }),
    supabase.from("accounts").select("code, name, type, fs_line").eq("is_active", true).limit(5000),
  ]);

  const meta = new Map<string, Acc>();
  for (const a of (accData as Acc[] | null) ?? []) meta.set(a.code, a);

  // type → [{code,name,closing/turn}]
  const bySection = new Map<string, { code: string; name: string; val: number }[]>();
  for (const r of (tb as TbRow[] | null) ?? []) {
    const a = meta.get(r.code);
    if (!a || a.code.slice(0, 2) === "92") continue;
    const isPnl = a.type === "income" || a.type === "expense";
    const raw = isPnl ? r.closing - r.opening : r.closing; // P&L=эргэлт, баланс=эцсийн
    const debit = a.type === "asset" || a.type === "expense";
    const val = debit ? raw : -raw; // эерэг = хэвийн тал
    if (Math.abs(val) < 0.5) continue;
    const arr = bySection.get(a.type) ?? [];
    arr.push({ code: r.code, name: a.name, val });
    bySection.set(a.type, arr);
  }

  const orgName = "Түмэн Тээх ХХК";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Санхүүгийн тайлангийн тодруулга
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Тайлангийн мөр бүрийг дэмжих дансны дэлгэрэнгүй задаргаа — журналаас, {year} он.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <form method="get" className="flex items-center gap-2">
            <select name="year" defaultValue={String(year)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              {years.map((y) => <option key={y} value={y}>{y} он</option>)}
            </select>
            <button type="submit" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Харах</button>
          </form>
          <PrintButton />
        </div>
      </div>

      {/* Тайлангийн нүүр */}
      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-6 text-center">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Санхүүгийн тайлан</p>
        <h2 className="mt-1 text-xl font-bold text-zinc-900">{orgName}</h2>
        <p className="mt-1 text-sm text-zinc-500">Регистр: 6906192 · {year} оны жилийн эцсийн байдлаар</p>
        <p className="mt-1 text-xs text-zinc-400">
          МСС / СС №361 загвар · Журналын бичилтээс (шуурхай арга)
        </p>
      </div>

      {/* Тодруулга — хэсэг бүрээр данс */}
      {SECTIONS.map((s) => {
        const accs = (bySection.get(s.key) ?? []).sort((a, b) => a.code.localeCompare(b.code));
        if (accs.length === 0) return null;
        const total = accs.reduce((sum, a) => sum + a.val, 0);
        return (
          <div key={s.key} className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="bg-zinc-800 px-4 py-2 text-sm font-semibold text-white">{s.label}</div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-zinc-100">
                {accs.map((a) => (
                  <tr key={a.code} className="hover:bg-zinc-50">
                    <td className="w-24 px-4 py-1.5 font-mono text-xs text-zinc-400">{a.code}</td>
                    <td className="px-4 py-1.5 text-zinc-700">{a.name}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums text-zinc-700">{fmt(a.val)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold">
                  <td className="px-4 py-2" colSpan={2}>Нийт — {s.label}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}
    </div>
  );
}
