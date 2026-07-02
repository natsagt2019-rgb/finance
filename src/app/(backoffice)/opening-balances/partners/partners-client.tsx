"use client";

import { useMemo, useState, useTransition } from "react";
import { savePartnerOpening, type PartnerOpenRow } from "./actions";

export type AcctOpt = { code: string; name: string };

function parseNum(s: string): number {
  // Таслал/зай/валютын тэмдэг хасна. Нягтлан бодох сөрөг тэмдэглэгээ (123.45)
  // болон хасах тэмдэг (-123.45) хоёуланг сөрөг гэж ойлгоно.
  let str = String(s ?? "").trim().replace(/[,\s₮]/g, "");
  let sign = 1;
  const paren = /^\((.*)\)$/.exec(str);
  if (paren) {
    sign = -1;
    str = paren[1];
  }
  const n = Number(str);
  return Number.isFinite(n) ? n * sign : 0;
}
function fmt(n: number): string {
  if (!n) return "0";
  return Math.round(n).toLocaleString("en-US");
}

export function PartnersClient({
  partners,
  arOptions,
  apOptions,
  defaultAr,
  defaultAp,
  initial,
  year,
}: {
  partners: { id: number; name: string }[];
  arOptions: AcctOpt[];
  apOptions: AcctOpt[];
  defaultAr: string;
  defaultAp: string;
  initial: Record<string, { recv: number; pay: number }>;
  year: number;
}) {
  const [ar, setAr] = useState(defaultAr);
  const [ap, setAp] = useState(defaultAp);
  const [recv, setRecv] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(initial)) if (v.recv) m[k] = String(v.recv);
    return m;
  });
  const [pay, setPay] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(initial)) if (v.pay) m[k] = String(v.pay);
    return m;
  });
  const [q, setQ] = useState("");
  const [onlyFilled, setOnlyFilled] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const rows = useMemo(() => {
    return partners.filter((p) => {
      if (onlyFilled && !parseNum(recv[p.name] ?? "") && !parseNum(pay[p.name] ?? ""))
        return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q.toLowerCase());
    });
  }, [partners, recv, pay, q, onlyFilled]);

  const totals = useMemo(() => {
    let dr = 0;
    let cr = 0;
    for (const p of partners) {
      dr += parseNum(recv[p.name] ?? "");
      cr += parseNum(pay[p.name] ?? "");
    }
    return { dr, cr };
  }, [partners, recv, pay]);

  function save() {
    const payload: PartnerOpenRow[] = partners
      .map((p) => ({
        name: p.name,
        recv: parseNum(recv[p.name] ?? ""),
        pay: parseNum(pay[p.name] ?? ""),
      }))
      .filter((r) => r.recv !== 0 || r.pay !== 0);
    start(async () => {
      const res = await savePartnerOpening(year, ar, ap, payload);
      if (res.ok)
        setMsg({ ok: true, text: `✓ Хадгаллаа — ${res.count} бичилт (${res.date}).` });
      else setMsg({ ok: false, text: res.error });
    });
  }

  const inputCls =
    "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-900";

  if (partners.length === 0)
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
        Харилцагч бүртгэгдээгүй байна. Эхлээд «Харилцагчид» цэсэд нэмнэ үү.
      </div>
    );

  return (
    <div>
      {/* Данс сонголт */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-zinc-200 bg-white p-3 print:hidden">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Авлагын данс (Дт)
          <select value={ar} onChange={(e) => setAr(e.target.value)} className={inputCls}>
            {arOptions.length === 0 && <option value="">— олдсонгүй —</option>}
            {arOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.code} — {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Өглөгийн данс (Кт)
          <select value={ap} onChange={(e) => setAp(e.target.value)} className={inputCls}>
            {apOptions.length === 0 && <option value="">— олдсонгүй —</option>}
            {apOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.code} — {o.name}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto text-sm text-zinc-500">
          Нийт: Авлага{" "}
          <span className="font-medium text-blue-700">{fmt(totals.dr)}</span> / Өглөг{" "}
          <span className="font-medium text-purple-700">{fmt(totals.cr)}</span>
        </div>
      </div>

      {msg && (
        <div className={`mt-3 rounded-lg px-4 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 print:hidden">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Харилцагчийн нэрээр хайх…"
          className={`${inputCls} w-64`}
        />
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input type="checkbox" checked={onlyFilled} onChange={(e) => setOnlyFilled(e.target.checked)} />
          Зөвхөн үлдэгдэлтэй
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="ml-auto rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          {pending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-50 text-left text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2">Харилцагч</th>
              <th className="px-3 py-2 text-right">Авлага (Дт)</th>
              <th className="px-3 py-2 text-right">Өглөг (Кт)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((p) => {
              const hasVal = parseNum(recv[p.name] ?? "") || parseNum(pay[p.name] ?? "");
              return (
                <tr key={p.id} className={hasVal ? "bg-amber-50/30" : ""}>
                  <td className="px-3 py-1.5 text-zinc-700">{p.name}</td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      value={recv[p.name] ?? ""}
                      onChange={(e) => {
                        setRecv((m) => ({ ...m, [p.name]: e.target.value }));
                        setMsg(null);
                      }}
                      placeholder="0"
                      className="w-36 rounded border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums focus:border-zinc-900 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      value={pay[p.name] ?? ""}
                      onChange={(e) => {
                        setPay((m) => ({ ...m, [p.name]: e.target.value }));
                        setMsg(null);
                      }}
                      placeholder="0"
                      className="w-36 rounded border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums focus:border-zinc-900 focus:outline-none"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Авлага сонгосон «Авлагын данс» руу Дт, өглөг «Өглөгийн данс» руу Кт болж
        бичигдэнэ. Эдгээр нь дансны эхний үлдэгдлийн харгалзах данс (ж. 120101)-ыг
        орлоно — «Дансны» таб дээр уг дансны нийт дүнг давхар бичихгүй.
      </p>
    </div>
  );
}
