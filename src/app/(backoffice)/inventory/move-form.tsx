"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { fmtQty } from "@/lib/inventory-calc";
import { createMove, type MoveInput } from "./actions";
import {
  COMPANIES,
  MOVE_TYPE_LABELS,
  type AccountOption,
  type ItemRow,
  type MoveType,
  type PartnerOption,
} from "./types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

// Сонгож болох төрлүүд (count_adj-г тооллогын табаас үүсгэнэ).
const TYPES: MoveType[] = [
  "receipt",
  "issue",
  "return_supplier",
  "return_in",
  "disposal",
];

// Харгалзах дансны (counter) тайлбар төрөл тус бүрд.
const COUNTER_LABEL: Record<MoveType, string> = {
  receipt: "Кредит данс (өглөг / касс / банк)",
  issue: "Дебет данс (зардал)",
  return_supplier: "Дебет данс (нийлүүлэгчийн өглөг)",
  return_in: "Кредит данс (буцаах зардал)",
  disposal: "Дебет данс (устгалын зардал)",
  count_adj: "Данс",
};

function isInboundType(t: MoveType): boolean {
  return t === "receipt" || t === "return_in";
}
function usesVat(t: MoveType): boolean {
  return t === "receipt" || t === "return_supplier";
}
function usesPartner(t: MoveType): boolean {
  return t === "receipt" || t === "return_supplier";
}

export function MoveForm({
  initialType,
  items,
  accounts,
  partners,
  locations,
  stock,
  today,
}: {
  initialType: MoveType;
  items: ItemRow[];
  accounts: AccountOption[];
  partners: PartnerOption[];
  locations: { id: number; name: string }[];
  stock: Record<number, number>;
  today: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<MoveType>(initialType);
  const [itemId, setItemId] = useState<number>(items[0]?.id ?? 0);
  const [locationId, setLocationId] = useState<string>("");
  const [lotNo, setLotNo] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [qty, setQty] = useState<string>("");
  const [unitCost, setUnitCost] = useState<string>("");
  const [vat, setVat] = useState<string>("");
  const [partnerId, setPartnerId] = useState<string>("");
  const [counterId, setCounterId] = useState<string>("");
  const [docNo, setDocNo] = useState<string>("");
  const [company, setCompany] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [date, setDate] = useState<string>(today);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const inbound = isInboundType(type);
  const currentItem = items.find((i) => i.id === itemId);
  const currentStock = stock[itemId] ?? 0;

  const total = useMemo(() => {
    const q = Number(qty) || 0;
    const u = Number(unitCost) || 0;
    return inbound ? q * u : 0;
  }, [qty, unitCost, inbound]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!itemId) {
      setError("Бараа сонгоно уу.");
      return;
    }
    const input: MoveInput = {
      date,
      type,
      item_id: itemId,
      qty: Number(qty) || 0,
      unit_cost: inbound ? Number(unitCost) || 0 : 0,
      vat_amount: usesVat(type) ? Number(vat) || 0 : 0,
      partner_id: usesPartner(type) && partnerId ? Number(partnerId) : null,
      counter_account_id: counterId ? Number(counterId) : null,
      location_id: locationId ? Number(locationId) : null,
      lot_no: inbound && lotNo ? lotNo : null,
      expiry_date: inbound && expiryDate ? expiryDate : null,
      doc_no: docNo || null,
      company: company || null,
      note: note || null,
    };
    startTransition(async () => {
      const res = await createMove(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/inventory?tab=moves");
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Бараа бүртгэгдээгүй байна. Эхлээд «Бараа» табаас бараа нэмнэ үү.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Гүйлгээний төрөл</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MoveType)}
            className={inputCls}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {MOVE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Огноо</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Бараа</label>
          <select
            value={itemId}
            onChange={(e) => setItemId(Number(e.target.value))}
            className={inputCls}
          >
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} {i.sku ? `(${i.sku})` : ""} — {i.unit}
              </option>
            ))}
          </select>
          {!inbound && currentItem && (
            <p className="mt-1 text-xs text-zinc-400">
              Одоогийн үлдэгдэл: {fmtQty(currentStock)} {currentItem.unit} — өртөг
              FIFO-оор бодогдоно.
            </p>
          )}
        </div>

        <div>
          <label className={labelCls}>
            Тоо хэмжээ ({currentItem?.unit ?? "нэгж"})
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className={`${inputCls} text-right tabular-nums`}
          />
        </div>

        {inbound && (
          <div>
            <label className={labelCls}>Нэгжийн өртөг (₮, НӨАТ-гүй)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className={`${inputCls} text-right tabular-nums`}
            />
            <p className="mt-1 text-xs text-zinc-400">
              Нийт өртөг: {total.toLocaleString("en-US")}₮
            </p>
          </div>
        )}

        {usesVat(type) && (
          <div>
            <label className={labelCls}>НӨАТ (₮)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={vat}
              onChange={(e) => setVat(e.target.value)}
              className={`${inputCls} text-right tabular-nums`}
            />
          </div>
        )}

        {usesPartner(type) && (
          <div>
            <label className={labelCls}>Нийлүүлэгч</label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className={inputCls}
            >
              <option value="">— сонгох —</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className={labelCls}>{COUNTER_LABEL[type]}</label>
          <select
            value={counterId}
            onChange={(e) => setCounterId(e.target.value)}
            className={inputCls}
          >
            <option value="">— тохиргооны анхдагч —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-400">
            Хоосон бол Тохиргоо табын анхдагч данс хэрэглэнэ.
          </p>
        </div>

        <div>
          <label className={labelCls}>Баримтын дугаар</label>
          <input
            type="text"
            value={docNo}
            onChange={(e) => setDocNo(e.target.value)}
            placeholder="БМ-01"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Компани</label>
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={inputCls}
          >
            <option value="">— сонгох —</option>
            {COMPANIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {inbound && (
          <>
            <div>
              <label className={labelCls}>Цуврал / лот (заавал биш)</label>
              <input type="text" value={lotNo} onChange={(e) => setLotNo(e.target.value)} placeholder="LOT-001" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Дуусах хугацаа (заавал биш)</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputCls} />
            </div>
          </>
        )}

        {locations.length > 0 && (
          <div>
            <label className={labelCls}>Байршил (агуулах)</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={inputCls}
            >
              <option value="">— сонгох —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className={labelCls}>Тэмдэглэл</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="жолоочийн нэр, маршрут гэх мэт"
            className={inputCls}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
        <Link
          href="/inventory?tab=moves"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Болих
        </Link>
      </div>
    </form>
  );
}
