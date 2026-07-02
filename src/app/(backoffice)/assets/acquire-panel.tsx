"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { buildAcquisitionJournal } from "@/lib/asset-acquisition";
import { acquireAsset, reverseAcquisition } from "./actions";
import type { AssetRow, CategoryRow } from "./types";

function fmt(n: number): string {
  return Math.round(Number(n) || 0).toLocaleString("en-US");
}

// Тооцооны данс сонголт (худалдан авалтын төлбөр).
const SETTLEMENT_OPTS = [
  { code: "310100", label: "310100 — Нийлүүлэгчийн өглөг (зээлээр)" },
  { code: "110200", label: "110200 — Харилцах данс" },
  { code: "110100", label: "110100 — Кассын бэлэн мөнгө" },
];

const ACC_NAMES: Record<string, string> = {
  "130600": "НӨАТ-ын авлага",
  "180500": "Хойшлогдсон НӨАТ",
  "310100": "Нийлүүлэгчийн өглөг",
  "110100": "Касс",
  "110200": "Харилцах",
};

// Худалдан авалтын НӨАТ данс: шууд хасах эсвэл хойшлуулах.
const VAT_ACCT_OPTS = [
  { code: "130600", label: "130600 — Шууд хасах (НӨАТ авлага)" },
  { code: "180500", label: "180500 — Хойшлуулах (барилга/тоног)" },
];

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

export function AcquirePanel({
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

  const [date, setDate] = useState(asset.acquired_date ?? new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [noVat, setNoVat] = useState(false);
  const [settlement, setSettlement] = useState("310100");
  const [vatAccount, setVatAccount] = useState("130600");

  const assetAcc = category?.account_code ?? null;
  const acquired = asset.acquisition_journal_id != null;

  const preview = useMemo(() => {
    if (!assetAcc) return null;
    const vat = !noVat && isVatPayer ? Math.round((Number(asset.cost) || 0) * 0.1 * 100) / 100 : 0;
    const built = buildAcquisitionJournal({
      cost: Number(asset.cost) || 0,
      vat,
      accounts: { asset: assetAcc, inputVat: vatAccount, settlement },
    });
    return { vat, built };
  }, [assetAcc, noVat, isVatPayer, asset.cost, settlement, vatAccount]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("acquired_date", date);
    fd.set("note", note);
    fd.set("no_vat", noVat ? "1" : "0");
    fd.set("settlement_code", settlement);
    fd.set("vat_account", vatAccount);
    startTransition(async () => {
      const res = await acquireAsset(asset.id, fd);
      if (!res.ok) { setError(res.error); return; }
      router.refresh();
    });
  }

  function handleReverse() {
    if (!confirm("Худалдан авалтын журналыг буцаах уу?")) return;
    setError(null);
    startTransition(async () => {
      const res = await reverseAcquisition(asset.id);
      if (!res.ok) { setError(res.error); return; }
      router.refresh();
    });
  }

  // ── Аль хэдийн бичигдсэн бол: дүгнэлт + буцаах ──
  if (acquired) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-900">Худалдан авалт бүртгэгдсэн</p>
            <p className="mt-1 text-xs text-blue-700">
              Өртөг: {fmt(asset.cost)}₮
              {asset.acquisition_vat > 0 && <> · НӨАТ: {fmt(asset.acquisition_vat)}₮</>}
              {" "}· GL журнал бичигдсэн
            </p>
          </div>
          <button
            type="button"
            onClick={handleReverse}
            disabled={isPending}
            className="shrink-0 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50"
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
      <h2 className="text-base font-semibold text-zinc-900">Худалдан авалт (GL журнал)</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Шинээр худалдаж авсан хөрөнгийн худалдан авалтын журнал бичнэ. Эхний үлдэгдлээр
        орсон хөрөнгөд хэрэглэхгүй.
      </p>

      {!assetAcc && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Энэ хөрөнгийн ангилалд хөрөнгийн данс тохируулаагүй байна. «Тохиргоо» табаас
          тохируулсны дараа худалдан авалт бичих боломжтой.
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Худалдан авсан огноо</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Тооцооны данс</label>
          <select value={settlement} onChange={(e) => setSettlement(e.target.value)} className={inputCls}>
            {SETTLEMENT_OPTS.map((o) => (
              <option key={o.code} value={o.code}>{o.label}</option>
            ))}
          </select>
        </div>
        {!noVat && isVatPayer && (
          <div>
            <label className={labelCls}>НӨАТ данс</label>
            <select value={vatAccount} onChange={(e) => setVatAccount(e.target.value)} className={inputCls}>
              {VAT_ACCT_OPTS.map((o) => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
        <div className="sm:col-span-2">
          <label className={labelCls}>Тэмдэглэл / нийлүүлэгч</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Нэхэмжлэх №, нийлүүлэгч" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={noVat} onChange={(e) => setNoVat(e.target.checked)} />
            НӨАТгүй худалдан авалт {isVatPayer ? "" : "(байгууллага НӨАТ төлөгч биш)"}
          </label>
        </div>
      </div>

      {/* Preview */}
      {preview?.built.ok && (
        <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Stat label="Цэвэр өртөг" value={fmt(preview.built.cost)} />
            <Stat label={`НӨАТ (${vatAccount})`} value={fmt(preview.vat)} />
            <Stat label="Нийт төлбөр" value={fmt(preview.built.gross)} />
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
                      <span className="ml-2 text-zinc-400">{ACC_NAMES[l.code] ?? (l.code === (category?.account_code ?? "") ? "Хөрөнгө" : "")}</span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-zinc-800">{l.debit ? fmt(l.debit) : ""}</td>
                    <td className="py-1.5 text-right tabular-nums text-zinc-800">{l.credit ? fmt(l.credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          disabled={isPending || !assetAcc || !preview?.built.ok}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? "Хадгалж байна…" : "Худалдан авалт бичих"}
        </button>
      </div>
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="tabular-nums font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
