"use client";

import { useRef, useState, useTransition } from "react";

import {
  CATEGORY_CODES,
  INCOME_CODES,
  EXPENSE_CODES,
} from "@/lib/bank-importer";
import {
  previewImport,
  commitImport,
  type PreviewRow,
  type FileResult,
} from "./actions";

type EditableRow = PreviewRow & { include: boolean };

function fmtMoney(n: number | null): string {
  if (n == null) return "";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function ImportClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [files, setFiles] = useState<FileResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committed, setCommitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const includedCount = rows.filter((r) => r.include).length;
  const newCount = rows.filter((r) => !r.isDuplicate).length;
  const dupCount = rows.length - newCount;

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
    for (const file of Array.from(input.files)) {
      formData.append("files", file);
    }

    startTransition(async () => {
      try {
        const result = await previewImport(formData);
        setFiles(result.files);
        // Давхардсан мөрийг анхдагчаар хасна (зөвхөн шинэ нь сонгогдоно).
        setRows(result.rows.map((r) => ({ ...r, include: !r.isDuplicate })));
        if (result.rows.length === 0) {
          setMessage("Файлаас гүйлгээ олдсонгүй.");
        } else if (result.rows.every((r) => r.isDuplicate)) {
          setMessage("Бүх гүйлгээ аль хэдийн орсон байна (давхардал). Шинэ гүйлгээ алга.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Уншихад алдаа гарлаа.");
      }
    });
  }

  function handleCommit() {
    const selected = rows.filter((r) => r.include);
    if (selected.length === 0) {
      setError("Батлах мөр сонгогдоогүй байна.");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        // EditableRow нь PreviewRow-г бүрэн агуулна; нэмэлт `include` талбарыг
        // commitImport үл хэрэгсэнэ (зөвхөн DB баганыг сонгож авдаг).
        const result = await commitImport(selected);
        setMessage(
          `Амжилттай: ${result.added} мөр нэмэгдлээ` +
            (result.skipped > 0 ? `, ${result.skipped} давхардал алгаслаа.` : "."),
        );
        setRows([]);
        setFiles([]);
        setCommitted(true);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (e) {
        setError(e instanceof Error ? e.message : "Хадгалахад алдаа гарлаа.");
      }
    });
  }

  function updateRow(index: number, patch: Partial<EditableRow>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }

  function handleCodeChange(index: number, row: EditableRow, code: string) {
    if (row.income != null) {
      updateRow(index, { income_code: code || null });
    } else {
      updateRow(index, { expense_code: code || null });
    }
  }

  return (
    <div className="space-y-6">
      {/* Файл сонгох хэсэг */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Хуулга оруулах</h2>
        <p className="mt-1 text-sm text-zinc-500">
          ТДБ, Голомт, М банкны хуулга файлуудыг сонгоно уу (.xls / .xlsx). Банк
          нь файлын нэрэн дэх дансны дугаараар автоматаар танигдана.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
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

        {/* Файл бүрийн үр дүн */}
        {files.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {files.map((f, i) => (
              <li
                key={i}
                className={f.error ? "text-red-600" : "text-zinc-600"}
              >
                <span className="font-medium">{f.filename}</span>
                {f.error
                  ? ` — ${f.error}`
                  : ` — ${f.account_id} · ${f.count} мөр` +
                    (f.duplicates > 0 ? ` (${f.duplicates} давхардал)` : "")}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Мессеж / алдаа */}
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
        </div>
      )}

      {/* Урьдчилан харах хүснэгт */}
      {rows.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Урьдчилан харах
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Нийт {rows.length} мөр · {newCount} шинэ
                {dupCount > 0 ? ` · ${dupCount} давхардал (хасагдсан)` : ""} ·{" "}
                {includedCount} сонгогдсон. Ангилал, харилцагчийг засаад «Батлах»
                дарна уу.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCommit}
              disabled={isPending || includedCount === 0}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? "Хадгалж байна…" : `Батлах (${includedCount})`}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="w-10 px-3 py-2"></th>
                  <th className="px-3 py-2">Огноо</th>
                  <th className="px-3 py-2">Банк</th>
                  <th className="px-3 py-2">Гүйлгээний утга</th>
                  <th className="px-3 py-2">Харилцагч</th>
                  <th className="px-3 py-2 text-right">Орлого</th>
                  <th className="px-3 py-2 text-right">Зарлага</th>
                  <th className="px-3 py-2">Ангилал</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row, i) => {
                  const codes = row.income != null ? INCOME_CODES : EXPENSE_CODES;
                  const currentCode =
                    (row.income != null ? row.income_code : row.expense_code) ?? "";
                  return (
                    <tr
                      key={i}
                      className={`${row.isDuplicate ? "bg-amber-50" : ""} ${
                        row.include ? "" : "opacity-50"
                      }`}
                    >
                      <td className="px-3 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={(e) =>
                            updateRow(i, { include: e.target.checked })
                          }
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-top text-zinc-600">
                        {fmtDate(row.txn_date)}
                        {row.isDuplicate && (
                          <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                            давхардал
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-top text-zinc-500">
                        {row.bank}
                      </td>
                      <td className="max-w-xs px-3 py-2 align-top text-zinc-700">
                        <span title={row.description}>{row.description}</span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="text"
                          value={row.counterparty}
                          onChange={(e) =>
                            updateRow(i, { counterparty: e.target.value })
                          }
                          className="w-40 rounded border border-zinc-200 px-2 py-1 text-sm focus:border-zinc-400 focus:outline-none"
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right align-top tabular-nums text-green-700">
                        {fmtMoney(row.income)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right align-top tabular-nums text-red-700">
                        {fmtMoney(row.expense)}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <select
                          value={currentCode}
                          onChange={(e) =>
                            handleCodeChange(i, row, e.target.value)
                          }
                          className="w-56 rounded border border-zinc-200 px-2 py-1 text-sm focus:border-zinc-400 focus:outline-none"
                        >
                          <option value="">— ангилаагүй —</option>
                          {codes.map((code) => (
                            <option key={code} value={code}>
                              {code} — {CATEGORY_CODES[code]}
                            </option>
                          ))}
                        </select>
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
