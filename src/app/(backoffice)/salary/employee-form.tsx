"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createEmployee, updateEmployee } from "./actions";
import { COMPANIES, type EmployeeRow } from "./types";

type Props =
  | { mode: "create"; employee?: undefined }
  | { mode: "edit"; employee: EmployeeRow };

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

export function EmployeeForm({ mode, employee }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res =
          mode === "edit"
            ? await updateEmployee(employee.id, formData)
            : await createEmployee(formData);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push("/salary?tab=employees");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>
            Овог Нэр <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={employee?.name ?? ""}
            placeholder="Нацагдорж"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Компани</label>
          <select
            name="company"
            defaultValue={employee?.company ?? ""}
            className={inputCls}
          >
            <option value="">— сонгох —</option>
            {COMPANIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Албан тушаал</label>
          <input
            type="text"
            name="position"
            defaultValue={employee?.position ?? ""}
            placeholder="Харилцагчийн менежер"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Ажилд орсон огноо</label>
          <input
            type="date"
            name="hired_date"
            defaultValue={employee?.hired_date ?? ""}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Туршлага (жил)</label>
          <input
            type="number"
            name="experience_years"
            step="0.5"
            min="0"
            defaultValue={employee ? String(employee.experience_years) : "0"}
            placeholder="ЭА хоног тооцоход"
            className={`${inputCls} text-right tabular-nums`}
          />
          <p className="mt-1 text-xs text-zinc-400">
            Нийт ажилласан жил — ЭА хоног (15–29) тооцоход. Хоосон бол ажилд орсон
            огнооноос бодно.
          </p>
        </div>

        <div>
          <label className={labelCls}>Үндсэн цалин (₮)</label>
          <input
            type="number"
            name="base_salary"
            step="0.01"
            min="0"
            defaultValue={employee ? String(employee.base_salary) : "0"}
            className={`${inputCls} text-right tabular-nums`}
          />
        </div>

        <div>
          <label className={labelCls}>Утасны нэмэгдэл (₮)</label>
          <input
            type="number"
            name="phone_allowance"
            step="0.01"
            min="0"
            defaultValue={employee ? String(employee.phone_allowance) : "0"}
            className={`${inputCls} text-right tabular-nums`}
          />
        </div>

        <div>
          <label className={labelCls}>ДД / Регистр</label>
          <input
            type="text"
            name="register"
            defaultValue={employee?.register ?? ""}
            placeholder="УБ12345678"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Дансны дугаар</label>
          <input
            type="text"
            name="bank_account"
            defaultValue={employee?.bank_account ?? ""}
            placeholder="5xxxxxxxxx"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Төлөв</label>
          <select
            name="status"
            defaultValue={employee?.status ?? "active"}
            className={inputCls}
          >
            <option value="active">Идэвхтэй</option>
            <option value="inactive">Идэвхгүй</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? "Хадгалж байна…" : mode === "edit" ? "Хадгалах" : "Нэмэх"}
        </button>
        <Link
          href="/salary?tab=employees"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Болих
        </Link>
      </div>
    </form>
  );
}
