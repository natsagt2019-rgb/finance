"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { computeAsset, resolveUsefulLife } from "@/lib/asset-calc";
import { buildDisposalJournal } from "@/lib/asset-disposal";
import { disposeAsset, reverseDisposal } from "./actions";
import type { AssetRow, CategoryRow } from "./types";

function fmt(n: number): string {
  return Math.round(Number(n) || 0).toLocaleString("en-US");
}

// Тооцооны данс сонголт (борлуулалтын орлого хүлээх).
const SETTLEMENT_OPTS = [
  { code: "110200", label: "110200 — Харилцах данс" },
  { code: "110100", label: "110100 — Кассын бэлэн мөнгө" },
  { code: "130100", label: "130100 — Худалдан авагчийн авлага" },
];

// Журналын мөрөнд дансны нэр харуулах туслах.
const ACC_NAMES: Record<string, string> = {
  "160800": "Хөрөнгө",
  "160900": "Хуримтлагдсан элэгдэл",
  "620500": "ҮХ борлуулсны олз",
  "820100": "ҮХ хассаны гарз",
  "330100": "НӨАТ-ын өглөг",
  "110100": "Касс",
  "110200": "Харилцах",
  "130100": "Авлага",
};

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

export function DisposePanel({
  asset,
  category,
  isVatPayer,
}: {
  asset: AssetRow;
  category: CategoryRow | null;
  isVatPayer: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<"writeoff" | "sale">("writeoff");
  const [disposedDate, setDisposedDate] = useState(today);
  const [note, setNote] = useState("");
  const [proceeds, setProceeds] = useState("0");
  const [noVat, setNoVat] = useState(false);
  const [settlement, setSettlement] = useState("110200");

  const assetAcc = category?.account_code ?? null;
  const accumAcc = category?.accum_account_code ?? null;
  const accountsReady = !!assetAcc && !!accumAcc;

  // Амьд preview — сонгосон огнооны хуримтлагдсан элэгдэл + журналын мөрүүд.
  const preview = useMemo(() => {
    if (!accountsReady) return null;
    const ym = /^(\d{4})-(\d{2})/.exec(disposedDate);
    if (!ym) return null;
    const life = resolveUsefulLife(asset.useful_life_years, category?.useful_life_years);
    const calc = computeAsset(
      {
        cost: Number(asset.cost) || 0,
        salvageValue: Number(asset.salvage_value) || 0,
        usefulLifeYears: life,
        acquiredDate: asset.acquired_date,
        openingDate: asset.opening_date,
        openingAccumDepreciation: Number(asset.opening_accum_depreciation) || 0,
      },
      Number(ym[1]),
      Number(ym[2]),
    );
    const p = type === "sale" ? Number(String(proceeds).replace(/[, ]/g, "")) || 0 : 0;
    const vat = type === "sale" && !noVat && isVatPayer ? Math.round(p * 0.1 * 100) / 100 : 0;
    const built = buildDisposalJournal({
      type,
      cost: Number(asset.cost) || 0,
      accumulated: calc.accumulatedDepreciation,
      proceeds: p,
      vat,
      accounts: { asset: assetAcc!, accum: accumAcc!, gain: "620500", loss: "820100", vatPayable: "330100", settlement },
    });
    return { accum: calc.accumulatedDepreciation, vat, built };
  }, [accountsReady, disposedDate, type, proceeds, noVat, settlement, asset, category, isVatPayer, assetAcc, accumAcc]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("disposal_type", type);
    fd.set("disposed_date", disposedDate);
    fd.set("disposal_note", note);
    fd.set("proceeds", String(proceeds));
    fd.set("no_vat", noVat ? "1" : "0");
    fd.set("settlement_code", settlement);
    startTransition(async () => {
      const res = await disposeAsset(asset.id, fd);
      if (!res.ok) { setError(res.error); return; }
      router.refresh();
    });
  }

  function handleReverse() {
    if (!confirm("Хасалт/борлуулалтыг буцаах уу? Холбогдох журнал устгагдана.")) return;
    setError(null);
    startTransition(async () => {
      const res = await reverseDisposal(asset.id);
      if (!res.ok) { setError(res.error); return; }
      router.refresh();
    });
  }

  // ── Аль хэдийн хасагдсан бол: дүгнэлт + буцаах ──
  if (asset.status === "disposed") {
    const label = asset.disposal_type === "sale" ? "Борлуулсан" : "Актласан / хассан";
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-900">{label}</p>
            <p className="mt-1 text-xs text-amber-700">
              Огноо: {asset.disposed_date || "—"}
              {asset.disposal_type === "sale" && (
                <> · Үнэ: {fmt(asset.disposal_proceeds)}₮ · НӨАТ: {fmt(asset.disposal_vat)}₮</>
              )}
              {asset.disposal_note ? ` · ${asset.disposal_note}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleReverse}
            disabled={isPending}
            className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          >
            {isPending ? "Буцааж байна…" : "Буцаах"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="text-base font-semibold text-zinc-900">Хасах / Борлуулах</h2>

      {!accountsReady && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Энэ хөрөнгийн ангилалд хөрөнгийн данс ба хуримтлагдсан элэгдлийн данс
          тохируулаагүй байна. «Тохиргоо» табаас тохируулсны дараа хасалт хийх боломжтой.
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Төрөл */}
        <div className="sm:col-span-2">
          <label className={labelCls}>Төрөл</label>
          <div className="flex gap-2">
            {[
              { v: "writeoff", t: "Хасалт (актлах)" },
              { v: "sale", t: "Борлуулалт" },
            ].map(({ v, t }) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v as "writeoff" | "sale")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  type === v
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Хасах огноо</label>
          <input type="date" value={disposedDate} onChange={(e) => setDisposedDate(e.target.value)} className={inputCls} />
          <p className="mt-1 text-xs text-zinc-400">Энэ сар хүртэлх элэгдлээр контра данс хаагдана.</p>
        </div>

        <div>
          <label className={labelCls}>Акт / тэмдэглэл</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Актын дугаар / худалдан авагч" className={inputCls} />
        </div>

        {type === "sale" && (
          <>
            <div>
              <label className={labelCls}>Борлуулах үнэ (НӨАТгүй ₮)</label>
              <input type="number" step="0.01" min="0" value={proceeds} onChange={(e) => setProceeds(e.target.value)} className={`${inputCls} text-right tabular-nums`} />
            </div>
            <div>
              <label className={labelCls}>Тооцооны данс</label>
              <select value={settlement} onChange={(e) => setSettlement(e.target.value)} className={inputCls}>
                {SETTLEMENT_OPTS.map((o) => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" checked={noVat} onChange={(e) => setNoVat(e.target.checked)} />
                НӨАТгүй борлуулалт {isVatPayer ? "" : "(байгууллага НӨАТ төлөгч биш)"}
              </label>
            </div>
          </>
        )}
      </div>

      {/* Preview */}
      {preview?.built.ok && (
        <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Stat label="Анхны өртөг" value={fmt(asset.cost)} />
            <Stat label="Хуримтлагдсан" value={fmt(preview.accum)} />
            <Stat label="Үлдэгдэл өртөг" value={fmt(preview.built.nbv)} />
            {type === "sale" ? (
              preview.built.gain > 0 ? (
                <Stat label="Олз" value={`+${fmt(preview.built.gain)}`} cls="text-green-700" />
              ) : (
                <Stat label="Гарз" value={`−${fmt(preview.built.loss)}`} cls="text-red-700" />
              )
            ) : (
              <Stat label="Гарз (NBV)" value={fmt(preview.built.loss)} cls="text-red-700" />
            )}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="py-1">Данс</th>
                  <th className="py-1 text-right">Дебет</th>
                  <th className="py-1 text-right">Кредит</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {preview.built.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="py-1.5 text-zinc-700">
                      <span className="tabular-nums">{l.code}</span>
                      <span className="ml-2 text-zinc-400">{ACC_NAMES[l.code] ?? ""}</span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-zinc-800">{l.debit ? fmt(l.debit) : ""}</td>
                    <td className="py-1.5 text-right tabular-nums text-zinc-800">{l.credit ? fmt(l.credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {type === "sale" && preview.vat > 0 && (
            <p className="mt-2 text-xs text-zinc-400">НӨАТ {fmt(preview.vat)}₮ (10%) автоматаар нэмэгдсэн.</p>
          )}
        </div>
      )}

      {preview && !preview.built.ok && (
        <p className="mt-4 text-sm text-red-700">{preview.built.error}</p>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || !accountsReady || !preview?.built.ok}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? "Хадгалж байна…" : type === "sale" ? "Борлуулах" : "Хасах"}
        </button>
        <span className="text-xs text-zinc-400">GL журнал автоматаар бичигдэнэ.</span>
      </div>
    </form>
  );
}

function Stat({ label, value, cls = "text-zinc-900" }: { label: string; value: string; cls?: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`tabular-nums font-semibold ${cls}`}>{value}</p>
    </div>
  );
}
