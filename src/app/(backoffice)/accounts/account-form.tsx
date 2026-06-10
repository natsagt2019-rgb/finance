"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createAccount, updateAccount } from "./actions";
import type { AccountRow } from "./types";

export type ParentOption = { id: number; code: string; name: string };

type Props =
  | { mode: "create"; account?: undefined; parents: ParentOption[] }
  | { mode: "edit"; account: AccountRow; parents: ParentOption[] };

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

const CURRENCIES = [
  "MNT",
  "USD",
  "EUR",
  "CNY",
  "RUB",
  "JPY",
  "GBP",
  "KZT",
  "KRW",
  "HKD",
];

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "asset", label: "Хөрөнгө" },
  { value: "liability", label: "Өр төлбөр" },
  { value: "equity", label: "Өмч" },
  { value: "income", label: "Орлого" },
  { value: "expense", label: "Зардал" },
];

const JOURNAL_TYPES = [
  "Касс",
  "Харилцах",
  "Авлага өглөг",
  "Үндсэн хөрөнгө",
  "Бараа материал",
  "НӨАТ",
  "Ерөнхий журнал",
];

export function AccountForm({ mode, account, parents }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isTemp, setIsTemp] = useState(account?.is_temp ?? false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res =
          mode === "edit"
            ? await updateAccount(account.id, formData)
            : await createAccount(formData);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push("/accounts");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа.",
        );
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6"
    >
      {/* Эх данс (Бүлэг) */}
      <div>
        <label className={labelCls}>Бүлэг (эх данс)</label>
        <select
          name="parent_id"
          defaultValue={account?.parent_id != null ? String(account.parent_id) : ""}
          className={inputCls}
        >
          <option value="">— Бүлэггүй —</option>
          {parents.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.code} — {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>
            Код <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="code"
            required
            defaultValue={account?.code ?? ""}
            placeholder="311005"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Дансны дугаар</label>
          <input
            type="text"
            name="account_number"
            defaultValue={account?.account_number ?? ""}
            placeholder="Дансны дугаар"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>
            Нэр (МОН) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={account?.name ?? ""}
            placeholder="ААНОАТ-ын өглөг"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Нэр (ENG)</label>
          <input
            type="text"
            name="name_en"
            defaultValue={account?.name_en ?? ""}
            placeholder="CIT Payable"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>
            Ангилал <span className="text-red-500">*</span>
          </label>
          <select
            name="type"
            required
            defaultValue={account?.type ?? ""}
            className={inputCls}
          >
            <option value="">— Сонгоно уу —</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Шинж</label>
          <select
            name="nature"
            defaultValue={account?.nature ?? ""}
            className={inputCls}
          >
            <option value="">— Сонгох —</option>
            <option value="Актив">Актив</option>
            <option value="Пассив">Пассив</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Мөнгөн тэмдэгт</label>
          <select
            name="currency"
            defaultValue={account?.currency ?? "MNT"}
            className={inputCls}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Журнал</label>
          <select
            name="journal_type"
            defaultValue={account?.journal_type ?? ""}
            className={inputCls}
          >
            <option value="">— Сонгох —</option>
            {JOURNAL_TYPES.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Хэлтэс код</label>
          <input
            type="text"
            name="department_code"
            defaultValue={account?.department_code ?? ""}
            placeholder="0"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Хэлтэс нэр</label>
          <input
            type="text"
            name="department_name"
            defaultValue={account?.department_name ?? ""}
            placeholder="Үндсэн байгууллага"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Банк</label>
          <input
            type="text"
            name="bank_name"
            defaultValue={account?.bank_name ?? ""}
            placeholder="Худалдаа хөгжлийн банк"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Банкны данс</label>
          <input
            type="text"
            name="bank_account"
            defaultValue={account?.bank_account ?? ""}
            placeholder="426035153"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Санхүүгийн тайлангийн мөр (СС №361)</label>
        <input
          type="text"
          name="fs_line"
          defaultValue={account?.fs_line ?? ""}
          placeholder="Жнь: ББТ 1.1 Мөнгө ба түүнтэй адилтгах хөрөнгө"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Тайлбар / Тэмдэглэл</label>
        <textarea
          name="note"
          rows={2}
          defaultValue={account?.note ?? ""}
          placeholder="Жнь: ББӨ (Шууд) · МУСГАА 19 · татварт хасагдана"
          className={inputCls}
        />
      </div>

      {/* Түр данс */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="is_temp"
            checked={isTemp}
            onChange={(e) => setIsTemp(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Түр данс эсэх
        </label>

        <div>
          <label className={labelCls}>Түр данс — Хувь</label>
          <input
            type="number"
            name="temp_percent"
            step="0.01"
            min="0"
            max="100"
            disabled={!isTemp}
            defaultValue={account?.temp_percent ?? ""}
            placeholder="10.00"
            className={`${inputCls} disabled:bg-zinc-100 disabled:text-zinc-400`}
          />
        </div>
      </div>

      {mode === "edit" && (
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="is_inactive"
            defaultChecked={account ? !account.is_active : false}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Ашиглагдахгүй
        </label>
      )}

      {/* Борлуулсан бүтээгдэхүүний өртөг (ББӨ) */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <label className="flex items-start gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="is_cogs"
            defaultChecked={account?.is_cogs ?? false}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300"
          />
          <span>
            <span className="font-medium">
              Борлуулсан бүтээгдэхүүний өртөг (ББӨ)
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              Үйлчилгээний компанийн шууд зардлыг ББӨ-д тооцох бол энэ дансыг
              тэмдэглэнэ. Зардлын төвийн тайланд Нийт ашгийг зөв тооцоход
              хэрэглэнэ.
            </span>
          </span>
        </label>
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
          href="/accounts"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Болих
        </Link>
      </div>
    </form>
  );
}
