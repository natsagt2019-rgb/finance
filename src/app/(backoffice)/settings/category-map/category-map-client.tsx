"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCategoryMap } from "./actions";

export type AccountOpt = { code: string; name: string };
export type CatDef = { code: string; side: "credit" | "debit"; label: string; glCode: string };
export type MapRow = CatDef;
export type CompanyOpt = { code: "TT" | "TR"; name: string };

export function CategoryMapClient({
  company,
  companies,
  rows,
  accounts,
}: {
  company: string;
  companies: CompanyOpt[];
  rows: MapRow[];
  accounts: AccountOpt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  // Мөр бүрийн засаж буй утга (code → gl_code).
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.code, r.glCode])),
  );

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) m.set(a.code, a.name);
    return m;
  }, [accounts]);

  function changeCompany(code: string) {
    router.push(`/settings/category-map?company=${code}`);
  }

  function save(r: MapRow) {
    const gl = (draft[r.code] ?? "").trim();
    setMsg(null);
    start(async () => {
      const res = await saveCategoryMap(company, r.code, r.side, gl, r.label);
      if (res.ok) {
        setMsg(`✓ ${r.code} хадгаллаа${gl ? "" : " (устгав)"}.`);
        router.refresh();
      } else {
        setMsg(res.error);
      }
    });
  }

  const incomeRows = rows.filter((r) => r.side === "credit");
  const expenseRows = rows.filter((r) => r.side === "debit");

  const section = (title: string, list: MapRow[], sideLabel: string) => (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700">
        {title}
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs font-medium text-zinc-500">
          <tr>
            <th className="px-4 py-2 w-24">Ангилал</th>
            <th className="px-4 py-2">Тайлбар</th>
            <th className="px-4 py-2 w-20">{sideLabel}</th>
            <th className="px-4 py-2 w-80">GL данс</th>
            <th className="px-4 py-2 w-24"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {list.map((r) => {
            const gl = draft[r.code] ?? "";
            const dirty = gl.trim() !== (r.glCode ?? "").trim();
            return (
              <tr key={r.code} className={dirty ? "bg-amber-50/40" : ""}>
                <td className="px-4 py-2 font-mono text-xs text-zinc-600">{r.code}</td>
                <td className="px-4 py-2 text-zinc-700">{r.label}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      r.side === "credit"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {r.side === "credit" ? "Кт" : "Дт"}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <input
                    list="cat-acc-list"
                    value={gl}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [r.code]: e.target.value }))
                    }
                    placeholder="код (ж: 702701)"
                    className="w-full rounded border border-zinc-300 px-2 py-1 text-xs"
                  />
                  {gl.trim() && (
                    <span className="mt-0.5 block text-[10px] text-zinc-400">
                      {nameOf.get(gl.trim()) ?? "— тодорхойгүй код —"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    disabled={pending || !dirty}
                    onClick={() => save(r)}
                    className="rounded border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                  >
                    Хадгал
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          Компани
          <select
            value={company}
            onChange={(e) => changeCompany(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
          >
            {companies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </label>
        {msg && (
          <span
            className={`text-xs ${
              msg.startsWith("✓") ? "text-green-700" : "text-red-600"
            }`}
          >
            {msg}
          </span>
        )}
      </div>

      {section("Орлого (Кт тал)", incomeRows, "Тал")}
      {section("Зарлага (Дт тал)", expenseRows, "Тал")}

      <datalist id="cat-acc-list">
        {accounts.map((a) => (
          <option key={a.code} value={a.code}>
            {a.code} — {a.name}
          </option>
        ))}
      </datalist>
    </div>
  );
}
