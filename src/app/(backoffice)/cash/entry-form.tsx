"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { fmt, CASH_TYPE_LABELS } from "@/lib/cash-calc";
import { createEntry, type EntryInput } from "./actions";
import {
  COMPANIES,
  type AccountOption,
  type CashType,
  type PartnerOption,
  type RegisterRow,
} from "./types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

export function EntryForm({
  initialType,
  registers,
  accounts,
  partners,
  today,
}: {
  initialType: CashType;
  registers: RegisterRow[];
  accounts: AccountOption[];
  partners: PartnerOption[];
  today: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<CashType>(initialType);
  const [registerId, setRegisterId] = useState<number>(registers[0]?.id ?? 0);
  const [amount, setAmount] = useState<string>("");
  const [rate, setRate] = useState<string>("1");
  const [partnerId, setPartnerId] = useState<string>("");
  const [counterId, setCounterId] = useState<string>("");
  const [docNo, setDocNo] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [company, setCompany] = useState<string>("");
  const [date, setDate] = useState<string>(today);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentReg = registers.find((r) => r.id === registerId);
  const isForeign = (currentReg?.currency ?? "MNT") !== "MNT";

  const amountMnt = useMemo(() => {
    const a = Number(amount) || 0;
    const r = isForeign ? Number(rate) || 0 : 1;
    return a * r;
  }, [amount, rate, isForeign]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!registerId) {
      setError("Касс сонгоно уу.");
      return;
    }
    const input: EntryInput = {
      date,
      type,
      register_id: registerId,
      amount: Number(amount) || 0,
      rate: isForeign ? Number(rate) || 1 : 1,
      partner_id: partnerId ? Number(partnerId) : null,
      counter_account_id: counterId ? Number(counterId) : null,
      doc_no: docNo || null,
      description: description || null,
      company: company || null,
    };
    startTransition(async () => {
      const res = await createEntry(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/cash?tab=entries");
      router.refresh();
    });
  }

  if (registers.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Касс бүртгэгдээгүй байна. Эхлээд «Касс» табаас касс нэмнэ үү.
      </div>
    );
  }

  const counterLabel =
    type === "in"
      ? "Орлогын нөгөө тал (Кт — орлого / авлага барагдуулалт)"
      : "Зарлагын нөгөө тал (Дт — зардал / өглөг төлөлт)";

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Баримтын төрөл</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CashType)}
            className={inputCls}
          >
            {(["in", "out"] as CashType[]).map((t) => (
              <option key={t} value={t}>
                {CASH_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Огноо</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Касс</label>
          <select
            value={registerId}
            onChange={(e) => setRegisterId(Number(e.target.value))}
            className={inputCls}
          >
            {registers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.currency}){r.company ? ` — ${r.company}` : ""}
              </option>
            ))}
          </select>
          {currentReg && currentReg.account_id == null && (
            <p className="mt-1 text-xs text-amber-600">
              Энэ касст бэлэн мөнгөний данс сонгоогүй — журнал бичигдэхгүй. «Касс»
              табаас данс холбоно уу.
            </p>
          )}
        </div>

        <div>
          <label className={labelCls}>
            Дүн ({currentReg?.currency ?? "MNT"})
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputCls} text-right tabular-nums`}
          />
        </div>

        {isForeign && (
          <div>
            <label className={labelCls}>Ханш (→ ₮)</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className={`${inputCls} text-right tabular-nums`}
            />
            <p className="mt-1 text-xs text-zinc-400">
              MNT дүн: {fmt(amountMnt)}₮
            </p>
          </div>
        )}

        <div>
          <label className={labelCls}>Харилцагч</label>
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            className={inputCls}
          >
            <option value="">— сонгох —</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>{counterLabel}</label>
          <select
            value={counterId}
            onChange={(e) => setCounterId(e.target.value)}
            className={inputCls}
          >
            <option value="">— тохиргооны анхдагч —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-400">
            Хоосон бол Тохиргоо табын анхдагч данс хэрэглэнэ.
          </p>
        </div>

        <div>
          <label className={labelCls}>Баримтын дугаар</label>
          <input
            type="text"
            value={docNo}
            onChange={(e) => setDocNo(e.target.value)}
            placeholder={type === "in" ? "КО-001" : "КЗ-001"}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Компани</label>
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
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

        <div className="sm:col-span-2">
          <label className={labelCls}>Гүйлгээний утга</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="бэлэн борлуулалт, тасалбар, бэлэн зардал гэх мэт"
            className={inputCls}
          />
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
          {isPending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
        <Link
          href="/cash?tab=entries"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Болих
        </Link>
      </div>
    </form>
  );
}
