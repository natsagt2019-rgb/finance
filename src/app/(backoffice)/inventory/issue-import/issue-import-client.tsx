"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { AccountOption } from "../types";
import { importIssues, type IssueImportResult } from "./actions";

const todayISO = () => new Date().toISOString().slice(0, 10);

export function IssueImportClient({
  accounts,
  defaultCounter,
}: {
  accounts: AccountOption[];
  defaultCounter: number | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(todayISO());
  const [docNo, setDocNo] = useState("");
  const [counter, setCounter] = useState(defaultCounter ? String(defaultCounter) : "");
  const [company, setCompany] = useState("");
  const [result, setResult] = useState<IssueImportResult | null>(null);
  const [pending, start] = useTransition();

  const inputCls =
    "rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

  function pick() {
    if (!counter) {
      setResult({ ok: false, error: "Эхлээд зарлагын данс сонгоно уу." });
      return;
    }
    fileRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("date", date);
    fd.append("doc_no", docNo);
    fd.append("counter_account_id", counter);
    fd.append("company", company);
    setResult(null);
    start(async () => {
      const res = await importIssues(fd);
      setResult(res);
      if (res.ok) router.refresh();
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">Огноо</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">Баримтын дугаар (хоосон бол автоматаар)</span>
          <input
            type="text"
            value={docNo}
            onChange={(e) => setDocNo(e.target.value)}
            placeholder="ЗАР-…"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">Зарлагын данс (зардал / харьцах) *</span>
          <select value={counter} onChange={(e) => setCounter(e.target.value)} className={inputCls}>
            <option value="">— данс сонгох —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">Компани (заавал биш)</span>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Бүх компани"
            className={inputCls}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href="/inventory/issue-import/template"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          ↓ Excel загвар татах
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={pick}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          {pending ? "Уншиж байна…" : "↥ Excel-ээс зарлага оруулах"}
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onFile} className="hidden" />
      </div>

      {result && (
        <div
          className={`rounded-xl border px-5 py-4 text-sm ${
            result.ok
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {result.ok ? (
            <div className="space-y-2">
              <p className="font-medium">
                ✓ {result.inserted} зарлага бичигдлээ. Баримтын дугаар:{" "}
                <span className="font-mono">{result.docNo}</span>
              </p>
              {result.inserted > 0 && (
                <Link
                  href={`/inventory/document/bm-3?doc=${encodeURIComponent(result.docNo)}`}
                  className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  🖨 Зарлагын баримт хэвлэх (БМ-3)
                </Link>
              )}
              {result.errors.length > 0 && (
                <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
                  <p className="font-medium">Алгассан мөр ({result.errors.length}):</p>
                  <ul className="mt-1 list-disc pl-5">
                    {result.errors.slice(0, 30).map((er, i) => (
                      <li key={i}>{er}</li>
                    ))}
                    {result.errors.length > 30 && <li>… бусад {result.errors.length - 30}</li>}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p>{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
