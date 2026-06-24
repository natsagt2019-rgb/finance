import Link from "next/link";

import { PrintButton } from "@/components/print-button";
import { RowActions } from "./row-actions";
import { EmployeesImport } from "./employees-import";
import type { EmployeeRow } from "./types";

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function EmployeesTab({
  employees,
  year,
}: {
  employees: EmployeeRow[];
  year: number;
}) {
  const totalFund = employees.reduce(
    (s, e) => s + (Number(e.base_salary) || 0) + (Number(e.phone_allowance) || 0),
    0,
  );

  // Хэвлэх толгойд: огноо + (бүх ажилтан нэг компанийнх бол) компанийн нэр.
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });
  const companies = [...new Set(employees.map((e) => e.company).filter(Boolean))];
  const orgName = companies.length === 1 ? companies[0] : "Бүх компани";

  return (
    <div>
      {/* Нэгтгэлийн картууд */}
      <div className="no-print grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Нийт ажилтан
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-blue-900">
            {employees.length}
          </p>
        </div>
        <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-green-600">
            Сарын цалингийн сан
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-green-900">
            {fmtMoney(totalFund)}₮
          </p>
          <p className="mt-1 text-xs text-green-600">үндсэн + утасны нэмэгдэл</p>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-purple-600">
            Дундаж үндсэн цалин
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-purple-900">
            {employees.length
              ? fmtMoney(
                  employees.reduce((s, e) => s + (Number(e.base_salary) || 0), 0) /
                    employees.length,
                )
              : 0}
            ₮
          </p>
        </div>
      </div>

      <div className="no-print mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
        <EmployeesImport />
        {employees.length > 0 && <PrintButton />}
      </div>

      {/* Хэвлэхэд гарах толгой (дэлгэц дээр нуугдана) */}
      {employees.length > 0 && (
        <div className="hidden text-center print:mb-3 print:block">
          <p className="text-sm text-zinc-600">
            Байгууллага: <span className="font-semibold text-zinc-900">{orgName}</span>
          </p>
          <h1 className="mt-1 text-lg font-bold tracking-wide text-zinc-900">
            АЖИЛТНЫ НЭРС
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Тайлант огноо: {today} · Нийт {employees.length} ажилтан
          </p>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white print:mt-0 print:rounded-none print:border-0">
        {employees.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            Ажилтан бүртгэгдээгүй байна. Дээрх «Excel загвар татах»-аар бөөнөөр оруулж болно.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="print-table w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2">№</th>
                  <th className="px-4 py-2">Овог Нэр</th>
                  <th className="px-4 py-2">Компани</th>
                  <th className="px-4 py-2">Хэлтэс</th>
                  <th className="px-4 py-2">Албан тушаал</th>
                  <th className="px-4 py-2 text-right">Үндсэн цалин</th>
                  <th className="px-4 py-2">ДД / Регистр</th>
                  <th className="px-4 py-2">Төлөв</th>
                  <th className="no-print px-4 py-2 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {employees.map((e, i) => (
                  <tr key={e.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2 text-zinc-400">{i + 1}</td>
                    <td className="px-4 py-2 font-medium text-zinc-800">{e.name}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                      {e.company || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                      {e.department || "—"}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">{e.position || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-zinc-800">
                      {fmtMoney(Number(e.base_salary) || 0)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                      {e.register || "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          e.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {e.status === "active" ? "Идэвхтэй" : "Идэвхгүй"}
                      </span>
                    </td>
                    <td className="no-print whitespace-nowrap px-4 py-2 text-right">
                      <Link
                        href={`/salary/document/cx-4?emp=${e.id}&year=${year}`}
                        title="Цалингийн тооцооны карт (ЦХ-4) хэвлэх"
                        className="mr-1 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        🖨 ЦХ-4
                      </Link>
                      <RowActions id={e.id} label={e.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
