"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  computeAsset,
  monthlyStraightLine,
  resolveUsefulLife,
} from "@/lib/asset-calc";
import { applyRevision, reverseRevision } from "./actions";
import type { AssetRow, CategoryRow } from "./types";

function fmt(n: number): string {
  return Math.round(Number(n) || 0).toLocaleString("en-US");
}
function prevMonth(y: number, m: number) {
  return m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
}

const SETTLEMENT_OPTS = [
  { code: "310100", label: "310100 — Нийлүүлэгчийн өглөг (зээлээр)" },
  { code: "110200", label: "110200 — Харилцах данс" },
  { code: "110100", label: "110100 — Кассын бэлэн мөнгө" },
];

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

type Kind = "repair" | "revaluation" | "life";
const KIND_LABEL: Record<Kind, string> = {
  repair: "Засвар",
  revaluation: "Дахин үнэлгээ",
  life: "Ашиглах хугацаа",
};

export function RevisePanel({
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

  const [kind, setKind] = useState<Kind>("repair");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lifeMonths, setLifeMonths] = useState("");
  const [repairAmount, setRepairAmount] = useState("0");
  const [fairValue, setFairValue] = useState("0");
  const [settlement, setSettlement] = useState("310100");
  const [noVat, setNoVat] = useState(false);
  const [note, setNote] = useState("");

  const salvage = Number(asset.salvage_value) || 0;
  const cost = Number(asset.cost) || 0;
  const life = resolveUsefulLife(asset.useful_life_years, category?.useful_life_years);
  const hasRevision = asset.revision_date != null;

  // R-ийн өмнөх сар хүртэлх хуримтлагдсан элэгдэл + үлдэх хугацааны анхдагч.
  const calc = useMemo(() => {
    const m = /^(\d{4})-(\d{2})/.exec(date);
    if (!m) return null;
    const pm = prevMonth(Number(m[1]), Number(m[2]));
    const accumBefore = computeAsset(
      {
        cost,
        salvageValue: salvage,
        usefulLifeYears: life,
        acquiredDate: asset.acquired_date,
        openingDate: asset.opening_date,
        openingAccumDepreciation: Number(asset.opening_accum_depreciation) || 0,
      },
      pm.y,
      pm.m,
    ).accumulatedDepreciation;
    const nbv = Math.round((cost - accumBefore) * 100) / 100;
    const monthly = monthlyStraightLine(cost, salvage, life);
    const remainingDefault =
      monthly > 0 ? Math.max(1, Math.round((nbv - salvage) / monthly)) : life * 12;
    return { accumBefore, nbv, remainingDefault };
  }, [date, cost, salvage, life, asset]);

  const effLifeMonths = lifeMonths ? Number(lifeMonths) : calc?.remainingDefault ?? 0;

  // Үр дүнгийн preview.
  const preview = useMemo(() => {
    if (!calc || effLifeMonths <= 0) return null;
    const repair = kind === "repair" ? Number(repairAmount.replace(/[, ]/g, "")) || 0 : 0;
    const fair = kind === "revaluation" ? Number(fairValue.replace(/[, ]/g, "")) || 0 : 0;
    const vat = kind === "repair" && !noVat && isVatPayer ? Math.round(repair * 0.1 * 100) / 100 : 0;
    const revCost = kind === "repair" ? cost + repair : kind === "revaluation" ? fair : cost;
    const revAccum = kind === "revaluation" ? 0 : calc.accumBefore;
    const baseR = Math.max(0, revCost - revAccum - salvage);
    const newMonthly = Math.round((baseR / effLifeMonths) * 100) / 100;
    const surplus = kind === "revaluation" ? Math.round((fair - calc.nbv) * 100) / 100 : 0;
    return { repair, fair, vat, revCost, revAccum, newMonthly, surplus, baseR };
  }, [calc, effLifeMonths, kind, repairAmount, fairValue, noVat, isVatPayer, cost, salvage]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("revision_kind", kind);
    fd.set("revision_date", date);
    fd.set("life_months", String(effLifeMonths));
    fd.set("note", note);
    if (kind === "repair") {
      fd.set("repair_amount", repairAmount);
      fd.set("settlement_code", settlement);
      fd.set("no_vat", noVat ? "1" : "0");
    } else if (kind === "revaluation") {
      fd.set("fair_value", fairValue);
    }
    startTransition(async () => {
      const res = await applyRevision(asset.id, fd);
      if (!res.ok) { setError(res.error); return; }
      router.refresh();
    });
  }

  function handleReverse() {
    if (!confirm("Засвар/дахин үнэлгээ/хугацааны өөрчлөлтийг буцаах уу? Холбогдох журнал устгагдана.")) return;
    setError(null);
    startTransition(async () => {
      const res = await reverseRevision(asset.id);
      if (!res.ok) { setError(res.error); return; }
      router.refresh();
    });
  }

  // ── Аль хэдийн revision бүртгэгдсэн бол: дүгнэлт + буцаах ──
  if (hasRevision) {
    const k = (asset.revision_kind ?? "life") as Kind;
    return (
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-violet-900">
              {KIND_LABEL[k]} бүртгэгдсэн ({asset.revision_date})
            </p>
            <p className="mt-1 text-xs text-violet-700">
              Шинэ өртөг: {fmt(asset.revision_cost ?? 0)}₮ · үлдэх хугацаа: {asset.revision_life_months} сар
              {asset.revision_note ? ` · ${asset.revision_note}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleReverse}
            disabled={isPending}
            className="shrink-0 rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50"
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
      <h2 className="text-base font-semibold text-zinc-900">Засвар / Дахин үнэлгээ / Хугацаа</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Сонгосон огнооноос хойш элэгдлийг шинэ суурьтай, үлдэх хугацаагаар дахин тооцно
        (өмнөх сарууд хэвээр).
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Төрөл</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  kind === k
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Хүчинтэй болох огноо</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Үлдэх хугацаа (сар)</label>
          <input
            type="number"
            min="1"
            value={lifeMonths}
            onChange={(e) => setLifeMonths(e.target.value)}
            placeholder={calc ? `анхдагч: ${calc.remainingDefault}` : ""}
            className={`${inputCls} text-right tabular-nums`}
          />
        </div>

        {kind === "repair" && (
          <>
            <div>
              <label className={labelCls}>Засварын дүн (НӨАТгүй ₮)</label>
              <input type="number" step="0.01" min="0" value={repairAmount} onChange={(e) => setRepairAmount(e.target.value)} className={`${inputCls} text-right tabular-nums`} />
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
                НӨАТгүй {isVatPayer ? "" : "(байгууллага НӨАТ төлөгч биш)"}
              </label>
            </div>
          </>
        )}

        {kind === "revaluation" && (
          <div>
            <label className={labelCls}>Шинэ үнэ цэнэ (₮)</label>
            <input type="number" step="0.01" min="0" value={fairValue} onChange={(e) => setFairValue(e.target.value)} className={`${inputCls} text-right tabular-nums`} />
          </div>
        )}

        <div className="sm:col-span-2">
          <label className={labelCls}>Акт / тэмдэглэл</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Актын дугаар / шалтгаан" className={inputCls} />
        </div>
      </div>

      {/* Preview */}
      {calc && preview && (
        <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Stat label="Одоогийн NBV" value={fmt(calc.nbv)} />
            <Stat label="Шинэ өртөг" value={fmt(preview.revCost)} />
            <Stat label="Шинэ сарын элэгдэл" value={fmt(preview.newMonthly)} cls="text-amber-700" />
            {kind === "revaluation" ? (
              preview.surplus >= 0 ? (
                <Stat label="Дахин үнэлгээний нөөц" value={`+${fmt(preview.surplus)}`} cls="text-green-700" />
              ) : (
                <Stat label="Дахин үнэлгээний гарз" value={`−${fmt(-preview.surplus)}`} cls="text-red-700" />
              )
            ) : kind === "repair" ? (
              <Stat label="НӨАТ" value={fmt(preview.vat)} />
            ) : (
              <Stat label="Үлдэх хугацаа" value={`${effLifeMonths} сар`} />
            )}
          </div>
          {kind !== "life" && (
            <p className="mt-2 text-xs text-zinc-400">
              {kind === "repair"
                ? "Дт хөрөнгө + Дт НӨАТ авлага / Кт тооцоо — журнал бичигдэнэ."
                : "Дт хуримт.элэгдэл / Кт хөрөнгө / нөөц(олз) эсвэл гарз — журнал бичигдэнэ."}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || !preview || effLifeMonths <= 0}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? "Хадгалж байна…" : `${KIND_LABEL[kind]} бүртгэх`}
        </button>
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
