import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import type { EmployeeRow, SalaryRow } from "../../types";

// Зөвхөн маягтад хэрэглэх, тогтвортой баганууд (бүтэн SELECT тогтмолоос хамаарахгүй —
// модулийн схем өргөжсөн ч баримт хэвлэлт эвдрэхгүй).
const EMP_SEL = "id, name, company, position, register";
const REC_SEL =
  "id, employee_id, year, month, employee_name, company, base_salary, " +
  "phone_allowance, bonus, vacation_amount, gross, sh_insurance, pit, advance, net";

// ── Анхан шатны баримт: Цалин (ЦХ-4, ЦХ-5а, ЦХ-5б) ───────────────────────────
// Сангийн сайдын 2017 оны 347 дугаар тушаалын хавсралт маягтуудыг цалингийн
// бичилтэд (salary_records) холбож хэвлэнэ.

type FormKey = "cx-4" | "cx-5a" | "cx-5b";

const FORMS: Record<FormKey, { code: string; title: string }> = {
  "cx-4": { code: "ЦХ-4", title: "Цалингийн тооцооны карт" },
  "cx-5a": { code: "ЦХ-5а", title: "Цалингийн урьдчилгаа олгох хүснэгт" },
  "cx-5b": { code: "ЦХ-5б", title: "Цалин олгох хүснэгт" },
};

function fmt(n: number | null | undefined): string {
  return Math.round(Number(n) || 0).toLocaleString("en-US");
}

const MONTH_NAMES = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

const SignatureCell = ({ role }: { role: string }) => (
  <div className="text-center">
    <p className="border-b border-zinc-500 pb-1">&nbsp;</p>
    <p className="mt-1 text-[11px] text-zinc-500">{role}</p>
  </div>
);

const Head = ({ code }: { code: string }) => (
  <div className="text-right text-[11px] leading-4 text-zinc-500">
    Сангийн сайдын 2017 оны
    <br />
    347 дугаар тушаалын хавсралт
    <br />
    <span className="font-medium text-zinc-700">НХ Маягт {code}</span>
  </div>
);

type Search = { company?: string; year?: string; month?: string; emp?: string };

