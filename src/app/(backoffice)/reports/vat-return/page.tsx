import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { loadCompany } from "@/lib/company";
import { buildVatReturn } from "@/lib/vat-return";

type SearchParams = { year?: string; month?: string };

const MONTHS = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

function fmt(n: number): string {
  if (!n) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Сарын сүүлийн өдөр (он, сар → YYYY-MM-DD).
function monthEnd(year: number, month: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

function FormHead() {
  return (
    <div className="text-right text-[11px] leading-4 text-zinc-500">
      Нэмэгдсэн өртгийн албан
      <br />
      татварын тухай хууль
      <br />
      <span className="font-medium text-zinc-700">Маягт TT-03а</span>
    </div>
  );
}

function SignatureCell({ role, name }: { role: string; name: string }) {
  return (
    <div>
      <p>{role}:</p>
      <div className="mt-6 text-center">
        <p className="border-b border-zinc-500 pb-1">
          {name ? <span className="font-medium text-zinc-800">{name}</span> : <>&nbsp;</>}
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">/ гарын үсэг, тэмдэг /</p>
      </div>
    </div>
  );
}

export default async function VatReturnPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const company = await loadCompany();

  const now = new Date();
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : now.getFullYear();
  const monthNum = Number(sp.month);
  const month = monthNum >= 1 && monthNum <= 12 ? monthNum : now.getMonth() + 1;

  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = monthEnd(year, month);

  const v = await buildVatReturn(supabase, from, to);
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  type Row = { section: string } | { no: string; label: string; value: number; strong?: boolean; indent?: boolean };
  const rows: Row[] = [
    { section: "А. Тухайн сард борлуулсан бараа, ажил, үйлчилгээний НӨАТ-ын тооцоо" },
    { no: "25", label: "Тухайн сарын НӨАТ ногдох дотоодын бараа, ажил, үйлчилгээний орлого", value: v.row25, strong: true },
    { no: "26", label: "Ногдуулсан татвар (25 × 10%)", value: v.row26 },
    { no: "27", label: "0 хувь хэрэглэх (экспорт) борлуулалтын орлого", value: 0, indent: true },
    { no: "31", label: "Тухайн сард ногдуулсан НӨАТ-ын нийт татвар (26+30)", value: v.row31, strong: true },
    { section: "Б. Тухайн сард худалдан авсан бараа, ажил, үйлчилгээний НӨАТ-ын тооцоо" },
    { no: "33", label: "НӨАТ-тай худалдан авсан бараа, ажил, үйлчилгээний дүн (НӨАТ-гүй)", value: v.row33, strong: true },
    { no: "42", label: "Худалдан авалтад төлсөн НӨАТ-ын нийт дүн (33 × 10%)", value: v.row42 },
    { no: "43", label: "Хасагдахгүй НӨАТ-ын дүн", value: 0, indent: true },
    { no: "49", label: "Тухайн сард хасагдах НӨАТ-ын дүн (42−43)", value: v.row49, strong: true },
    { section: "Г. Тухайн сарын НӨАТ-ын тооцоолол" },
    { no: "56", label: "Тухайн сард төлбөл зохих НӨАТ (31+52)", value: v.row56, strong: true },
    { no: "57", label: "Тухайн сард буцаан авах НӨАТ (49+55)", value: v.row57, strong: true },
  ];

  const payable = v.netPayable >= 0;

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            НӨАТ-ын тайлан (TT-03а)
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Суутган төлөгчийн албан ёсны маягт. Эх өгөгдөл: eBarimt баримт (vat).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" className="flex items-center gap-2">
            <select name="year" defaultValue={String(year)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              {years.map((y) => (
                <option key={y} value={y}>{y} он</option>
              ))}
            </select>
            <select name="month" defaultValue={String(month)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <button type="submit" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              Харах
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      {/* ── Албан ёсны маягт ── */}
      <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-8 text-sm leading-6 text-zinc-800 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <FormHead />
        <h2 className="mt-2 text-center text-base font-bold uppercase text-zinc-900">
          Нэмэгдсэн өртгийн албан татвар суутган төлөгчийн тайлан
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-[13px]">
          <div>Суутган төлөгч: <b>{company.name || "—"}</b></div>
          <div>Тайлант үе: <b>{year} он, {MONTHS[month - 1]}</b></div>
          <div>Татвар төлөгчийн дугаар (ТТД): <b>{company.register || "—"}</b></div>
          <div>Хэмжих нэгж: <b>төгрөг</b></div>
        </div>

        <table className="mt-4 w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-zinc-100 text-center text-zinc-600">
              <th className="border border-zinc-300 px-2 py-1.5 text-left">Үзүүлэлт</th>
              <th className="w-12 border border-zinc-300 px-2 py-1.5">Мөр</th>
              <th className="w-44 border border-zinc-300 px-2 py-1.5 text-right">Дүн</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) =>
              "section" in row ? (
                <tr key={i} className="bg-zinc-200/70">
                  <td colSpan={3} className="border border-zinc-300 px-2 py-1.5 font-semibold text-zinc-800">
                    {row.section}
                  </td>
                </tr>
              ) : (
                <tr key={i} className={row.strong ? "bg-zinc-50 font-semibold" : ""}>
                  <td className={`border border-zinc-300 px-2 py-1.5 ${row.indent ? "pl-6 text-zinc-600" : ""}`}>
                    {row.label}
                  </td>
                  <td className="border border-zinc-300 px-2 py-1.5 text-center text-zinc-500">{row.no}</td>
                  <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(row.value)}</td>
                </tr>
              ),
            )}
            {/* Цэвэр дүн */}
            <tr className="border-t-2 border-zinc-400 bg-amber-50 font-semibold">
              <td className="border border-zinc-300 px-2 py-2">
                {payable ? "Улсад ТӨЛБӨЛ ЗОХИХ НӨАТ (56−57)" : "Улсаас БУЦААН АВАХ НӨАТ (57−56)"}
              </td>
              <td className="border border-zinc-300 px-2 py-2"></td>
              <td className="border border-zinc-300 px-2 py-2 text-right tabular-nums">
                {fmt(Math.abs(v.netPayable))}
              </td>
            </tr>
          </tbody>
        </table>

        {v.outExemptBase > 0 && (
          <p className="mt-2 text-[11px] text-zinc-500">
            * Чөлөөлөгдөх борлуулалт: {fmt(v.outExemptBase)}₮ (НӨАТ ногдохгүй, мөр 25-д ороогүй).
          </p>
        )}
        <p className="mt-1 text-[11px] text-zinc-500">
          Баримтын тоо: борлуулалт {v.outCnt}, худалдан авалт {v.inCnt}.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-12">
          <SignatureCell role="Захирал" name={company.director} />
          <SignatureCell role="Ерөнхий нягтлан бодогч" name={company.accountant} />
        </div>
      </div>
    </div>
  );
}
