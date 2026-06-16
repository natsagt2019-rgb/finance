"use client";

import { useMemo, useState, useTransition } from "react";
import { mergePartnerName } from "./actions";

export type NameRow = {
  partner_name: string;
  entries: number;
  total: number;
  matched: boolean;
};

const f = (n: number) =>
  n ? Math.round(n).toLocaleString("en-US") : "0";

export function MergeClient({
  rows,
  partnerNames,
}: {
  rows: NameRow[];
  partnerNames: string[];
}) {
  const [q, setQ] = useState("");
  const [onlyUnmatched, setOnlyUnmatched] = useState(true);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (done.has(r.partner_name)) return false;
      if (onlyUnmatched && r.matched) return false;
      if (term && !r.partner_name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [rows, q, onlyUnmatched, done]);

  const doMerge = (from: string) => {
    const to = (targets[from] ?? "").trim();
    if (!to) {
      setMsg({ ok: false, text: "Зорилтот харилцагчийг сонгоно уу." });
      return;
    }
    setBusy(from);
    start(async () => {
      const r = await mergePartnerName(from, to);
      setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
      if (r.ok) setDone((p) => new Set(p).add(from));
      setBusy(null);
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Нэр хайх…"
          className="w-64 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={onlyUnmatched}
            onChange={(e) => setOnlyUnmatched(e.target.checked)}
          />
          Зөвхөн таараагүй
        </label>
        <span className="text-sm text-zinc-400">{shown.length} нэр</span>
      </div>

      {msg && (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <datalist id="merge-partner-list">
        {partnerNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-2">Журналын нэр</th>
              <th className="px-4 py-2 text-right">Бичилт</th>
              <th className="px-4 py-2 text-right">Нийт дүн</th>
              <th className="px-4 py-2">Төлөв</th>
              <th className="px-4 py-2">Нэгтгэх → харилцагч</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {shown.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-400">
                  Нэр алга.
                </td>
              </tr>
            ) : (
              shown.map((r) => (
                <tr key={r.partner_name} className="hover:bg-zinc-50">
                  <td className="px-4 py-1.5 text-zinc-800">{r.partner_name}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-zinc-500">{r.entries}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-zinc-600">{f(r.total)}</td>
                  <td className="px-4 py-1.5">
                    {r.matched ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">таарсан</span>
                    ) : (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">таараагүй</span>
                    )}
                  </td>
                  <td className="px-4 py-1.5">
                    <input
                      list="merge-partner-list"
                      value={targets[r.partner_name] ?? ""}
                      onChange={(e) =>
                        setTargets((p) => ({ ...p, [r.partner_name]: e.target.value }))
                      }
                      placeholder="харилцагч сонгох…"
                      className="w-64 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </td>
                  <td className="px-4 py-1.5">
                    <button
                      onClick={() => doMerge(r.partner_name)}
                      disabled={pending && busy === r.partner_name}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {pending && busy === r.partner_name ? "…" : "Нэгтгэх"}
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
