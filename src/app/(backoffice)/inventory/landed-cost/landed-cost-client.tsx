"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { fmt, fmtQty } from "@/lib/inventory-calc";
import { PrintButton } from "@/components/print-button";
import {
  postLandedImport,
  postLandedAssetImport,
  getAccountBalance,
  type LandedPostResult,
  type LandedAssetPostResult,
} from "./actions";

export type PickItem = {
  id: number;
  sku: string | null;
  name: string;
  category_code: string;
  unit: string;
};
export type AccountOpt = { id: number; code: string; name: string };
export type AssetCat = { id: number; name: string; account_code: string };

// itemId — БМ горим; name/categoryId — ҮХ горим.
type Line = {
  key: number;
  itemId: number;
  name: string;
  categoryId: number;
  qty: number;
  fobUnit: number;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// Импортын валют сонголт + ойролцоо ханш (₮). Ханшийг гараар засаж болно.
const CURRENCIES: { code: string; rate: number }[] = [
  { code: "CNY", rate: 490 },
  { code: "USD", rate: 3450 },
  { code: "EUR", rate: 3750 },
  { code: "RUB", rate: 38 },
  { code: "JPY", rate: 23 },
  { code: "KRW", rate: 2.6 },
];

export function LandedCostClient({
  items,
  accounts,
  assetCats,
  defaultMode = "inv",
}: {
  items: PickItem[];
  accounts: AccountOpt[];
  assetCats: AssetCat[];
  defaultMode?: "inv" | "asset";
}) {
  const router = useRouter();
  // Орлого авах төрөл: бараа материал (inv) эсвэл үндсэн хөрөнгө (asset).
  const [mode, setMode] = useState<"inv" | "asset">(defaultMode);
  const catById = useMemo(() => new Map(assetCats.map((c) => [c.id, c])), [assetCats]);
  const fileRef = useRef<HTMLInputElement>(null);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  // Excel импортод бараа тааруулах (SKU / нэрээр).
  const lookup = useMemo(() => {
    const sku = new Map<string, PickItem>();
    const name = new Map<string, PickItem>();
    for (const i of items) {
      if (i.sku) sku.set(i.sku.trim().toLowerCase(), i);
      name.set(i.name.trim().toLowerCase(), i);
    }
    return { sku, name };
  }, [items]);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const [date, setDate] = useState(todayISO());
  const [docNo, setDocNo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [company, setCompany] = useState("");
  const [currency, setCurrency] = useState("CNY");
  const [rate, setRate] = useState(490);
  const [dutyPct, setDutyPct] = useState(5);
  const [dutyAmount, setDutyAmount] = useState(0); // > 0 бол %-ийн оронд энэ дүнг ашиглана
  const [freight, setFreight] = useState(0);
  const [storage, setStorage] = useState(0);
  const [vatPct, setVatPct] = useState(10);
  const [allocBy, setAllocBy] = useState<"value" | "qty">("value");
  const acctId = (code: string) => accounts.find((a) => a.code === code)?.id?.toString() ?? "";
  const [bank, setBank] = useState(acctId("110200"));
  // Нэмэлт зардлын эх данс — анхдагч: гааль → УТТ(140300), тээвэр/хадгалалт → УТЗ(140200).
  const [dutyAcct, setDutyAcct] = useState(acctId("140300") || acctId("110200"));
  const [freightAcct, setFreightAcct] = useState(acctId("140200") || acctId("110200"));
  const [storageAcct, setStorageAcct] = useState(acctId("140200") || acctId("110200"));
  const [pullBusy, setPullBusy] = useState("");

  const newLine = (key: number): Line => ({ key, itemId: 0, name: "", categoryId: 0, qty: 0, fobUnit: 0 });
  const [lines, setLines] = useState<Line[]>([newLine(1)]);
  const [result, setResult] = useState<LandedPostResult | LandedAssetPostResult | null>(null);
  const [pending, start] = useTransition();

  function setLine(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((ls) => [...ls, newLine((ls.at(-1)?.key ?? 0) + 1)]);
  }
  function removeLine(key: number) {
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));
  }

  // ── Нэмэлт зардлыг дансны үлдэгдлээс татах (УТЗ/УТТ) ──
  async function pull(which: "duty" | "freight" | "storage") {
    const acct = which === "duty" ? dutyAcct : which === "freight" ? freightAcct : storageAcct;
    if (!acct) { setImportMsg("✕ Эх данс сонгоно уу."); return; }
    setPullBusy(which);
    const res = await getAccountBalance(Number(acct));
    setPullBusy("");
    if (!res.ok) { setImportMsg("✕ " + res.error); return; }
    if (which === "duty") setDutyAmount(res.balance);
    else if (which === "freight") setFreight(res.balance);
    else setStorage(res.balance);
    setImportMsg(`✓ ${res.code} ${res.name}: ${fmt(res.balance)}₮ татав.`);
  }

  // ── Excel-ээс олон БМ мөр оруулах ──
  async function importExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
      const n = (v: unknown) => Number(String(v ?? "").replace(/[, ₮]/g, "")) || 0;
      const fresh: Line[] = [];
      let key = lines.at(-1)?.key ?? 0;
      let matched = 0;
      let missed = 0;
      for (let i = 1; i < grid.length; i++) {
        const row = grid[i] ?? [];
        const code = String(row[0] ?? "").trim();
        const nm = String(row[1] ?? "").trim();
        const qty = n(row[2]);
        const fob = n(row[3]);
        if (!code && !nm) continue;
        const it =
          (code && lookup.sku.get(code.toLowerCase())) ||
          (nm && lookup.name.get(nm.toLowerCase())) ||
          (code && lookup.name.get(code.toLowerCase())) ||
          null;
        if (!it) { missed++; continue; }
        fresh.push({ key: ++key, itemId: it.id, name: "", categoryId: 0, qty, fobUnit: fob });
        matched++;
      }
      if (fresh.length) {
        setLines((ls) => {
          const keep = ls.filter((l) => l.itemId > 0);
          return [...keep, ...fresh];
        });
      }
      setImportMsg(`✓ ${matched} мөр оруулав${missed ? `, ${missed} бараа олдсонгүй` : ""}.`);
    } catch {
      setImportMsg("✕ Excel уншиж чадсангүй.");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Тооцооны тайланг Excel рүү хөрвүүлэх ──
  async function exportExcel() {
    if (calc.rows.length === 0) return;
    const XLSX = await import("xlsx");
    const header = [
      "Бараа", "Код", "Тоо хэмжээ", `FOB (${currency})`, "FOB (₮)",
      "Гааль", "Тээвэр", "Хадгалалт", "Landed нэгж", "Landed нийт",
    ];
    const body = calc.rows.map((r) => [
      r.label, r.sku ?? "", r.line.qty, r2(r.line.qty * r.line.fobUnit),
      r.fobMnt, r.duty, r.freight, r.storage, r.landedUnit, r.landed,
    ]);
    body.push([
      "ДҮН", "", calc.qtyTotal, "", calc.fobMntTotal,
      calc.dutyTotal, calc.freight, calc.storage, "", calc.landedTotal,
    ]);
    body.push([]);
    body.push(["Импортын НӨАТ (нөхөгдөх)", "", "", "", "", "", "", "", "", calc.importVat]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    ws["!cols"] = [
      { wch: 30 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Гаалийн өртөг");
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Гаалийн_өртөг_тооцоо${docNo ? "_" + docNo : ""}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ── Тооцоо (landed cost allocation) ──
  const calc = useMemo(() => {
    const valid = lines.filter((l) =>
      (mode === "inv" ? l.itemId > 0 : l.categoryId > 0 && l.name.trim()) && l.qty > 0,
    );
    const fobMntOf = (l: Line) => r2(l.qty * l.fobUnit * rate);
    const fobMntTotal = r2(valid.reduce((s, l) => s + fobMntOf(l), 0));
    const qtyTotal = valid.reduce((s, l) => s + l.qty, 0);
    // Гаалийн татвар: дансаас татсан дүн (dutyAmount) байвал түүнийг, үгүй бол FOB-ийн %.
    const dutyTotal = dutyAmount > 0 ? r2(dutyAmount) : r2(fobMntTotal * (dutyPct / 100));
    const base = (l: Line) => (allocBy === "qty" ? l.qty : fobMntOf(l));
    const baseTotal = allocBy === "qty" ? qtyTotal : fobMntTotal;

    // Нэмэлт зардал бүрийг суурь (үнэ/тоо)-аар хувиарлана; үлдэгдлийг сүүлийн мөрд.
    let accDuty = 0, accFreight = 0, accStorage = 0;
    const share = (total: number, l: Line, last: boolean, acc: number) =>
      last ? r2(total - acc) : baseTotal > 0 ? r2(total * (base(l) / baseTotal)) : 0;
    const rows = valid.map((l, idx) => {
      const it = mode === "inv" ? itemById.get(l.itemId) : undefined;
      const cat = mode === "asset" ? catById.get(l.categoryId) : undefined;
      const label = mode === "inv" ? it?.name ?? "" : l.name.trim();
      const sku = mode === "inv" ? it?.sku ?? null : null;
      const categoryCode = mode === "inv" ? it?.category_code ?? "" : cat?.account_code ?? "";
      const fobMnt = fobMntOf(l);
      const last = idx === valid.length - 1;
      const duty = share(dutyTotal, l, last, accDuty);
      const frShare = share(freight, l, last, accFreight);
      const stShare = share(storage, l, last, accStorage);
      if (!last) {
        accDuty = r2(accDuty + duty);
        accFreight = r2(accFreight + frShare);
        accStorage = r2(accStorage + stShare);
      }
      const landed = r2(fobMnt + duty + frShare + stShare);
      const landedUnit = l.qty > 0 ? r2(landed / l.qty) : 0;
      const landedAdj = r2(l.qty * landedUnit); // = total_cost (post-той ижил)
      return {
        line: l, label, sku, categoryCode, fobMnt, duty, freight: frShare, storage: stShare,
        landed: landedAdj, landedUnit,
      };
    });
    const landedTotal = r2(rows.reduce((s, r) => s + r.landed, 0));
    const importVat = r2((fobMntTotal + dutyTotal) * (vatPct / 100));
    const addlTotal = r2(dutyTotal + freight + storage);
    return { rows, fobMntTotal, dutyTotal, freight, storage, importVat, landedTotal, addlTotal, qtyTotal };
  }, [lines, rate, dutyPct, dutyAmount, freight, storage, vatPct, allocBy, itemById, mode, catById]);

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
    const common = {
      date,
      docNo,
      supplier: supplier.trim() || null,
      company: company.trim() || null,
      bankAccountId: Number(bank),
      fobMnt: calc.fobMntTotal,
      importVat: calc.importVat,
      duty: calc.dutyTotal,
      freight: calc.freight,
      storage: calc.storage,
      dutyAccountId: dutyAcct ? Number(dutyAcct) : null,
      freightAccountId: freightAcct ? Number(freightAcct) : null,
      storageAccountId: storageAcct ? Number(storageAcct) : null,
    };
    start(async () => {
      const res =
        mode === "inv"
          ? await postLandedImport({
              ...common,
              lines: calc.rows.map((r) => ({
                itemId: r.line.itemId,
                categoryCode: r.categoryCode,
                qty: r.line.qty,
                landedUnit: r.landedUnit,
                landed: r.landed,
              })),
            })
          : await postLandedAssetImport({
              ...common,
              lines: calc.rows.map((r) => ({
                name: r.label,
                categoryId: r.line.categoryId,
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
      {/* ── Орлого авах төрөл ── */}
      <div className="inline-flex rounded-lg border border-zinc-300 bg-white p-0.5 text-sm print:hidden">
        {([
          { v: "inv" as const, label: "📦 Бараа материал" },
          { v: "asset" as const, label: "🏗 Үндсэн хөрөнгө" },
        ]).map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => {
              setMode(o.v);
              setLines([newLine(1)]);
              setResult(null);
            }}
            className={`rounded-md px-4 py-1.5 font-medium transition-colors ${
              mode === o.v ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

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
          <select value={currency} onChange={(e) => { const c = e.target.value; setCurrency(c); const f = CURRENCIES.find((x) => x.code === c); if (f) setRate(f.rate); }} className={inputCls}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Ханш (₮ / {currency})</span>
          <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value) || 0)} className={numCls} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Гаалийн татвар (%)</span>
          <input type="number" value={dutyPct} onChange={(e) => setDutyPct(Number(e.target.value) || 0)} className={numCls} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Импортын НӨАТ (%)</span>
          <input type="number" value={vatPct} onChange={(e) => setVatPct(Number(e.target.value) || 0)} className={numCls} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Хувиарлах арга</span>
          <select value={allocBy} onChange={(e) => setAllocBy(e.target.value as "value" | "qty")} className={inputCls}>
            <option value="value">Үнийн дүнгээр</option>
            <option value="qty">Тоо хэмжээгээр</option>
          </select></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-zinc-600">Төлбөрийн данс (НӨАТ/банк)</span>
          <select value={bank} onChange={(e) => setBank(e.target.value)} className={inputCls}>
            <option value="">— данс —</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select></label>
      </div>

      {/* ── Нэмэлт зардал: эх данс (УТЗ/УТТ) + дансны үлдэгдлээс татах ── */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 print:hidden">
        <p className="mb-2 text-sm font-medium text-zinc-700">Нэмэлт зардал — эх данс / дансны үлдэгдлээс татах</p>
        <div className="space-y-2">
          {([
            { key: "duty" as const, label: "Гаалийн татвар", amount: dutyAmount, setAmount: setDutyAmount, acct: dutyAcct, setAcct: setDutyAcct, hint: dutyAmount > 0 ? "" : `${dutyPct}% авто` },
            { key: "freight" as const, label: "Тээвэр", amount: freight, setAmount: setFreight, acct: freightAcct, setAcct: setFreightAcct, hint: "" },
            { key: "storage" as const, label: "Хадгалалт", amount: storage, setAmount: setStorage, acct: storageAcct, setAcct: setStorageAcct, hint: "" },
          ]).map((c) => (
            <div key={c.key} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[120px_1fr_minmax(160px,1.4fr)_auto]">
              <span className="text-sm text-zinc-600">{c.label}</span>
              <input type="number" value={c.amount || ""} placeholder={c.hint || "0"} onChange={(e) => c.setAmount(Number(e.target.value) || 0)} className={numCls} />
              <select value={c.acct} onChange={(e) => c.setAcct(e.target.value)} className={inputCls} title="Эх данс (банк/касс эсвэл УТЗ 140200 / УТТ 140300)">
                <option value="">— эх данс —</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
              <button type="button" disabled={pullBusy === c.key} onClick={() => pull(c.key)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40">
                {pullBusy === c.key ? "…" : "↧ Үлдэгдэл татах"}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">«Үлдэгдэл татах» нь сонгосон дансны (УТЗ/УТТ г.м) одоогийн үлдэгдлийг дүнд бичнэ. Орлогод авахад тухайн данс кредитлэгдэнэ.</p>
      </div>

      {/* ── Excel хэрэгсэл (зөвхөн БМ горим) ── */}
      <div className={`flex flex-wrap items-center gap-2 print:hidden ${mode === "asset" ? "hidden" : ""}`}>
        <a href="/inventory/landed-cost/template"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
          ↓ Excel загвар
        </a>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
          ↥ Excel-ээс мөр оруулах
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={importExcel} className="hidden" />
        <button type="button" onClick={exportExcel} disabled={calc.rows.length === 0}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40">
          ↧ Excel татах (тайлан)
        </button>
        {importMsg && <span className="text-xs text-zinc-500">{importMsg}</span>}
      </div>

      {/* ── Мөр оруулах ── */}
      <div className="rounded-xl border border-zinc-200 print:hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-2 py-2 text-left">{mode === "inv" ? "Бараа" : "Хөрөнгийн нэр + ангилал"}</th>
              <th className="px-2 py-2 text-right">{mode === "inv" ? "Тоо хэмжээ" : "Тоо (ширхэг)"}</th>
              <th className="px-2 py-2 text-right">FOB нэгж үнэ ({currency})</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key} className="border-t border-zinc-100">
                <td className="px-2 py-1.5">
                  {mode === "inv" ? (
                    <select value={l.itemId} onChange={(e) => setLine(l.key, { itemId: Number(e.target.value) })} className={inputCls + " w-full"}>
                      <option value={0}>— бараа сонгох —</option>
                      {items.map((i) => <option key={i.id} value={i.id}>{i.sku ? i.sku + " · " : ""}{i.name}</option>)}
                    </select>
                  ) : (
                    <div className="flex flex-col gap-1 sm:flex-row">
                      <input
                        value={l.name}
                        onChange={(e) => setLine(l.key, { name: e.target.value })}
                        placeholder="Хөрөнгийн нэр (ж. Экскаватор)"
                        className={inputCls + " w-full sm:flex-1"}
                      />
                      <select value={l.categoryId} onChange={(e) => setLine(l.key, { categoryId: Number(e.target.value) })} className={inputCls + " w-full sm:w-56"}>
                        <option value={0}>— ангилал —</option>
                        {assetCats.map((c) => <option key={c.id} value={c.id}>{c.account_code} · {c.name}</option>)}
                      </select>
                    </div>
                  )}
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
                  <td className="border border-zinc-300 px-2 py-1 text-left">{r.sku ? <span className="font-mono text-zinc-400">{r.sku} </span> : ""}{r.label}</td>
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
        <span className="text-xs text-zinc-500">
          {mode === "inv"
            ? "Бараа бүрт landed нэгж өртгөөр орлого + нэг гаалийн ваучер бичигдэнэ."
            : "Ширхэг бүрд хөрөнгийн карт (landed өртгөөр) + нэг гаалийн ваучер бичигдэнэ."}
        </span>
      </div>

      {result && (
        <div className={`rounded-xl border px-5 py-4 text-sm ${result.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          {result.ok ? (
            "assets" in result ? (
              <div className="space-y-2">
                <p className="font-medium">✓ {result.assets} хөрөнгө бүртгэлээ. Баримт: <span className="font-mono">{result.docNo}</span></p>
                <Link href="/assets"
                  className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                  🏗 Хөрөнгийн бүртгэл харах
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-medium">✓ {result.inserted} бараа орлогод авлаа. Баримт: <span className="font-mono">{result.docNo}</span></p>
                <Link href={`/inventory/document/bm-2?doc=${encodeURIComponent(result.docNo)}`}
                  className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                  🖨 Орлогын баримт хэвлэх (БМ-2)
                </Link>
              </div>
            )
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
