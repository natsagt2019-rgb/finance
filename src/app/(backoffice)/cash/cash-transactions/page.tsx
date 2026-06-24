import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { ENTRY_SELECT, REGISTER_SELECT, type EntryRow, type RegisterRow } from "../types";

type SearchParams = { reg?: string; from?: string; to?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function fmt(n: number, ccy = "MNT"): string {
  if (!n) return "—";
  const d = ccy === "MNT" ? 0 : 2;
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
// Төгрөгийн дүйцэл (гадаад валютын касс дээр давхар харуулна — журнал MNT-ээр).
function fmtMnt(n: number): string {
  if (!n) return "";
  return `${Math.round(n).toLocaleString("en-US")}₮`;
}

export default async function CashTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });
  const year = today.slice(0, 4);
  const from = sp.from && ISO.test(sp.from) ? sp.from : `${year}-01-01`;
  const to = sp.to && ISO.test(sp.to) ? sp.to : today;

  // Кассууд.
  const { data: regData } = await supabase
    .from("cash_registers")
    .select(REGISTER_SELECT)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(2000);
  const registers = (regData as RegisterRow[] | null) ?? [];
  const regId =
    sp.reg && registers.some((r) => r.id === Number(sp.reg))
      ? Number(sp.reg)
      : registers[0]?.id ?? null;
  const reg = registers.find((r) => r.id === regId) ?? null;
  const ccy = reg?.currency ?? "MNT";
  const isForeign = ccy !== "MNT";

  // Сонгосон кассын бүх баримт (to хүртэл).
  let entries: EntryRow[] = [];
  let error: { message: string } | null = null;
  if (regId != null) {
    const { data, error: e } = await supabase
      .from("cash_entries")
      .select(ENTRY_SELECT)
      .eq("register_id", regId)
      .lte("date", to)
      .order("date", { ascending: true })
      .order("id", { ascending: true })
      .limit(50000);
    error = e;
    entries = (data as EntryRow[] | null) ?? [];
  }

  // Эхний үлдэгдэл (мужийн өмнөх) + мужийн running balance. Кассын валютаар (amount)
  // ба төгрөгөөр (amount_mnt) зэрэг — гадаад валютын касс дээр давхар харуулна.
  let opening = 0;
  let openingMnt = 0;
  for (const e of entries) {
    if (e.date < from) {
      const s = e.type === "in" ? 1 : -1;
      opening += s * Number(e.amount);
      openingMnt += s * Number(e.amount_mnt);
    }
  }
  let balance = opening;
  let balanceMnt = openingMnt;
  let totalIn = 0;
  let totalOut = 0;
  let totalInMnt = 0;
  let totalOutMnt = 0;
  const rows: { e: EntryRow; inc: number; exp: number; incMnt: number; expMnt: number; balance: number; balanceMnt: number }[] = [];
  for (const e of entries) {
    if (e.date < from || e.date > to) continue;
    const inc = e.type === "in" ? Number(e.amount) : 0;
    const exp = e.type === "out" ? Number(e.amount) : 0;
    const incMnt = e.type === "in" ? Number(e.amount_mnt) : 0;
    const expMnt = e.type === "out" ? Number(e.amount_mnt) : 0;
    balance += inc - exp;
    balanceMnt += incMnt - expMnt;
    totalIn += inc;
    totalOut += exp;
    totalInMnt += incMnt;
    totalOutMnt += expMnt;
    rows.push({ e, inc, exp, incMnt, expMnt, balance, balanceMnt });
  }
  const closing = opening + totalIn - totalOut;
  const closingMnt = openingMnt + totalInMnt - totalOutMnt;

  const qs = (over: Partial<SearchParams>) => {
    const p = new URLSearchParams();
    if (over.reg ?? regId) p.set("reg", String(over.reg ?? regId));
    p.set("from", over.from ?? from);
    p.set("to", over.to ?? to);
    return `/cash/cash-transactions?${p.toString()}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Кассын гүйлгээний тайлан</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {reg ? reg.name : "— касс алга —"} · {from} → {to} · {ccy}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="reg" value={regId ?? ""} />
            <input type="date" name="from" defaultValue={from} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            <input type="date" name="to" defaultValue={to} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
              Харах
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      {registers.length > 0 && (
        <div className="no-print mt-4 flex flex-wrap gap-2">
          {registers.map((r) => (
            <a
              key={r.id}
              href={qs({ reg: String(r.id) })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                r.id === regId ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {r.name} ({r.currency})
            </a>
          ))}
        </div>
      )}

      <div className="mt-1 hidden text-center print:block">
        <h1 className="text-xl font-bold text-zinc-900">Кассын гүйлгээний тайлан</h1>
        <p className="text-sm text-zinc-600">{reg?.name} · {from} → {to}</p>
      </div>

      {registers.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          Касс бүртгэгдээгүй байна. /cash → «Касс» табаас касс нэмнэ үү.
        </div>
      ) : error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Алдаа: {error.message}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white print:border-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
            <span className="font-semibold text-zinc-900">{reg?.name}</span>
            <div className="text-xs text-zinc-500">
              Эхний үлдэгдэл: <span className="font-medium text-zinc-700">{fmt(opening, ccy)}</span>
              {isForeign && <span className="text-zinc-400"> ({fmtMnt(openingMnt)})</span>}
              {"  ·  "}
              Эцсийн үлдэгдэл: <span className="font-medium text-zinc-700">{fmt(closing, ccy)}</span>
              {isForeign && <span className="text-zinc-400"> ({fmtMnt(closingMnt)})</span>}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-100 text-xs font-medium text-zinc-600">
                <tr>
                  <th colSpan={2} className="border border-zinc-200 px-3 py-2 text-center">Баримтын</th>
                  <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-left">Гүйлгээний утга</th>
                  <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-left">Харилцагч</th>
                  <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-right">Орлого</th>
                  <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-right">Зарлага</th>
                  <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-right">Үлдэгдэл</th>
                </tr>
                <tr>
                  <th className="border border-zinc-200 px-3 py-1.5 text-left">№</th>
                  <th className="border border-zinc-200 px-3 py-1.5 text-left">Огноо</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-zinc-50/60 font-medium text-zinc-700">
                  <td colSpan={6} className="border border-zinc-200 px-3 py-2 text-right">Эхний үлдэгдэл :</td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums">{fmt(opening, ccy)}</td>
                </tr>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border border-zinc-200 px-3 py-10 text-center text-sm text-zinc-500">
                      Энэ хугацаанд гүйлгээ алга.
                    </td>
                  </tr>
                ) : (
                  rows.map(({ e, inc, exp, incMnt, expMnt, balance, balanceMnt }, i) => (
                    <tr key={e.id} className="hover:bg-zinc-50">
                      <td className="border border-zinc-200 px-3 py-1.5 text-zinc-400">{e.doc_no || i + 1}</td>
                      <td className="whitespace-nowrap border border-zinc-200 px-3 py-1.5 text-zinc-600">{e.date}</td>
                      <td className="border border-zinc-200 px-3 py-1.5 text-zinc-700">{e.description || "—"}</td>
                      <td className="whitespace-nowrap border border-zinc-200 px-3 py-1.5 text-zinc-500">
                        {e.partner_name || "—"}
                      </td>
                      <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-green-700">
                        {inc ? fmt(inc, ccy) : "—"}
                        {isForeign && inc ? <div className="text-[10px] text-zinc-400">{fmtMnt(incMnt)}</div> : null}
                      </td>
                      <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-red-600">
                        {exp ? fmt(exp, ccy) : "—"}
                        {isForeign && exp ? <div className="text-[10px] text-zinc-400">{fmtMnt(expMnt)}</div> : null}
                      </td>
                      <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums font-medium text-zinc-900">
                        {fmt(balance, ccy)}
                        {isForeign && <div className="text-[10px] font-normal text-zinc-400">{fmtMnt(balanceMnt)}</div>}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-zinc-50 font-semibold text-zinc-900">
                  <td colSpan={4} className="border border-zinc-200 px-3 py-2">Дансны дүн</td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums text-green-700">
                    {fmt(totalIn, ccy)}
                    {isForeign && totalInMnt ? <div className="text-[10px] font-normal text-zinc-400">{fmtMnt(totalInMnt)}</div> : null}
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums text-red-600">
                    {fmt(totalOut, ccy)}
                    {isForeign && totalOutMnt ? <div className="text-[10px] font-normal text-zinc-400">{fmtMnt(totalOutMnt)}</div> : null}
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums">
                    {fmt(closing, ccy)}
                    {isForeign && <div className="text-[10px] font-normal text-zinc-400">{fmtMnt(closingMnt)}</div>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
