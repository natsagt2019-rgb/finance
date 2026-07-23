"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createJournal,
  updateJournal,
  unlinkedTxnsForAccount,
  unlinkedEbarimt,
} from "./actions";
import type {
  AccountOption,
  LineInput,
  TxnLink,
  UnlinkedTxn,
  UnlinkedEbarimt,
} from "./types";

type Row = {
  account_id: string; // select value (string)
  debit: string;
  credit: string;
  description: string;
  link?: TxnLink | null; // касс/банкны мөрд холбосон дэд бүртгэлийн гүйлгээ
};

const EMPTY_ROW: Row = { account_id: "", debit: "", credit: "", description: "", link: null };

// Засвар горимд анхны утга дамжуулна.
export type JournalInitial = {
  date: string;
  description: string;
  reference: string;
  partner_id: number | null;
  status: "draft" | "posted";
  rows: Row[];
  currency?: string;
  exchange_rate?: number;
};

const CURRENCIES = ["MNT", "CNY", "USD", "EUR", "JPY", "RUB", "KRW"];

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function num(v: string): number {
  const n = parseFloat(v.replace(/[,₮\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function JournalForm({
  accounts,
  partners,
  today,
  journalId,
  initial,
  cashBankCodes = [],
}: {
  accounts: AccountOption[];
  partners: { id: number; name: string }[];
  today: string;
  journalId?: number;
  initial?: JournalInitial;
  cashBankCodes?: string[];
}) {
  const router = useRouter();
  const isEdit = journalId != null;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // account_id (select value) → accounts.code. Касс/банк эсэхийг шалгахад.
  const codeById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) m.set(String(a.id), a.code);
    return m;
  }, [accounts]);
  const cbSet = useMemo(() => new Set(cashBankCodes), [cashBankCodes]);
  const isCashBank = (accountId: string) => {
    const code = codeById.get(accountId);
    return !!code && cbSet.has(code);
  };

  // accounts.code → select value (id). И-баримтаас стандарт данс (НӨАТ/өглөг/авлага)
  // урьдчилан сонгоход.
  const idByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) m.set(a.code, String(a.id));
    return m;
  }, [accounts]);
  const accId = (code: string) => idByCode.get(code) ?? "";

  // Гүйлгээ холбох picker.
  const [pickerRow, setPickerRow] = useState<number | null>(null);
  const [pickerItems, setPickerItems] = useState<UnlinkedTxn[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  function openPicker(rowIdx: number, accountId: string) {
    const code = codeById.get(accountId);
    if (!code) return;
    setPickerRow(rowIdx);
    setPickerItems([]);
    setPickerLoading(true);
    unlinkedTxnsForAccount(code)
      .then((items) => setPickerItems(items))
      .finally(() => setPickerLoading(false));
  }

  function pickTxn(rowIdx: number, t: UnlinkedTxn) {
    setRow(rowIdx, {
      link: { source: t.source, id: t.id },
      debit: t.direction === "in" ? String(t.amount) : "",
      credit: t.direction === "out" ? String(t.amount) : "",
      description: t.description || "",
    });
    setPickerRow(null);
  }

  const [date, setDate] = useState(initial?.date ?? today);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [reference, setReference] = useState(initial?.reference ?? "");
  const [partnerId, setPartnerId] = useState(
    initial?.partner_id != null ? String(initial.partner_id) : "",
  );
  const [currency, setCurrency] = useState(initial?.currency ?? "MNT");
  const [rate, setRate] = useState(
    initial?.exchange_rate && initial.exchange_rate !== 1
      ? String(initial.exchange_rate)
      : "",
  );
  const isForeign = currency !== "MNT";
  const rateNum = num(rate) || (isForeign ? 0 : 1);
  const [rows, setRows] = useState<Row[]>(
    initial?.rows && initial.rows.length >= 2
      ? initial.rows
      : [{ ...EMPTY_ROW }, { ...EMPTY_ROW }],
  );

  const totals = useMemo(() => {
    const d = rows.reduce((s, r) => s + num(r.debit), 0);
    const c = rows.reduce((s, r) => s + num(r.credit), 0);
    return {
      debit: Math.round(d * 100) / 100,
      credit: Math.round(c * 100) / 100,
      diff: Math.round((d - c) * 100) / 100,
    };
  }, [rows]);

  const balanced =
    totals.diff === 0 && totals.debit > 0 && (!isForeign || rateNum > 0);

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeRow(i: number) {
    setRows((prev) =>
      prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i),
    );
  }

  // ── И-баримт дуудах (журналд ороогүй) ──────────────────────────────────────
  const [ebOpen, setEbOpen] = useState(false);
  const [ebItems, setEbItems] = useState<UnlinkedEbarimt[]>([]);
  const [ebLoading, setEbLoading] = useState(false);
  const [ebSearch, setEbSearch] = useState("");

  const ebFiltered = useMemo(() => {
    const q = ebSearch.trim().toLowerCase();
    if (!q) return ebItems;
    return ebItems.filter(
      (v) =>
        (v.partner_name ?? "").toLowerCase().includes(q) ||
        (v.ddtd ?? "").toLowerCase().includes(q),
    );
  }, [ebItems, ebSearch]);

  function openEbarimt() {
    setEbOpen(true);
    setEbItems([]);
    setEbSearch("");
    setEbLoading(true);
    unlinkedEbarimt()
      .then((items) => setEbItems(items))
      .finally(() => setEbLoading(false));
  }

  // Нэг и-баримтаас бүтэн бичилт угсарна:
  //   Худ.авалт (in): Дт зардал (цэвэр) + Дт 130600 НӨАТ / Кт 310100 өглөг (нийт)
  //   Борлуулалт (out): Дт 130100 авлага (нийт) / Кт орлого (цэвэр) + Кт 330100 НӨАТ
  // Зардал/орлогын дансыг хэрэглэгч сонгоно (юу авсан/зарснаас хамаарна).
  function pullEbarimt(v: UnlinkedEbarimt) {
    const s = (n: number) => (n ? String(n) : "");
    const name = v.partner_name ?? "";
    const link: TxnLink = { source: "vat", id: v.id };

    setDate(v.date || today);
    setCurrency("MNT");
    setRate("");
    setReference(v.ddtd ?? "");
    if (v.partner_id != null && partners.some((p) => p.id === v.partner_id)) {
      setPartnerId(String(v.partner_id));
    }

    let next: Row[];
    if (v.type === "in") {
      setDescription(`Худалдан авалт: ${name}`.trim());
      next = [
        { account_id: "", debit: s(v.net), credit: "", description: `Худалдан авалт: ${name}`.trim(), link: null },
      ];
      if (v.vat > 0)
        next.push({ account_id: accId("130600"), debit: s(v.vat), credit: "", description: "НӨАТ-ын авлага (130600)", link: null });
      next.push({ account_id: accId("310100"), debit: "", credit: s(v.total), description: name || "Нийлүүлэгчийн өглөг", link });
    } else {
      setDescription(`Борлуулалт: ${name}`.trim());
      next = [
        { account_id: accId("130100"), debit: s(v.total), credit: "", description: name || "Худалдагчийн авлага", link },
        { account_id: "", debit: "", credit: s(v.net), description: `Борлуулалт: ${name}`.trim(), link: null },
      ];
      if (v.vat > 0)
        next.push({ account_id: accId("330100"), debit: "", credit: s(v.vat), description: "НӨАТ-ын өглөг (330100)", link: null });
    }
    setRows(next.length >= 2 ? next : [...next, { ...EMPTY_ROW }]);
    setEbOpen(false);
  }

  function handleSubmit(status: "draft" | "posted") {
    setError(null);
    const lines: LineInput[] = rows.map((r) => ({
      account_id: r.account_id ? Number(r.account_id) : null,
      debit: num(r.debit),
      credit: num(r.credit),
      description: r.description,
      link: r.link ?? null,
    }));

    startTransition(async () => {
      const payload = {
        date,
        description,
        reference,
        partner_id: partnerId ? Number(partnerId) : null,
        status,
        lines,
        currency,
        exchange_rate: isForeign ? rateNum : 1,
      };
      const res = isEdit
        ? await updateJournal(journalId!, payload)
        : await createJournal(payload);
      if (res.ok) {
        router.push("/journals");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Толгой */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600">
            Огноо <span className="text-red-500">*</span>
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-zinc-600">
            Гүйлгээний утга
          </span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Жишээ: 1-р сарын НӨАТ-ын бичилт"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600">
            Лавлах № / баримт
          </span>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600">
            Харилцагч (заавал биш)
          </span>
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">— Сонгох —</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600">
            Валют
          </span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {isForeign && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-600">
              Ханш (1 {currency} → ₮) <span className="text-red-500">*</span>
            </span>
            <input
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="жишээ: 518.91"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-right text-sm tabular-nums"
            />
          </label>
        )}
      </div>

      {/* Мөрүүд */}
      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <span className="text-sm font-semibold text-zinc-700">
            Гүйлгээний мөрүүд
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openEbarimt}
              className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
              title="Журналд ороогүй и-баримтаас бүтэн бичилт үүсгэх"
            >
              📄 И-баримт дуудах
            </button>
            <button
              type="button"
              onClick={addRow}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              + Мөр нэмэх
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-3 py-2" style={{ width: "34%" }}>
                  Данс
                </th>
                <th className="px-3 py-2 text-right" style={{ width: "16%" }}>
                  Дебет{isForeign ? ` (${currency})` : ""}
                </th>
                <th className="px-3 py-2 text-right" style={{ width: "16%" }}>
                  Кредит{isForeign ? ` (${currency})` : ""}
                </th>
                <th className="px-3 py-2">Тайлбар</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r, i) => {
                const cb = isCashBank(r.account_id);
                const amtCls = (extra: string) =>
                  `w-full rounded border border-zinc-200 px-2 py-1.5 text-right text-sm tabular-nums focus:border-zinc-400 focus:outline-none ${extra}`;
                return (
                <tr key={i}>
                  <td className="px-3 py-1.5">
                    <select
                      value={r.account_id}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        // Касс/банк данс оролцсон үед л дүн/холбоосыг цэвэрлэнэ
                        // (тэдгээрийн дүн зөвхөн холбосон гүйлгээнээс ирдэг). Бусад
                        // данс хооронд солиход бөглөсөн дүнг хадгална.
                        if (isCashBank(r.account_id) || isCashBank(nextId)) {
                          setRow(i, { account_id: nextId, link: null, debit: "", credit: "" });
                        } else {
                          setRow(i, { account_id: nextId });
                        }
                      }}
                      className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
                    >
                      <option value="">— Данс сонгох —</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      inputMode="decimal"
                      value={r.debit}
                      readOnly={cb}
                      onChange={
                        cb
                          ? undefined
                          : (e) => setRow(i, { debit: e.target.value, credit: e.target.value ? "" : r.credit })
                      }
                      className={amtCls(cb ? "bg-zinc-100 text-zinc-500" : "")}
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      inputMode="decimal"
                      value={r.credit}
                      readOnly={cb}
                      onChange={
                        cb
                          ? undefined
                          : (e) => setRow(i, { credit: e.target.value, debit: e.target.value ? "" : r.debit })
                      }
                      className={amtCls(cb ? "bg-zinc-100 text-zinc-500" : "")}
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    {cb ? (
                      r.link ? (
                        <div className="flex items-center gap-2">
                          <span className="flex-1 truncate text-zinc-700" title={r.description}>
                            🔗 {r.description || "(гүйлгээ)"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setRow(i, { link: null, debit: "", credit: "", description: "" })}
                            className="shrink-0 text-xs text-red-500 hover:underline"
                          >
                            салгах
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openPicker(i, r.account_id)}
                          className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          🔗 Гүйлгээ холбох
                        </button>
                      )
                    ) : (
                      <input
                        type="text"
                        value={r.description}
                        onChange={(e) => setRow(i, { description: e.target.value })}
                        className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
                      />
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={rows.length <= 2}
                      className="text-zinc-400 hover:text-red-600 disabled:opacity-30"
                      title="Мөр устгах"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-zinc-200 bg-zinc-50 font-semibold">
              <tr>
                <td className="px-3 py-2 text-right text-zinc-600">
                  Нийт{isForeign ? ` (${currency})` : ""}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-800">
                  {fmt(totals.debit)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-800">
                  {fmt(totals.credit)}
                </td>
                <td className="px-3 py-2" colSpan={2}>
                  {balanced ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      ✓ Баланслагдсан
                    </span>
                  ) : (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {isForeign && rateNum <= 0
                        ? "Ханш оруулна уу"
                        : `Зөрүү: ${fmt(totals.diff)}`}
                    </span>
                  )}
                </td>
              </tr>
              {isForeign && rateNum > 0 && (
                <tr className="text-xs text-zinc-500">
                  <td className="px-3 py-1.5 text-right">₮ дүйцэл (× {fmt(rateNum)})</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {fmt(Math.round(totals.debit * rateNum))}₮
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {fmt(Math.round(totals.credit * rateNum))}₮
                  </td>
                  <td colSpan={2} />
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Үйлдэл */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleSubmit("posted")}
          disabled={isPending || !balanced}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isPending ? "Хадгалж байна…" : isEdit ? "Засвар батлах" : "Батлаж хадгалах"}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit("draft")}
          disabled={isPending || !balanced}
          className="rounded-lg border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          Ноороглон хадгалах
        </button>
        {!balanced && (
          <span className="text-xs text-zinc-500">
            Дебет = Кредит баланслахад хадгална.
          </span>
        )}
      </div>

      {/* Гүйлгээ холбох picker */}
      {pickerRow !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPickerRow(null)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <span className="text-sm font-semibold text-zinc-800">
                Журналд ороогүй гүйлгээ сонгох
              </span>
              <button
                type="button"
                onClick={() => setPickerRow(null)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-2">
              {pickerLoading ? (
                <div className="py-8 text-center text-sm text-zinc-500">Ачааллаж байна…</div>
              ) : pickerItems.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-500">
                  Журналд ороогүй гүйлгээ алга.
                  <div className="mt-1 text-xs text-zinc-400">
                    Эхлээд Касс / Дансны хуулгаар гүйлгээ оруулна уу.
                  </div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs font-medium text-zinc-500">
                    <tr>
                      <th className="px-2 py-1">Огноо</th>
                      <th className="px-2 py-1">Утга</th>
                      <th className="px-2 py-1 text-right">Орлого</th>
                      <th className="px-2 py-1 text-right">Зарлага</th>
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {pickerItems.map((t) => (
                      <tr key={`${t.source}-${t.id}`} className="hover:bg-zinc-50">
                        <td className="whitespace-nowrap px-2 py-1.5 text-zinc-600">{t.date}</td>
                        <td className="px-2 py-1.5 text-zinc-700">
                          <span className="mr-1 text-[10px] text-zinc-400">
                            {t.source === "cash" ? "касс" : t.source === "vat" ? "eBarimt" : "банк"}
                          </span>
                          {t.description || "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-green-700">
                          {t.direction === "in" ? fmt(t.amount) : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-red-600">
                          {t.direction === "out" ? fmt(t.amount) : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => pickTxn(pickerRow, t)}
                            className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700"
                          >
                            Сонгох
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* И-баримт дуудах picker */}
      {ebOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEbOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <div>
                <span className="text-sm font-semibold text-zinc-800">
                  Журналд ороогүй и-баримт
                </span>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Сонгосон баримтаас цэвэр дүн, НӨАТ, нийт дүнгээр бичилт автоматаар угсарна.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEbOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>
            <div className="border-b border-zinc-100 px-4 py-2">
              <input
                type="text"
                value={ebSearch}
                onChange={(e) => setEbSearch(e.target.value)}
                placeholder="Харилцагч эсвэл ДДТД-аар хайх…"
                className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="overflow-y-auto p-2">
              {ebLoading ? (
                <div className="py-8 text-center text-sm text-zinc-500">Ачааллаж байна…</div>
              ) : ebFiltered.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-500">
                  {ebSearch.trim()
                    ? "Хайлтад тохирох и-баримт алга."
                    : "Журналд ороогүй и-баримт алга."}
                  <div className="mt-1 text-xs text-zinc-400">
                    НӨАТ / И-баримт цэсээр баримт импортолсны дараа энд харагдана.
                  </div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs font-medium text-zinc-500">
                    <tr>
                      <th className="px-2 py-1">Огноо</th>
                      <th className="px-2 py-1">Төрөл</th>
                      <th className="px-2 py-1">Харилцагч / ДДТД</th>
                      <th className="px-2 py-1 text-right">Цэвэр</th>
                      <th className="px-2 py-1 text-right">НӨАТ</th>
                      <th className="px-2 py-1 text-right">Нийт</th>
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {ebFiltered.map((v) => (
                      <tr key={v.id} className="hover:bg-zinc-50">
                        <td className="whitespace-nowrap px-2 py-1.5 text-zinc-600">{v.date}</td>
                        <td className="px-2 py-1.5">
                          <span
                            className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              v.type === "in"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {v.type === "in" ? "Худ.авалт" : "Борлуулалт"}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-zinc-700">
                          <div className="max-w-[16rem] truncate" title={v.partner_name ?? ""}>
                            {v.partner_name || "—"}
                          </div>
                          {v.ddtd && (
                            <div className="text-[10px] text-zinc-400">{v.ddtd}</div>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-zinc-600">{fmt(v.net)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-zinc-600">{fmt(v.vat)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-medium text-zinc-800">{fmt(v.total)}</td>
                        <td className="px-2 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => pullEbarimt(v)}
                            className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700"
                          >
                            Дуудах
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
