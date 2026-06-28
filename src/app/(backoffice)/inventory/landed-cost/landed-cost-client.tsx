"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { fmt, fmtQty } from "@/lib/inventory-calc";
import { PrintButton } from "@/components/print-button";
import { postLandedImport, type LandedPostResult } from "./actions";

export type PickItem = {
  id: number;
  sku: string | null;
  name: string;
  category_code: string;
  unit: string;
};
export type AccountOpt = { id: number; code: string; name: string };

type Line = { key: number; itemId: number; qty: number; fobUnit: number };

const todayISO = () => new Date().toISOString().slice(0, 10);
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function LandedCostClient({
  items,
  accounts,
}: {
  items: PickItem[];
  accounts: AccountOpt[];
}) {
  const router = useRouter();
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const [date, setDate] = useState(todayISO());
  const [docNo, setDocNo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [company, setCompany] = useState("");
  const [currency, setCurrency] = useState("CNY");
  const [rate, setRate] = useState(490);
  const [dutyPct, setDutyPct] = useState(5);
  const [freight, setFreight] = useState(0);
  const [storage, setStorage] = useState(0);
  const [vatPct, setVatPct] = useState(10);
  const [allocBy, setAllocBy] = useState<"value" | "qty">("value");
  const [bank, setBank] = useState(accounts.find((a) => a.code === "110200")?.id?.toString() ?? "");

  const [lines, setLines] = useState<Line[]>([{ key: 1, itemId: 0, qty: 0, fobUnit: 0 }]);
  const [result, setResult] = useState<LandedPostResult | null>(null);
  const [pending, start] = useTransition();

  function setLine(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((ls) => [...ls, { key: (ls.at(-1)?.key ?? 0) + 1, itemId: 0, qty: 0, fobUnit: 0 }]);
  }
  function removeLine(key: number) {
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));
  }

  // ── Тооцоо (landed cost allocation) ──
  const calc = useMemo(() => {
    const valid = lines.filter((l) => l.itemId > 0 && l.qty > 0);
    const fobMntOf = (l: Line) => r2(l.qty * l.fobUnit * rate);
    const fobMntTotal = r2(valid.reduce((s, l) => s + fobMntOf(l), 0));
    const qtyTotal = valid.reduce((s, l) => s + l.qty, 0);
    const dutyTotal = r2(fobMntTotal * (dutyPct / 100));
    const base = (l: Line) => (allocBy === "qty" ? l.qty : fobMntOf(l));
    const baseTotal = allocBy === "qty" ? qtyTotal : fobMntTotal;

    let accFreight = 0;
    let accStorage = 0;
    const rows = valid.map((l, idx) => {
      const it = itemById.get(l.itemId)!;
      const fobMnt = fobMntOf(l);
      const duty = r2(fobMnt * (dutyPct / 100));
      const last = idx === valid.length - 1;
      const frShare = last
        ? r2(freight - accFreight)
        : baseTotal > 0
          ? r2(freight * (base(l) / baseTotal))
          : 0;
      const stShare = last
        ? r2(storage - accStorage)
        : baseTotal > 0
          ? r2(storage * (base(l) / baseTotal))
          : 0;
      if (!last) {
        accFreight = r2(accFreight + frShare);
        accStorage = r2(accStorage + stShare);
      }
      const landed = r2(fobMnt + duty + frShare + stShare);
      const landedUnit = l.qty > 0 ? r2(landed / l.qty) : 0;
      const landedAdj = r2(l.qty * landedUnit); // = total_cost (post-той ижил)
      return {
        line: l, it, fobMnt, duty, freight: frShare, storage: stShare,
        landed: landedAdj, landedUnit,
      };
    });
    const landedTotal = r2(rows.reduce((s, r) => s + r.landed, 0));
    const importVat = r2((fobMntTotal + dutyTotal) * (vatPct / 100));
    const addlTotal = r2(dutyTotal + freight + storage);
    return { rows, fobMntTotal, dutyTotal, freight, storage, importVat, landedTotal, addlTotal, qtyTotal };
  }, [lines, rate, dutyPct, freight, storage, vatPct, allocBy, itemById]);

  function post() {
    if (calc.rows.length === 0) {
      setResult({ ok: false, error: "Бараа + тоо хэмжээ оруулна уу." });
      return;
    }
    if (!bank) {
      setResult({ ok: false, error: "Төлбөрийн данс (банк/касс) сонгоно уу." });
      return;
    }
    setResult(null);
    start(async () => {
      const res = await postLandedImport({
        date,
        docNo,
        supplier: supplier.trim() || null,
        company: company.trim() || null,
        bankAccountId: Number(bank),
        fobMnt: calc.fobMntTotal,
        importVat: calc.importVat,
        lines: calc.rows.map((r) => ({
          itemId: r.line.itemId,
          categoryCode: r.it.category_code,
          qty: r.line.qty,
          landedUnit: r.landedUnit,
          landed: r.landed,
        })),
      });
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  const inputCls =
    "rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";
  const numCls = inputCls + " text-right tabular-nums w-full";
  const markup = calc.fobMntTotal > 0 ? ((calc.landedTotal / calc.fobMntTotal - 1) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* ── Толгой ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 print:hidden">
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Огноо</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Мэдүүлгийн дугаар</span>
          <input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder="ГААЛЬ-… (авто)" className={inputCls} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Нийлүүлэгч</span>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Хятад нийлүүлэгч" className={inputCls} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Компани (заавал биш)</span>
          <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} /></label>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 print:hidden">
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Валют</span>
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Ханш (₮ / {currency})</span>
          <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value) || 0)} className={numCls} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Гаалийн татвар (%)</span>
          <input type="number" value={dutyPct} onChange={(e) => setDutyPct(Number(e.target.value) || 0)} className={numCls} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Импортын НӨАТ (%)</span>
          <input type="number" value={vatPct} onChange={(e) => setVatPct(Number(e.target.value) || 0)} className={numCls} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Тээвэр (₮ нийт)</span>
          <input type="number" value={freight} onChange={(e) => setFreight(Number(e.target.value) || 0)} className={numCls} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Хадгалалт (₮ нийт)</span>
          <input type="number" value={storage} onChange={(e) => setStorage(Number(e.target.value) || 0)} className={numCls} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Хувиарлах арга</span>
          <select value={allocBy} onChange={(e) => setAllocBy(e.target.value as "value" | "qty")} className={inputCls}>
            <option value="value">Үнийн дүнгээр</option>
            <option value="qty">Тоо хэмжээгээр</option>
          </select></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Төлбөрийн данс (банк/касс)</span>
          <select value={bank} onChange={(e) => setBank(e.target.value)} className={inputCls}>
            <option value="">— данс —</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select></label>
      </div>

      {/* ── Мөр оруулах ── */}
      <div className="rounded-xl border border-zinc-200 print:hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-2 py-2 text-left">Бараа</th>
              <th className="px-2 py-2 text-right">Тоо хэмжээ</th>
              <th className="px-2 py-2 text-right">FOB нэгж үнэ ({currency})</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key} className="border-t border-zinc-100">
                <td className="px-2 py-1.5">
                  <select value={l.itemId} onChange={(e) => setLine(l.key, { itemId: Number(e.target.value) })} className={inputCls + " w-full"}>
                    <option value={0}>— бараа сонгох —</option>
                    {items.map((i) => <option key={i.id} value={i.id}>{i.sku ? i.sku + " · " : ""}{i.name}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5 w-32"><input type="number" value={l.qty || ""} onChange={(e) => setLine(l.key, { qty: Number(e.target.value) || 0 })} className={numCls} /></td>
                <td className="px-2 py-1.5 w-36"><input type="number" value={l.fobUnit || ""} onChange={(e) => setLine(l.key, { fobUnit: Number(e.target.value) || 0 })} className={numCls} /></td>
                <td className="px-2 py-1.5 w-10 text-center">
                  <button type="button" onClick={() => removeLine(l.key)} className="text-red-500 hover:text-red-700">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-zinc-100 p-2">
          <button type="button" onClick={addLine} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">+ Мөр нэмэх</button>
        </div>
      </div>

      {/* ── ТАЙЛАН: тооцооны хүснэгт ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 print:border-0 print:p-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900">Гаалийн өртөг тооцооны тайлан {docNo ? `№${docNo}` : ""}</h2>
          <div className="print:hidden"><PrintButton /></div>
        </div>
        <p className="mb-2 hidden text-sm text-zinc-600 print:block">
          Огноо: {date} · Нийлүүлэгч: {supplier || "—"} · Ханш: {fmt(rate)}₮/{currency} · Гааль {dutyPct}%
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-zinc-100 text-zinc-600">
              <tr>
                <th className="border border-zinc-300 px-2 py-1.5 text-left">Бараа</th>
                <th className="border border-zinc-300 px-2 py-1.5 text-right">Тоо</th>
                <th className="border border-zinc-300 px-2 py-1.5 text-right">FOB ({currency})</th>
                <th className="border border-zinc-300 px-2 py-1.5 text-right">FOB (₮)</th>
                <th className="border border-zinc-300 px-2 py-1.5 text-right">Гааль</th>
                <th className="border border-zinc-300 px-2 py-1.5 text-right">Тээвэр</th>
                <th className="border border-zinc-300 px-2 py-1.5 text-right">Хадгалалт</th>
                <th className="border border-zinc-300 px-2 py-1.5 text-right">Landed нэгж</th>
                <th className="border border-zinc-300 px-2 py-1.5 text-right">Landed нийт</th>
              </tr>
            </thead>
            <tbody>
              {calc.rows.length === 0 ? (
                <tr><td colSpan={9} className="border border-zinc-300 px-2 py-4 text-center text-zinc-400">Бараа + тоо хэмжээ + FOB үнэ оруулна уу.</td></tr>
              ) : calc.rows.map((r) => (
                <tr key={r.line.key} className="text-right">
                  <td className="border border-zinc-300 px-2 py-1 text-left">{r.it.sku ? <span className="font-mono text-zinc-400">{r.it.sku} </span> : ""}{r.it.name}</td>
                  <td className="border border-zinc-300 px-2 py-1 tabular-nums">{fmtQty(r.line.qty)}</td>
                  <td className="border border-zinc-300 px-2 py-1 tabular-nums">{fmt(r.line.qty * r.line.fobUnit)}</td>
                  <td className="border border-zinc-300 px-2 py-1 tabular-nums">{fmt(r.fobMnt)}</td>
                  <td className="border border-zinc-300 px-2 py-1 tabular-nums">{fmt(r.duty)}</td>
                  <td className="border border-zinc-300 px-2 py-1 tabular-nums">{fmt(r.freight)}</td>
                  <td className="border border-zinc-300 px-2 py-1 tabular-nums">{fmt(r.storage)}</td>
                  <td className="border border-zinc-300 px-2 py-1 tabular-nums font-medium">{fmt(r.landedUnit)}</td>
                  <td className="border border-zinc-300 px-2 py-1 tabular-nums font-medium">{fmt(r.landed)}</td>
                </tr>
              ))}
            </tbody>
            {calc.rows.length > 0 && (
              <tfoot>
                <tr className="bg-zinc-50 text-right font-semibold">
                  <td className="border border-zinc-300 px-2 py-1.5 text-left">Дүн</td>
                  <td className="border border-zinc-300 px-2 py-1.5 tabular-nums">{fmtQty(calc.qtyTotal)}</td>
                  <td className="border border-zinc-300 px-2 py-1.5"></td>
                  <td className="border border-zinc-300 px-2 py-1.5 tabular-nums">{fmt(calc.fobMntTotal)}</td>
                  <td className="border border-zinc-300 px-2 py-1.5 tabular-nums">{fmt(calc.dutyTotal)}</td>
                  <td className="border border-zinc-300 px-2 py-1.5 tabular-nums">{fmt(calc.freight)}</td>
                  <td className="border border-zinc-300 px-2 py-1.5 tabular-nums">{fmt(calc.storage)}</td>
                  <td className="border border-zinc-300 px-2 py-1.5"></td>
                  <td className="border border-zinc-300 px-2 py-1.5 tabular-nums">{fmt(calc.landedTotal)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Дүгнэлт */}
        {calc.rows.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Stat label={`FOB (${currency}→₮)`} value={fmt(calc.fobMntTotal)} />
            <Stat label="Нэмэлт өртөг (гааль+тээвэр+хадгалалт)" value={fmt(calc.addlTotal)} />
            <Stat label={`Landed нийт (+${markup}%)`} value={fmt(calc.landedTotal)} strong />
            <Stat label="Импортын НӨАТ (нөхөгдөх)" value={fmt(calc.importVat)} />
          </div>
        )}
      </div>

      {/* ── Орлогод авах ── */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <button type="button" disabled={pending} onClick={post}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40">
          {pending ? "Хадгалж байна…" : "✓ Орлогод авах + журнал бичих"}
        </button>
        <span className="text-xs text-zinc-500">Бараа бүрт landed нэгж өртгөөр орлого + нэг гаалийн ваучер бичигдэнэ.</span>
      </div>

      {result && (
        <div className={`rounded-xl border px-5 py-4 text-sm ${result.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          {result.ok ? (
            <div className="space-y-2">
              <p className="font-medium">✓ {result.inserted} бараа орлогод авлаа. Баримт: <span className="font-mono">{result.docNo}</span></p>
              <Link href={`/inventory/document/bm-2?doc=${encodeURIComponent(result.docNo)}`}
                className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                🖨 Орлогын баримт хэвлэх (БМ-2)
              </Link>
            </div>
          ) : <p>{result.error}</p>}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className={`tabular-nums ${strong ? "text-base font-bold text-zinc-900" : "font-medium text-zinc-700"}`}>{value}₮</p>
    </div>
  );
}
