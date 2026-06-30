"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveBankAccount, deleteBankAccount } from "./actions";

export type BankAccountRow = {
  id: number;
  account_no: string;
  bank_type: string;
  label: string;
  gl_code: string | null;
  currency: string;
  company: string | null;
};
export type GlOption = { code: string; name: string };

// Монголын арилжааны банкууд. Түлхүүр (bank_type) нь bank_accounts-д
// хадгалагдана — хуучин дансны түлхүүрийг (tdb/golomt/mbank/khas) солихгүй.
const BANK_LABEL: Record<string, string> = {
  tdb: "Худалдаа хөгжлийн банк (ХХБ/ТДБ)",
  khan: "ХААН банк",
  golomt: "Голомт банк",
  state: "Төрийн банк",
  teever: "Тээвэр хөгжлийн банк",
  arig: "Ариг банк",
  capitron: "Капитрон банк",
  nibank: "Үндэсний хөрөнгө оруулалтын банк",
  khas: "Хас банк (XacBank)",
  bogd: "Богд банк",
  chinggis: "Чингис Хаан банк",
  mbank: "М банк",
};
const CURRENCIES = ["MNT", "USD", "EUR", "CNY", "RUB", "JPY", "GBP"];

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

const EMPTY = { id: 0, account_no: "", bank_type: "tdb", label: "", gl_code: "", currency: "MNT", company: "" };

export function BankAccountsClient({
  accounts,
  glOptions,
}: {
  accounts: BankAccountRow[];
  glOptions: GlOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<{
    id: number;
    account_no: string;
    bank_type: string;
    label: string;
    gl_code: string;
    currency: string;
    company: string;
  }>(EMPTY);

  // Бүртгэгдсэн (давхцалгүй) компаниуд — datalist санал болгоход.
  const companyOptions = [
    ...new Set(accounts.map((a) => a.company).filter((c): c is string => !!c)),
  ];
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function edit(a: BankAccountRow) {
    setForm({
      id: a.id,
      account_no: a.account_no,
      bank_type: a.bank_type,
      label: a.label,
      gl_code: a.gl_code ?? "",
      currency: a.currency,
      company: a.company ?? "",
    });
    setError(null);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await saveBankAccount(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setForm(EMPTY);
      router.refresh();
    });
  }

  function remove(a: BankAccountRow) {
    if (!confirm(`${a.account_no} дансыг устгах уу?`)) return;
    start(async () => {
      const res = await deleteBankAccount(a.id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Нэмэх / засах форм */}
      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5"
      >
        <h2 className="text-sm font-semibold text-zinc-700">
          {form.id ? "Данс засах" : "Шинэ данс нэмэх"}
        </h2>
        <input type="hidden" name="id" value={form.id || ""} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelCls}>
              Дансны дугаар <span className="text-red-500">*</span>
            </label>
            <input
              name="account_no"
              value={form.account_no}
              onChange={(e) => setForm({ ...form, account_no: e.target.value })}
              placeholder="411099344"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Банк</label>
            <select
              name="bank_type"
              value={form.bank_type}
              onChange={(e) => setForm({ ...form, bank_type: e.target.value })}
              className={inputCls}
            >
              {Object.entries(BANK_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Валют</label>
            <select
              name="currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
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
            <label className={labelCls}>Харилцах GL данс</label>
            <select
              name="gl_code"
              value={form.gl_code}
              onChange={(e) => setForm({ ...form, gl_code: e.target.value })}
              className={inputCls}
            >
              <option value="">— сонгох —</option>
              {glOptions.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.code} — {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Компани</label>
            <input
              name="company"
              list="company-options"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Түмэн Тээх"
              className={inputCls}
            />
            <datalist id="company-options">
              {companyOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Харагдах нэр</label>
            <input
              name="label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="ТДБ — 411099344"
              className={inputCls}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {pending ? "Хадгалж байна…" : form.id ? "Хадгалах" : "Нэмэх"}
          </button>
          {form.id ? (
            <button
              type="button"
              onClick={() => setForm(EMPTY)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Болих
            </button>
          ) : null}
        </div>
        <p className="text-xs text-zinc-400">
          Файлын нэрэнд дансны дугаар агуулагдсан байх ёстой (ж: ST_
          <b>411099344</b>_9944.XLS). ТДБ-ийн «wide» болон «компакт» формат
          хоёуланг автоматаар таньна.
        </p>
      </form>

      {/* Жагсаалт */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-2">Дансны дугаар</th>
              <th className="px-4 py-2">Банк</th>
              <th className="px-4 py-2">Компани</th>
              <th className="px-4 py-2">Валют</th>
              <th className="px-4 py-2">GL данс</th>
              <th className="px-4 py-2">Нэр</th>
              <th className="px-4 py-2 text-right">Үйлдэл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-400">
                  Данс бүртгээгүй байна. Дээрх формоор нэмнэ үү.
                </td>
              </tr>
            ) : (
              accounts.map((a) => (
                <tr key={a.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-2 font-mono text-xs text-zinc-700">{a.account_no}</td>
                  <td className="px-4 py-2 text-zinc-700">{BANK_LABEL[a.bank_type] ?? a.bank_type}</td>
                  <td className="px-4 py-2 text-zinc-600">{a.company ?? "—"}</td>
                  <td className="px-4 py-2 text-zinc-600">{a.currency}</td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500">{a.gl_code ?? "—"}</td>
                  <td className="px-4 py-2 text-zinc-700">{a.label}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => edit(a)}
                      className="mr-1 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Засах
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(a)}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Устгах
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
