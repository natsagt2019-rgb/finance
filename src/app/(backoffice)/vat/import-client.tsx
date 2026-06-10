"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";

import {
  previewVatImport,
  commitVatImport,
  type VatPreviewRow,
  type VatFileResult,
} from "./actions";

type EditableRow = VatPreviewRow & { include: boolean };

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

const FORMAT_LABEL: Record<VatFileResult["format"], string> = {
  "portal-parent": "Портал (нэхэмжлэх)",
  "portal-flat": "Портал (гүйлгээ)",
  template: "Загвар",
};

export function VatImportClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [files, setFiles] = useState<VatFileResult[]>([]);
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
        const result = await previewVatImport(formData);
        setFiles(result.files);
        setRows(result.rows.map((r) => ({ ...r, include: !r.isDuplicate })));
        if (result.rows.length === 0) {
          setMessage("Файлаас НӨАТ баримт олдсонгүй.");
        } else if (result.rows.every((r) => r.isDuplicate)) {
          setMessage("Бүх баримт аль хэдийн орсон байна (давхардал).");
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
        const result = await commitVatImport(selected);
        setMessage(
          `Амжилттай: ${result.added} баримт нэмэгдлээ` +
            (result.matched > 0 ? `, ${result.matched} харилцагч тулгалаа` : "") +
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
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/vat" className="hover:text-zinc-700 hover:underline">
          НӨАТ бүртгэл
        </Link>
        <span>›</span>
        <span className="text-zinc-700">Excel оруулах</span>
      </div>

      {/* Файл сонгох */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">
          eBarimt Excel оруулах
        </h2>
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <strong>Автомат формат таних:</strong>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>
              <strong>ebarimt.mn</strong> порталаас татсан Excel-ийг шууд оруулна.
            </li>
            <li>
              Загвар формат: A=Огноо, B=Төрөл(in/out), C=ДДТД, D=Нэхэмж №,
              E=Харилцагч, F=Регистр, G=НӨАТ-гүй, H=НӨАТ, I=Нийт
            </li>
            <li>ДДТД-аар давхардлыг автоматаар хасна.</li>
          </ul>
        </div>

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

        {files.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {files.map((f, i) => (
              <li key={i} className={f.error ? "text-red-600" : "text-zinc-600"}>
                <span className="font-medium">{f.filename}</span>
                {f.error
                  ? ` — ${f.error}`
                  : ` — ${FORMAT_LABEL[f.format]} · ${f.count} баримт` +
                    (f.duplicates > 0 ? ` (${f.duplicates} давхардал)` : "") +
                    (f.skipped > 0 ? ` · ${f.skipped} алгассан` : "")}
              </li>
            ))}
          </ul>
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
              <Link href="/vat" className="font-medium underline">
                Бүртгэл рүү очих
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
              <h2 className="text-sm font-semibold text-zinc-900">
                Урьдчилан харах
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Нийт {rows.length} баримт · {newCount} шинэ
                {dupCount > 0 ? ` · ${dupCount} давхардал (хасагдсан)` : ""} ·{" "}
                {includedCount} сонгогдсон.
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
                  <th className="px-3 py-2">Төрөл</th>
                  <th className="px-3 py-2">ДДТД</th>
                  <th className="px-3 py-2">Харилцагч</th>
                  <th className="px-3 py-2">ТТД</th>
                  <th className="px-3 py-2 text-right">Нийт</th>
                  <th className="px-3 py-2 text-right">НӨАТ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={`${row.isDuplicate ? "bg-amber-50" : ""} ${
                      row.include ? "" : "opacity-50"
                    }`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={row.include}
                        onChange={(e) =>
                          updateRow(i, { include: e.target.checked })
                        }
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600">
                      {row.date}
                      {row.isDuplicate && (
                        <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                          давхардал
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.type === "out" ? (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          Борлуулалт
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          Худ.авалт
                        </span>
                      )}
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-2 font-mono text-xs text-zinc-400">
                      {row.ddtd ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {row.partner_name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-500">
                      {row.partner_register ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-zinc-700">
                      {fmt(row.total_amount)}₮
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-blue-600">
                      {fmt(row.vat_amount)}₮
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