export default async function SalaryDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ form: string }>;
  searchParams: Promise<Search>;
}) {
  const { form } = await params;
  const sp = await searchParams;
  const meta = FORMS[form as FormKey];
  if (!meta) notFound();

  const supabase = await createClient();
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : 2026;

  // ── ЦХ-4: Нэг ажилтны жилийн тооцооны карт ─────────────────────────────────
  if (form === "cx-4") {
    const empId = Number(sp.emp);
    if (!empId) notFound();
    const [{ data: empData }, { data: recData }] = await Promise.all([
      supabase.from("employees").select(EMP_SEL).eq("id", empId).maybeSingle(),
      supabase
        .from("salary_records")
        .select(REC_SEL)
        .eq("employee_id", empId)
        .eq("year", year)
        .eq("is_active", true)
        .order("month", { ascending: true })
        .limit(24),
    ]);
    const emp = empData as EmployeeRow | null;
    if (!emp) notFound();
    const recs = (recData as SalaryRow[] | null) ?? [];

    const allow = (r: SalaryRow) =>
      (Number(r.phone_allowance) || 0) + (Number(r.bonus) || 0) + (Number(r.vacation_amount) || 0);
    const tot = {
      base: recs.reduce((s, r) => s + (Number(r.base_salary) || 0), 0),
      allow: recs.reduce((s, r) => s + allow(r), 0),
      gross: recs.reduce((s, r) => s + (Number(r.gross) || 0), 0),
      adv: recs.reduce((s, r) => s + (Number(r.advance) || 0), 0),
      sh: recs.reduce((s, r) => s + (Number(r.sh_insurance) || 0), 0),
      pit: recs.reduce((s, r) => s + (Number(r.pit) || 0), 0),
      net: recs.reduce((s, r) => s + (Number(r.net) || 0), 0),
    };

    return (
      <div>
        <div className="no-print mb-4 flex items-center justify-between">
          <Link href="/salary?tab=employees" className="text-sm text-zinc-500 hover:text-zinc-800">
            ← Ажилтнууд
          </Link>
          <PrintButton />
        </div>

        <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-8 text-sm leading-7 text-zinc-800 print:max-w-none print:rounded-none print:border-0 print:p-0">
          <Head code="ЦХ-4" />
          <h2 className="mt-2 text-center text-base font-bold uppercase text-zinc-900">
            Цалингийн тооцооны карт — {year} он
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-x-8">
            <div>Байгууллага: <b>{emp.company || "—"}</b></div>
            <div>Бүртгэлийн дугаар: <b>{emp.register || "—"}</b></div>
            <div>Овог, нэр: <b>{emp.name}</b></div>
            <div>Албан тушаал: <b>{emp.position || "—"}</b></div>
          </div>

          <table className="mt-4 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-100 text-center text-zinc-600">
                <th className="border border-zinc-300 px-2 py-1.5">Сар</th>
                <th className="border border-zinc-300 px-2 py-1.5">Үндсэн цалин</th>
                <th className="border border-zinc-300 px-2 py-1.5">Нэмэгдэл</th>
                <th className="border border-zinc-300 px-2 py-1.5">Олговол зохих</th>
                <th className="border border-zinc-300 px-2 py-1.5">Урьдчилгаа</th>
                <th className="border border-zinc-300 px-2 py-1.5">НДШ</th>
                <th className="border border-zinc-300 px-2 py-1.5">ХХОАТ</th>
                <th className="border border-zinc-300 px-2 py-1.5">Жинхэнэ олгох</th>
              </tr>
            </thead>
            <tbody>
              {recs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border border-zinc-300 px-2 py-4 text-center text-zinc-400">
                    {year} онд цалингийн бичилт алга.
                  </td>
                </tr>
              ) : (
                recs.map((r) => (
                  <tr key={r.id} className="text-center">
                    <td className="border border-zinc-300 px-2 py-1 text-left">{MONTH_NAMES[r.month - 1]}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(r.base_salary)}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(allow(r))}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(r.gross)}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(r.advance)}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(r.sh_insurance)}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(r.pit)}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums font-medium">{fmt(r.net)}</td>
                  </tr>
                ))
              )}
              {recs.length > 0 && (
                <tr className="bg-zinc-50 text-center font-semibold">
                  <td className="border border-zinc-300 px-2 py-1.5 text-right">Дүн:</td>
                  <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(tot.base)}</td>
                  <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(tot.allow)}</td>
                  <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(tot.gross)}</td>
                  <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(tot.adv)}</td>
                  <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(tot.sh)}</td>
                  <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(tot.pit)}</td>
                  <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(tot.net)}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-8 grid grid-cols-2 gap-10">
            <div><p>Нягтлан бодогч:</p><div className="mt-6"><SignatureCell role="(гарын үсэг)" /></div></div>
            <div><p>Ажилтан:</p><div className="mt-6"><SignatureCell role="(гарын үсэг)" /></div></div>
          </div>
        </div>
      </div>
    );
  }

  // ── ЦХ-5а / ЦХ-5б: сар бүрийн хүснэгт (компани, сараар) ─────────────────────
  const company = (sp.company ?? "").trim();
  const monthNum = Number(sp.month);
  const month = monthNum >= 1 && monthNum <= 12 ? monthNum : 1;

  const { data: recData } = await supabase
    .from("salary_records")
    .select(REC_SEL)
    .eq("year", year)
    .eq("month", month)
    .eq("is_active", true)
    .limit(5000);
  let recs = (recData as SalaryRow[] | null) ?? [];
  if (company) recs = recs.filter((r) => r.company === company);
  recs.sort((a, b) => (a.employee_name ?? "").localeCompare(b.employee_name ?? "", "mn"));

  // Бүртгэлийн дугаар, албан тушаалыг ажилтнаас холбоно.
  const empIds = [...new Set(recs.map((r) => r.employee_id))];
  const { data: empData } = empIds.length
    ? await supabase.from("employees").select(EMP_SEL).in("id", empIds)
    : { data: [] };
  const empById = new Map(
    ((empData as EmployeeRow[] | null) ?? []).map((e) => [e.id, e]),
  );

  const orgName = company || recs[0]?.company || "—";
  const isAdvance = form === "cx-5a";

  const tot = {
    gross: recs.reduce((s, r) => s + (Number(r.gross) || 0), 0),
    adv: recs.reduce((s, r) => s + (Number(r.advance) || 0), 0),
    sh: recs.reduce((s, r) => s + (Number(r.sh_insurance) || 0), 0),
    pit: recs.reduce((s, r) => s + (Number(r.pit) || 0), 0),
    net: recs.reduce((s, r) => s + (Number(r.net) || 0), 0),
  };

  return (
    <div>
      <div className="no-print mb-2 flex items-center justify-between">
        <Link href="/salary?tab=calc" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Цалин тооцоо
        </Link>
        <PrintButton />
      </div>
      {/* ЦХ-5а ↔ ЦХ-5б сэлгэх */}
      <div className="no-print mb-3 flex gap-2">
        {(["cx-5b", "cx-5a"] as const).map((f) => {
          const q = new URLSearchParams();
          if (company) q.set("company", company);
          q.set("year", String(year));
          q.set("month", String(month));
          return (
            <Link
              key={f}
              href={`/salary/document/${f}?${q.toString()}`}
              className={`rounded-lg px-3 py-1 text-xs font-medium ${
                f === form
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {FORMS[f].code}
            </Link>
          );
        })}
      </div>

      <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-8 text-sm leading-7 text-zinc-800 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <Head code={meta.code} />
        <h2 className="mt-2 text-center text-base font-bold uppercase text-zinc-900">
          {meta.title}
        </h2>
        <div className="mt-3 flex items-end justify-between">
          <span>Байгууллага: <b>{orgName}</b></span>
          <span>{year} он {month}-р сар</span>
        </div>

        <table className="mt-4 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-100 text-center text-zinc-600">
              <th className="border border-zinc-300 px-2 py-1.5">№</th>
              <th className="border border-zinc-300 px-2 py-1.5">Овог, нэр</th>
              <th className="border border-zinc-300 px-2 py-1.5">Бүртгэлийн №</th>
              {isAdvance ? (
                <>
                  <th className="border border-zinc-300 px-2 py-1.5">Албан тушаал</th>
                  <th className="border border-zinc-300 px-2 py-1.5">Олгосон урьдчилгаа</th>
                </>
              ) : (
                <>
                  <th className="border border-zinc-300 px-2 py-1.5">Цалин (нийт)</th>
                  <th className="border border-zinc-300 px-2 py-1.5">Урьдчилгаа</th>
                  <th className="border border-zinc-300 px-2 py-1.5">НДШ</th>
                  <th className="border border-zinc-300 px-2 py-1.5">ХХОАТ</th>
                  <th className="border border-zinc-300 px-2 py-1.5">Жинхэнэ олгох</th>
                </>
              )}
              <th className="border border-zinc-300 px-2 py-1.5">Гарын үсэг</th>
            </tr>
          </thead>
          <tbody>
            {recs.length === 0 ? (
              <tr>
                <td colSpan={isAdvance ? 6 : 9} className="border border-zinc-300 px-2 py-4 text-center text-zinc-400">
                  Энэ сард цалингийн бичилт алга.
                </td>
              </tr>
            ) : (
              recs.map((r, i) => {
                const e = empById.get(r.employee_id);
                return (
                  <tr key={r.id} className="text-center">
                    <td className="border border-zinc-300 px-2 py-1">{i + 1}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-left">{r.employee_name || e?.name || `#${r.employee_id}`}</td>
                    <td className="border border-zinc-300 px-2 py-1">{e?.register || "—"}</td>
                    {isAdvance ? (
                      <>
                        <td className="border border-zinc-300 px-2 py-1 text-left">{e?.position || "—"}</td>
                        <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(r.advance)}</td>
                      </>
                    ) : (
                      <>
                        <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(r.gross)}</td>
                        <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(r.advance)}</td>
                        <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(r.sh_insurance)}</td>
                        <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(r.pit)}</td>
                        <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums font-medium">{fmt(r.net)}</td>
                      </>
                    )}
                    <td className="border border-zinc-300 px-2 py-1"> </td>
                  </tr>
                );
              })
            )}
            {recs.length > 0 && (
              <tr className="bg-zinc-50 text-center font-semibold">
                <td className="border border-zinc-300 px-2 py-1.5 text-right" colSpan={3}>Дүн:</td>
                {isAdvance ? (
                  <>
                    <td className="border border-zinc-300" />
                    <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(tot.adv)}</td>
                  </>
                ) : (
                  <>
                    <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(tot.gross)}</td>
                    <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(tot.adv)}</td>
                    <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(tot.sh)}</td>
                    <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(tot.pit)}</td>
                    <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(tot.net)}</td>
                  </>
                )}
                <td className="border border-zinc-300" />
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-8 flex justify-between gap-8">
          <div className="text-center"><p className="text-zinc-500">Захирал</p><div className="mt-6"><SignatureCell role="(гарын үсэг)" /></div></div>
          <div className="text-center"><p className="text-zinc-500">Нягтлан бодогч</p><div className="mt-6"><SignatureCell role="(гарын үсэг)" /></div></div>
          <div className="text-center"><p className="text-zinc-500">Касс</p><div className="mt-6"><SignatureCell role="(гарын үсэг)" /></div></div>
        </div>
      </div>
    </div>
  );
}
