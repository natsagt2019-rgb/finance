"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";

import {
  previewTrialBalance,
  commitTrialBalance,
  type TbPreviewRow,
} from "./actions";

function fmt(n: number): string {
  if (!n) return "—";
  return Math.round(n).toLocaleString("en-US");
}

const KIND_LABEL: Record<TbPreviewRow["kind"], { label: string; cls: string }> = {
  asset: { label: "Хөрөнгө", cls: "bg-blue-100 text-blue-700" },
  liability: { label: "Өр төлбөр", cls: "bg-red-100 text-red-700" },
  equity: { label: "Өмч", cls: "bg-purple-100 text-purple-700" },
  income: { label: "Орлого", cls: "bg-green-100 text-green-700" },
  expense: { label: "Зардал", cls: "bg-orange-100 text-orange-700" },
};

export function TrialBalanceImportClient({
  defaultYear,
}: {
  defaultYear: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<TbPreviewRow[]>([]);
  const [year, setYear] = useState(defaultYear);
  const [sheet, setSheet] = useState<string>("");
  const [skipped, setSkipped] = useState(0);
  const [matched, setMatched] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committed, setCommitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const notInChart = rows.length - matched;

  function handlePreview() {
    const input = fileInputRef.current;
    if (!input?.files || input.files.length === 0) {
      setError("Эхлээд файл сонгоно уу.");
      return;
    }
    setError(null);
    setMessage(null);
    setCommitted(false);

    const formData = new FormData();
    formData.append("file", input.files[0]);

    startTransition(async () => {
      try {
        const res = await previewTrialBalance(formData);
        if (res.error) {
          setError(res.error);
          return;
        }
        setRows(res.rows);
        setSheet(res.sheet);
        setSkipped(res.skipped);
        setMatched(res.matched);
        if (res.rows.length === 0) setMessage("Файлаас данс олдсонгүй.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Уншихад алдаа гарлаа.");
      }
    });
  }

  function handleCommit() {
    if (rows.length === 0) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await commitTrialBalance(
          year,
          rows.map(({ code, name, kind, opening, closing }) => ({
            code,
            name,
            kind,
            opening,
            closing,
          })),
        );
        setMessage(`Амжилттай: ${res.year} оны ${res.added} дансны үлдэгдэл орлоо.`);
        setRows([]);
        setCommitted(true);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (e) {
        setError(e instanceof Error ? e.message : "Хадгалахад алдаа гарлаа.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/reports/balance-sheet" className="hover:text-zinc-700 hover:underline">
          Санхүүгийн тайлан
        </Link>
        <span>›</span>
        <span className="text-zinc-700">Гүйлгээ баланс оруулах</span>
      </div>

      {/* Файл сонгох */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">
          Гүйлгээ баланс (Excel) оруулах
        </h2>
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <strong>Хүлээгдэх формат (Gbalance):</strong>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>A=Код, B=Дансны нэр, C/D=Эхний Дт/Кт, E/F=Гүйлгээ Дт/Кт, G/H=Эцсийн Дт/Кт</li>
            <li>Баланс данс эцсийн үлдэгдлээр, орлого/зардал жилийн эргэлтээр бодогдоно.</li>
            <li>Сонгосон оны хуучин өгөгдөл солигдоно.</li>
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm text-zinc-600">
            Тайлант он:{" "}
            <input
              type="number"
              value={year}
              min={2000}
              max={2100}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            className="block text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700"
          />
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? "Уншиж байна…" : "Унших"}
          </button>
        </div>

        {sheet && (
          <p className="mt-3 text-sm text-zinc-500">
            Хуудас: <span className="font-medium text-zinc-700">{sheet}</span> ·{" "}
            {rows.length} данс · {matched} чартад тохирсон
            {notInChart > 0 ? ` · ${notInChart} чартад алга` : ""}
            {skipped > 0 ? ` · ${skipped} мөр алгассан` : ""}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            committed
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-zinc-200 bg-zinc-50 text-zinc-600"
          }`}
        >
          {message}
          {committed && (
            <>
              {" "}
              <Link href="/reports/balance-sheet" className="font-medium underline">
                Баланс тайлан руу очих
              </Link>
            </>
          )}
        </div>
      )}

      {/* Урьдчилан харах */}
      {rows.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Урьдчилан харах</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                {year} он · {rows.length} данс
                {notInChart > 0 ? ` · ${notInChart} нь чартад алга (тайланд орохгүй)` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCommit}
              disabled={isPending}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? "Хадгалж байна…" : `Батлах (${rows.length})`}
            </button>
          </div>

          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Код</th>
                  <th className="px-3 py-2">Нэр</th>
                  <th className="px-3 py-2">Төрөл</th>
                  <th className="px-3 py-2 text-right">Эхний үлдэгдэл</th>
                  <th className="px-3 py-2 text-right">Эцсийн / эргэлт</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row, i) => {
                  const k = KIND_LABEL[row.kind];
                  return (
                    <tr key={i} className={row.inChart ? "" : "bg-amber-50"}>
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-zinc-500">
                        {row.code}
                        {!row.inChart && (
                          <span className="ml-1 text-amber-600" title="Чартад алга">
                            ⚠
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-zinc-700">{row.name || "—"}</td>
                      <td className="px-3 py-1.5">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${k.cls}`}>
                          {k.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-zinc-600">
                        {fmt(row.opening)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-zinc-700">
                        {fmt(row.closing)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
