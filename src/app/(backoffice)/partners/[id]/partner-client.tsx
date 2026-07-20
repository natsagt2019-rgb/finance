"use client";

import { useState, useTransition } from "react";

import {
  setTransactionAccounts,
  recordBankExpense,
  createPayableFromVat,
  createReceivableFromVat,
  linkVatToPartner,
  listUnmatchedVat,
} from "./actions";

export type TxnRow = {
  id: number;
  txn_date: string;
  description: string | null;
  bank: string | null;
  income: number | null;
  expense: number | null;
  debit_code: string | null;
  credit_code: string | null;
};

export type VatRow = {
  id: number;
  date: string;
  ddtd: string | null;
  invoice_no: string | null;
  amount: number;
  vat_amount: number;
  total_amount: number;
};

export type Acc = { code: string; name: string };

const f = (n: number | null | undefined) =>
  n ? Math.round(Number(n)).toLocaleString("en-US") : "0";
const d = (s: string | null) => (s ? s.slice(0, 10) : "—");

// ── Дансны жагсаалт datalist ────────────────────────────────────────────────
function AccDatalist({ id, accounts }: { id: string; accounts: Acc[] }) {
  return (
    <datalist id={id}>
      {accounts.map((a) => (
        <option key={a.code} value={a.code}>
          {a.code} – {a.name}
        </option>
      ))}
    </datalist>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <div
      className={`mt-2 rounded-lg px-3 py-2 text-sm ${
        msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      {msg.text}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Банкны гүйлгээ — данс солих (мөр бүр) + зардалд бичих (зарлага, бөөнөөр)
// ════════════════════════════════════════════════════════════════════════════
export function BankTxnTable({
  partnerId,
  kind,
  rows,
  accounts,
}: {
  partnerId: number;
  kind: "income" | "expense";
  rows: TxnRow[];
  accounts: Acc[];
}) {
  const accName = new Map(accounts.map((a) => [a.code, a.name]));
  const isExpense = kind === "expense";
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Данс солих dialog
  const [edit, setEdit] = useState<{ id: number; dt: string; kt: string } | null>(null);
  // Зардалд бичих modal
  const [showExp, setShowExp] = useState(false);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [dt, setDt] = useState("");
  const [kt, setKt] = useState("310100");
  const [hasVat, setHasVat] = useState(false);
  const [vatAcc, setVatAcc] = useState("330100");

  const total = rows.reduce(
    (s, t) => s + (Number(isExpense ? t.expense : t.income) || 0),
    0,
  );

  const toggle = (id: number) => {
    setSel((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const saveEdit = () => {
    if (!edit) return;
    start(async () => {
      const r = await setTransactionAccounts(partnerId, edit.id, edit.dt, edit.kt);
      setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
      if (r.ok) setEdit(null);
    });
  };

  const submitExp = () => {
    start(async () => {
      const r = await recordBankExpense({
        partnerId,
        txnIds: [...sel],
        dtCode: dt,
        ktCode: kt,
        hasVat,
        vatAccCode: vatAcc,
      });
      setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
      if (r.ok) {
        setShowExp(false);
        setSel(new Set());
      }
    });
  };

  const selTotal = rows
    .filter((t) => sel.has(t.id))
    .reduce((s, t) => s + (Number(t.expense) || 0), 0);

  return (
    <div>
      {isExpense && (
        <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-1.5">
          <span className="text-xs text-zinc-400">
            {sel.size > 0 ? `${sel.size} сонгосон` : "Мөр сонгож зардалд бич"}
          </span>
          <button
            disabled={sel.size === 0}
            onClick={() => setShowExp(true)}
            className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-40"
          >
            🏷 Зардалд бичих
          </button>
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
          <tr>
            {isExpense && <th className="w-8 px-2 py-2"></th>}
            <th className="px-3 py-2">Огноо</th>
            <th className="px-3 py-2">Гүйлгээний утга</th>
            <th className="px-3 py-2">{isExpense ? "Дт данс" : "Банк"}</th>
            <th className="px-3 py-2 text-right">{isExpense ? "Зарлага" : "Орлого"}</th>
            <th className="w-8 px-2 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={isExpense ? 6 : 5} className="px-3 py-8 text-center text-sm text-zinc-400">
                Бичлэг байхгүй
              </td>
            </tr>
          ) : (
            rows.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-50">
                {isExpense && (
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={sel.has(t.id)}
                      onChange={() => toggle(t.id)}
                    />
                  </td>
                )}
                <td className="whitespace-nowrap px-3 py-1.5 text-zinc-500">{d(t.txn_date)}</td>
                <td className="max-w-[14rem] truncate px-3 py-1.5 text-zinc-700" title={t.description ?? ""}>
                  {t.description || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-xs">
                  {isExpense ? (
                    t.debit_code ? (
                      <span>
                        <code className="font-medium text-zinc-700">{t.debit_code}</code>
                        {accName.get(t.debit_code) && (
                          <span className="ml-1 text-zinc-400">
                            {accName.get(t.debit_code)!.slice(0, 12)}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-amber-600">—</span>
                    )
                  ) : (
                    <span className="text-zinc-400">{(t.bank || "").slice(0, 12) || "—"}</span>
                  )}
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-1.5 text-right font-medium tabular-nums ${
                    isExpense ? "text-rose-700" : "text-blue-700"
                  }`}
                >
                  {f(isExpense ? t.expense : t.income)}
                </td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={() =>
                      setEdit({ id: t.id, dt: t.debit_code ?? "", kt: t.credit_code ?? "" })
                    }
                    title="Данс солих"
                    className="text-zinc-300 hover:text-zinc-700"
                  >
                    ✎
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot className="border-t border-zinc-200 bg-zinc-50 font-semibold">
            <tr>
              <td colSpan={isExpense ? 4 : 3} className="px-3 py-2 text-right text-zinc-500">
                Нийт {isExpense ? "зарлага" : "орлого"}:
              </td>
              <td className={`px-3 py-2 text-right tabular-nums ${isExpense ? "text-rose-700" : "text-blue-700"}`}>
                {f(total)}
              </td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>

      {/* Данс солих dialog */}
      {edit && (
        <Modal title="Данс солих" onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-600">Дт данс</span>
              <input
                list="acc-edit-dl"
                value={edit.dt}
                onChange={(e) => setEdit({ ...edit, dt: e.target.value })}
                placeholder="7190, 3311…"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-600">Кт данс</span>
              <input
                list="acc-edit-dl"
                value={edit.kt}
                onChange={(e) => setEdit({ ...edit, kt: e.target.value })}
                placeholder="1012, 3310…"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <AccDatalist id="acc-edit-dl" accounts={accounts} />
            <Msg msg={msg} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEdit(null)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                Болих
              </button>
              <button
                onClick={saveEdit}
                disabled={pending}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {pending ? "…" : "Хадгалах"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Зардалд бичих modal */}
      {showExp && (
        <Modal title="Банкны зарлагыг зардалд бичих" onClose={() => setShowExp(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-600">Зардлын данс (Дт)</span>
                <input
                  list="exp-acc-dl"
                  value={dt}
                  onChange={(e) => setDt(e.target.value)}
                  placeholder="7190, 7316…"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-600">Кт данс</span>
                <input
                  list="exp-acc-dl"
                  value={kt}
                  onChange={(e) => setKt(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <AccDatalist id="exp-acc-dl" accounts={accounts} />
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={hasVat} onChange={(e) => setHasVat(e.target.checked)} />
              Нийт дүнд НӨАТ багтсан (1/11) — Дт 130600 / Кт{" "}
              <input
                value={vatAcc}
                onChange={(e) => setVatAcc(e.target.value)}
                className="w-16 rounded border border-zinc-300 px-1 py-0.5 text-xs"
              />
            </label>
            <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              Сонгосон: <strong>{sel.size}</strong> гүйлгээ, нийт{" "}
              <strong>{f(selTotal)}₮</strong>
            </div>
            <Msg msg={msg} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowExp(false)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                Болих
              </button>
              <button
                onClick={submitExp}
                disabled={pending || !dt}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {pending ? "…" : "Зардалд бичих"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// eBarimt худалдан авалт — өглөг үүсгэх + холбогдоогүй и баримт холбох
// ════════════════════════════════════════════════════════════════════════════
type UnmatchedRow = {
  id: number;
  date: string;
  partner_name: string | null;
  ddtd: string | null;
  amount: number;
  vat_amount: number;
  total_amount: number;
};

export function VatPurchasePanel({
  partnerId,
  rows,
  accounts,
}: {
  partnerId: number;
  rows: VatRow[];
  accounts: Acc[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [showPay, setShowPay] = useState(false);
  const [paySel, setPaySel] = useState<Set<number>>(new Set(rows.map((r) => r.id)));
  const [dt, setDt] = useState("");
  const [kt, setKt] = useState("310100");
  const [splitVat, setSplitVat] = useState(false);
  const [vatAcc, setVatAcc] = useState("330100");
  const [payDesc, setPayDesc] = useState("");

  const [showLink, setShowLink] = useState(false);
  const [unm, setUnm] = useState<UnmatchedRow[]>([]);
  const [unmLoaded, setUnmLoaded] = useState(false);
  const [linkSel, setLinkSel] = useState<Set<number>>(new Set());
  const [q, setQ] = useState("");

  const total = rows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);

  const togglePay = (id: number) =>
    setPaySel((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const submitPay = () => {
    start(async () => {
      const r = await createPayableFromVat({
        partnerId,
        vatIds: [...paySel],
        dtCode: dt,
        ktCode: kt,
        splitVat,
        vatAccCode: vatAcc,
        description: payDesc,
      });
      setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
      if (r.ok) setShowPay(false);
    });
  };

  const openLink = () => {
    setShowLink(true);
    if (!unmLoaded) {
      start(async () => {
        const data = await listUnmatchedVat();
        setUnm(data);
        setUnmLoaded(true);
      });
    }
  };

  const toggleLink = (id: number) =>
    setLinkSel((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const submitLink = () => {
    start(async () => {
      const r = await linkVatToPartner(partnerId, [...linkSel]);
      setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
      if (r.ok) {
        setShowLink(false);
        setLinkSel(new Set());
      }
    });
  };

  const unmFiltered = unm.filter((v) => {
    if (!q) return true;
    const t = q.toLowerCase();
    return (
      (v.partner_name || "").toLowerCase().includes(t) ||
      (v.ddtd || "").includes(q) ||
      String(v.total_amount).includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-end gap-2 border-b border-zinc-100 px-3 py-1.5">
        <button
          onClick={() => setShowPay(true)}
          disabled={rows.length === 0}
          className="rounded-lg border border-orange-300 bg-white px-2.5 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-40"
        >
          📄 Өглөг үүсгэх
        </button>
        <button
          onClick={openLink}
          className="rounded-lg border border-violet-300 bg-white px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50"
        >
          🔍 И баримт холбох
        </button>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
          <tr>
            <th className="px-3 py-2">Огноо</th>
            <th className="px-3 py-2">Нэхэмжлэл / ДДТД</th>
            <th className="px-3 py-2 text-right">НӨАТ-гүй</th>
            <th className="px-3 py-2 text-right">НӨАТ</th>
            <th className="px-3 py-2 text-right">Нийт</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-sm text-zinc-400">
                Бичлэг байхгүй
              </td>
            </tr>
          ) : (
            rows.map((v) => (
              <tr key={v.id} className="hover:bg-zinc-50">
                <td className="whitespace-nowrap px-3 py-1.5 text-zinc-500">{d(v.date)}</td>
                <td className="px-3 py-1.5">
                  {v.invoice_no && (
                    <span className="mr-1 rounded border border-zinc-200 px-1 text-xs text-zinc-500">
                      {v.invoice_no}
                    </span>
                  )}
                  <span className="break-all font-mono text-xs text-zinc-400" title={v.ddtd ?? ""}>{v.ddtd || "—"}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-zinc-600">{f(v.amount)}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-zinc-400">{f(v.vat_amount)}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium tabular-nums text-orange-700">
                  {f(v.total_amount)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot className="border-t border-zinc-200 bg-zinc-50 font-semibold">
            <tr>
              <td colSpan={4} className="px-3 py-2 text-right text-zinc-500">
                Нийт {rows.length}:
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-orange-700">{f(total)}</td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* Өглөг үүсгэх modal */}
      {showPay && (
        <Modal title="Ирсэн нэхэмжлэл — Өглөг үүсгэх" onClose={() => setShowPay(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-600">Зардлын данс (Дт)</span>
                <input
                  list="pay-acc-dl"
                  value={dt}
                  onChange={(e) => setDt(e.target.value)}
                  placeholder="7190, 7316…"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-600">Кт данс (өглөг)</span>
                <input
                  list="pay-acc-dl"
                  value={kt}
                  onChange={(e) => setKt(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <AccDatalist id="pay-acc-dl" accounts={accounts} />
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={splitVat} onChange={(e) => setSplitVat(e.target.checked)} />
              НӨАТ-ыг тусдаа өглөгт холбох (Дт 130600 / Кт{" "}
              <input
                value={vatAcc}
                onChange={(e) => setVatAcc(e.target.value)}
                className="w-16 rounded border border-zinc-300 px-1 py-0.5 text-xs"
              />
              )
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-600">
                Гүйлгээний утга{" "}
                <span className="font-normal text-zinc-400">(хоосон бол автомат)</span>
              </span>
              <input
                value={payDesc}
                onChange={(e) => setPayDesc(e.target.value)}
                placeholder="Жишээ: 2026 оны худалдан авалт"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="max-h-60 overflow-auto rounded-lg border border-zinc-200">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 text-left text-zinc-500">
                  <tr>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1">Огноо</th>
                    <th className="px-2 py-1">ДДТД</th>
                    <th className="px-2 py-1 text-right">Нийт</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v) => (
                    <tr key={v.id} className="border-t border-zinc-100">
                      <td className="px-2 py-1">
                        <input type="checkbox" checked={paySel.has(v.id)} onChange={() => togglePay(v.id)} />
                      </td>
                      <td className="px-2 py-1 text-zinc-500">{d(v.date)}</td>
                      <td className="break-all px-2 py-1 font-mono text-zinc-400" title={v.ddtd ?? ""}>{v.ddtd || "—"}</td>
                      <td className="px-2 py-1 text-right tabular-nums text-orange-700">{f(v.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-sm text-zinc-500">
              Сонгосон: <strong>{paySel.size}</strong> баримт
            </div>
            <Msg msg={msg} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPay(false)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                Болих
              </button>
              <button
                onClick={submitPay}
                disabled={pending || !dt || paySel.size === 0}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {pending ? "…" : "Өглөг үүсгэх"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* И баримт холбох modal */}
      {showLink && (
        <Modal title="Холбогдоогүй И баримтаас сонгох" onClose={() => setShowLink(false)}>
          <div className="space-y-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ДДТД, дүн, нийлүүлэгч хайх…"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <div className="max-h-72 overflow-auto rounded-lg border border-zinc-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-50 text-left text-zinc-500">
                  <tr>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1">Огноо</th>
                    <th className="px-2 py-1">Нийлүүлэгч</th>
                    <th className="px-2 py-1">ДДТД</th>
                    <th className="px-2 py-1 text-right">Нийт</th>
                  </tr>
                </thead>
                <tbody>
                  {!unmLoaded ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-6 text-center text-zinc-400">
                        Ачааллаж байна…
                      </td>
                    </tr>
                  ) : unmFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-6 text-center text-zinc-400">
                        Холбогдоогүй И баримт алга
                      </td>
                    </tr>
                  ) : (
                    unmFiltered.map((v) => (
                      <tr key={v.id} className="border-t border-zinc-100">
                        <td className="px-2 py-1">
                          <input type="checkbox" checked={linkSel.has(v.id)} onChange={() => toggleLink(v.id)} />
                        </td>
                        <td className="px-2 py-1 text-zinc-500">{d(v.date)}</td>
                        <td className="max-w-[12rem] truncate px-2 py-1" title={v.partner_name ?? ""}>
                          {v.partner_name || "—"}
                        </td>
                        <td className="break-all px-2 py-1 font-mono text-zinc-400" title={v.ddtd ?? ""}>{v.ddtd || "—"}</td>
                        <td className="px-2 py-1 text-right tabular-nums text-orange-700">{f(v.total_amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-sm text-zinc-500">
              Сонгосон: <strong>{linkSel.size}</strong> баримт
            </div>
            <Msg msg={msg} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowLink(false)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                Болих
              </button>
              <button
                onClick={submitLink}
                disabled={pending || linkSel.size === 0}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {pending ? "…" : "Энэ харилцагчтай холбох"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// eBarimt борлуулалт — авлага/орлого үүсгэх + холбогдоогүй и баримт холбох
// ════════════════════════════════════════════════════════════════════════════
export function VatSalesPanel({
  partnerId,
  rows,
  accounts,
}: {
  partnerId: number;
  rows: VatRow[];
  accounts: Acc[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [showSale, setShowSale] = useState(false);
  const [saleSel, setSaleSel] = useState<Set<number>>(new Set(rows.map((r) => r.id)));
  const [dr, setDr] = useState("130100");
  const [rev, setRev] = useState("610100");
  const [splitVat, setSplitVat] = useState(true);
  const [vatAcc, setVatAcc] = useState("330100");
  const [desc, setDesc] = useState("");

  const [showLink, setShowLink] = useState(false);
  const [unm, setUnm] = useState<UnmatchedRow[]>([]);
  const [unmLoaded, setUnmLoaded] = useState(false);
  const [linkSel, setLinkSel] = useState<Set<number>>(new Set());
  const [q, setQ] = useState("");

  const total = rows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);

  const toggleSale = (id: number) =>
    setSaleSel((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const submitSale = () => {
    start(async () => {
      const r = await createReceivableFromVat({
        partnerId,
        vatIds: [...saleSel],
        drCode: dr,
        revCode: rev,
        splitVat,
        vatAccCode: vatAcc,
        description: desc,
      });
      setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
      if (r.ok) setShowSale(false);
    });
  };

  const openLink = () => {
    setShowLink(true);
    if (!unmLoaded) {
      start(async () => {
        const data = await listUnmatchedVat("out");
        setUnm(data);
        setUnmLoaded(true);
      });
    }
  };

  const toggleLink = (id: number) =>
    setLinkSel((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const submitLink = () => {
    start(async () => {
      const r = await linkVatToPartner(partnerId, [...linkSel]);
      setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
      if (r.ok) {
        setShowLink(false);
        setLinkSel(new Set());
      }
    });
  };

  const unmFiltered = unm.filter((v) => {
    if (!q) return true;
    const t = q.toLowerCase();
    return (
      (v.partner_name || "").toLowerCase().includes(t) ||
      (v.ddtd || "").includes(q) ||
      String(v.total_amount).includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-end gap-2 border-b border-zinc-100 px-3 py-1.5">
        <button
          onClick={() => setShowSale(true)}
          disabled={rows.length === 0}
          className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
        >
          🧾 Борлуулалт үүсгэх
        </button>
        <button
          onClick={openLink}
          className="rounded-lg border border-violet-300 bg-white px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50"
        >
          🔍 И баримт холбох
        </button>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
          <tr>
            <th className="px-3 py-2">Огноо</th>
            <th className="px-3 py-2">Нэхэмжлэл / ДДТД</th>
            <th className="px-3 py-2 text-right">НӨАТ-гүй</th>
            <th className="px-3 py-2 text-right">НӨАТ</th>
            <th className="px-3 py-2 text-right">Нийт</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-sm text-zinc-400">
                Бичлэг байхгүй
              </td>
            </tr>
          ) : (
            rows.map((v) => (
              <tr key={v.id} className="hover:bg-zinc-50">
                <td className="whitespace-nowrap px-3 py-1.5 text-zinc-500">{d(v.date)}</td>
                <td className="px-3 py-1.5">
                  {v.invoice_no && (
                    <span className="mr-1 rounded border border-zinc-200 px-1 text-xs text-zinc-500">
                      {v.invoice_no}
                    </span>
                  )}
                  <span className="break-all font-mono text-xs text-zinc-400" title={v.ddtd ?? ""}>{v.ddtd || "—"}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-zinc-600">{f(v.amount)}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-zinc-400">{f(v.vat_amount)}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium tabular-nums text-green-700">
                  {f(v.total_amount)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot className="border-t border-zinc-200 bg-zinc-50 font-semibold">
            <tr>
              <td colSpan={4} className="px-3 py-2 text-right text-zinc-500">
                Нийт {rows.length}:
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-green-700">{f(total)}</td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* Борлуулалт үүсгэх modal */}
      {showSale && (
        <Modal title="Гарсан нэхэмжлэл — Борлуулалт (авлага/орлого) үүсгэх" onClose={() => setShowSale(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-600">Авлагын данс (Дт)</span>
                <input
                  list="sale-acc-dl"
                  value={dr}
                  onChange={(e) => setDr(e.target.value)}
                  placeholder="130100…"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-600">Орлогын данс (Кт)</span>
                <input
                  list="sale-acc-dl"
                  value={rev}
                  onChange={(e) => setRev(e.target.value)}
                  placeholder="610100…"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <AccDatalist id="sale-acc-dl" accounts={accounts} />
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={splitVat} onChange={(e) => setSplitVat(e.target.checked)} />
              Төлбөл зохих НӨАТ-ыг тусад нь бичих (Кт{" "}
              <input
                value={vatAcc}
                onChange={(e) => setVatAcc(e.target.value)}
                className="w-20 rounded border border-zinc-300 px-1 py-0.5 text-xs"
              />
              )
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-600">
                Гүйлгээний утга{" "}
                <span className="font-normal text-zinc-400">(хоосон бол автомат)</span>
              </span>
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Жишээ: 2026 оны борлуулалт"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="max-h-60 overflow-auto rounded-lg border border-zinc-200">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 text-left text-zinc-500">
                  <tr>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1">Огноо</th>
                    <th className="px-2 py-1">ДДТД</th>
                    <th className="px-2 py-1 text-right">Нийт</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v) => (
                    <tr key={v.id} className="border-t border-zinc-100">
                      <td className="px-2 py-1">
                        <input type="checkbox" checked={saleSel.has(v.id)} onChange={() => toggleSale(v.id)} />
                      </td>
                      <td className="px-2 py-1 text-zinc-500">{d(v.date)}</td>
                      <td className="break-all px-2 py-1 font-mono text-zinc-400" title={v.ddtd ?? ""}>{v.ddtd || "—"}</td>
                      <td className="px-2 py-1 text-right tabular-nums text-green-700">{f(v.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-sm text-zinc-500">
              Сонгосон: <strong>{saleSel.size}</strong> баримт
            </div>
            <Msg msg={msg} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSale(false)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                Болих
              </button>
              <button
                onClick={submitSale}
                disabled={pending || !dr || !rev || saleSel.size === 0}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {pending ? "…" : "Борлуулалт үүсгэх"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* И баримт холбох modal */}
      {showLink && (
        <Modal title="Холбогдоогүй борлуулалтын И баримтаас сонгох" onClose={() => setShowLink(false)}>
          <div className="space-y-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ДДТД, дүн, худалдан авагч хайх…"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <div className="max-h-72 overflow-auto rounded-lg border border-zinc-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-50 text-left text-zinc-500">
                  <tr>
                    <th className="px-2 py-1"></th>
                    <th className="px-2 py-1">Огноо</th>
                    <th className="px-2 py-1">Худалдан авагч</th>
                    <th className="px-2 py-1">ДДТД</th>
                    <th className="px-2 py-1 text-right">Нийт</th>
                  </tr>
                </thead>
                <tbody>
                  {!unmLoaded ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-6 text-center text-zinc-400">
                        Ачааллаж байна…
                      </td>
                    </tr>
                  ) : unmFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-6 text-center text-zinc-400">
                        Холбогдоогүй И баримт алга
                      </td>
                    </tr>
                  ) : (
                    unmFiltered.map((v) => (
                      <tr key={v.id} className="border-t border-zinc-100">
                        <td className="px-2 py-1">
                          <input type="checkbox" checked={linkSel.has(v.id)} onChange={() => toggleLink(v.id)} />
                        </td>
                        <td className="px-2 py-1 text-zinc-500">{d(v.date)}</td>
                        <td className="max-w-[12rem] truncate px-2 py-1" title={v.partner_name ?? ""}>
                          {v.partner_name || "—"}
                        </td>
                        <td className="break-all px-2 py-1 font-mono text-zinc-400" title={v.ddtd ?? ""}>{v.ddtd || "—"}</td>
                        <td className="px-2 py-1 text-right tabular-nums text-green-700">{f(v.total_amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-sm text-zinc-500">
              Сонгосон: <strong>{linkSel.size}</strong> баримт
            </div>
            <Msg msg={msg} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowLink(false)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                Болих
              </button>
              <button
                onClick={submitLink}
                disabled={pending || linkSel.size === 0}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {pending ? "…" : "Энэ харилцагчтай холбох"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
