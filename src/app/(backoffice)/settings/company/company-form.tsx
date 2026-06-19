"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveCompany } from "./actions";
import type { CompanyInfo } from "@/lib/company";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

function Field({
  name,
  label,
  defaultValue,
  required,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

export function CompanyForm({ company }: { company: CompanyInfo }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const res = await saveCompany(formData);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-6"
    >
      <div>
        <h2 className="text-sm font-semibold text-zinc-700">Үндсэн мэдээлэл</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="name" label="Байгууллагын нэр" defaultValue={company.name} required placeholder='"Компани" ХХК' />
          <Field name="name_upper" label="Нэр (ИХ үсгээр)" defaultValue={company.nameUpper} placeholder="КОМПАНИ ХХК" />
          <div className="sm:col-span-2">
            <Field name="address" label="Хаяг" defaultValue={company.address} placeholder="Дүүрэг, хороо, гудамж, байр…" />
          </div>
          <Field name="phone" label="Утас" defaultValue={company.phone} placeholder="77001234" />
          <Field name="email" label="Э-шуудан" defaultValue={company.email} placeholder="info@company.mn" />
          <Field name="web" label="Веб хуудас" defaultValue={company.web} placeholder="www.company.mn" />
          <Field name="register" label="ТТД (улсын бүртгэл)" defaultValue={company.register} placeholder="6906192" />
          <Field name="tax_id" label="НӨАТ дугаар" defaultValue={company.taxId} placeholder="НӨАТ-н дугаар" />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="is_vat_payer"
            defaultChecked={company.isVatPayer}
            className="h-4 w-4 rounded border-zinc-300"
          />
          НӨАТ төлөгч (нэхэмжлэлд 10% НӨАТ тооцно)
        </label>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-700">Банкны мэдээлэл</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="bank_name" label="Банк" defaultValue={company.bankName} placeholder="Худалдаа Хөгжлийн банк" />
          <Field name="bank_account" label="Дансны дугаар" defaultValue={company.bankAccount} placeholder="4110xxxxx" />
          <div className="sm:col-span-2">
            <Field name="bank_iban" label="IBAN" defaultValue={company.bankIban} placeholder="MN..." />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-700">Гарын үсэг (баримтад)</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="director" label="Захирал" defaultValue={company.director} placeholder="Овог Нэр" />
          <Field name="accountant" label="Нягтлан бодогч" defaultValue={company.accountant} placeholder="Овог Нэр" />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ Амжилттай хадгалагдлаа.
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-zinc-100 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      </div>
    </form>
  );
}
