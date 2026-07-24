"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateTxnAccounts, bulkSetDebitCode, autoLinkAccounts, deleteTxn, unlinkTxnSplit } from "./actions";
import { StatementSplitModal, type SplitTxn } from "./statement-split-modal";

export type TxnRow = {
  id: number;
  account_id: string;
  txn_date: string;
  bank: string | null;
  description: string | null;
  counterparty: string | null;
  income: number | null;
  expense: number | null;
  exchange_rate: number | null;
  income_code: string | null;
  expense_code: string | null;
  debit_code: string | null;
  credit_code: string | null;
  journal_id: number | null;
  contra?: string[]; // журналдсан гүйлгээний харьцсан данс(ууд)
  draft?: boolean; // түр холболт (ноорог журнал) — тайланд ороогүй
};

export type AccountOpt = { code: string; name: string };

function fmt(n: number | null): string {
  if (n == null) return "";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Валютын дүнг ханшаар MNT болгоно (rate=1 бол төгрөг хэвээр).
function mnt(v: number | null, rate: number | null): number | null {
  if (v == null) return null;
  return Number(v) * (Number(rate) || 1);
}

const EMPTY = { date: "", bank: "", desc: "", partner: "", dt: "", kt: "" };

export function StatementsTable({
  rows,
  accounts,
  partnerNames = [],
  bankGlByAccount = {},
}: {
  rows: TxnRow[];
  accounts: AccountOpt[];
  partnerNames?: string[];
  bankGlByAccount?: Record<string, string | null>;
}) {
  const [filters, setFilters] = useState(EMPTY);
  const [data, setData] = useState<TxnRow[]>(rows);
  const [splitTxn, setSplitTxn] = useState<SplitTxn | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editDt, setEditDt] = useState("");
  const [editKt, setEditKt] = useState("");
  const [editCp, setEditCp] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  // Холболтын дараа «Журналд бичих»-ийг сануулна (тайланд харагдуулахын тулд).
  const [postReminder, setPostReminder] = useState(false);
  // Bulk: харилцагчгүй зардлыг олноор зардалд бичих.
  const [onlyNoCp, setOnlyNoCp] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expCode, setExpCode] = useState("");
  const router = useRouter();

  // Сервер дахин ачаалахад (автомат холболт/refresh) prop өөрчлөгдвөл дотоод
  // өгөгдлийг рендерийн үед тэгшитгэнэ (эффектээс зайлсхийв).
  const [seenRows, setSeenRows] = useState(rows);
  if (rows !== seenRows) {
    setSeenRows(rows);
    setData(rows);
  }

  function autoLink() {
    setMsg(null);
    setPostReminder(false);
    start(async () => {
      try {
        const res = await autoLinkAccounts();
        if (res.linked > 0) {
          const via = res.seeded > 0 ? ` (суурь зураглалаар ${res.seeded})` : "";
          setMsg(`✓ Автомат холболт: ${res.linked} гүйлгээ холбогдлоо${via}.`);
          setPostReminder(true);
        } else {
          setMsg(
            "Холбогдох гүйлгээ олдсонгүй. Гүйлгээнүүдэд ангиллын код (AI ангилал) бичигдсэн эсэх, мөн Тохиргоо → «Ангилал → данс зураглал»-д тухайн компанийн зураглал бүртгэгдсэн эсэхийг шалгана уу.",
          );
        }
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Алдаа гарлаа.");
      }
    });
  }

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) m.set(a.code, a.name);
    return m;
  }, [accounts]);

  // Харилцагчийн саналын жагсаалт: лавлах/бүртгэлийн нэрс + одоо харагдаж буй
  // мөрүүдийн нэрс. Том/жижиг үсгийн зөрүүг нэгтгэнэ (лавлахын нэр түрүүлнэ).
  const cpOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of partnerNames) {
      const t = n.trim().replace(/\s+/g, " ");
      if (t) m.set(t.toUpperCase(), t);
    }
    for (const r of data) {
      const t = (r.counterparty ?? "").trim().replace(/\s+/g, " ");
      if (t && !m.has(t.toUpperCase())) m.set(t.toUpperCase(), t);
    }
    return [...m.values()].sort((a, b) => a.localeCompare(b));
  }, [partnerNames, data]);

  const filtered = useMemo(() => {
    const f = filters;
    const has = (v: string | null, q: string) =>
      !q || (v ?? "").toLowerCase().includes(q.toLowerCase());
    return data.filter(
      (r) =>
        (!onlyNoCp || !(r.counterparty ?? "").trim()) &&
        has(r.txn_date?.slice(0, 10), f.date) &&
        has(r.bank, f.bank) &&
        has(r.description, f.desc) &&
        has(r.counterparty, f.partner) &&
        has(r.debit_code, f.dt) &&
        has(r.credit_code, f.kt),
    );
  }, [data, filters, onlyNoCp]);

  // Сонгох боломжтой (зардал) мөрүүд — харагдаж буй.
  const selectableIds = useMemo(
    () => filtered.filter((r) => Number(r.expense) > 0 && r.journal_id == null).map((r) => r.id),
    [filtered],
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggle(id: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected((s) => {
      if (selectableIds.every((id) => s.has(id))) return new Set();
      return new Set(selectableIds);
    });
  }

  function applyExpense() {
    const ids = [...selected].filter((id) => {
      const r = data.find((x) => x.id === id);
      return r && Number(r.expense) > 0;
    });
    const code = expCode.trim();
    if (!ids.length || !code) {
      setMsg("Гүйлгээ сонгож, зардлын данс оруулна уу.");
      return;
    }
    setMsg(null);
    start(async () => {
      const res = await bulkSetDebitCode(ids, code);
      if (res.ok) {
        setData((d) =>
          d.map((r) => (ids.includes(r.id) ? { ...r, debit_code: code } : r)),
        );
        setSelected(new Set());
      } else {
        setMsg(res.error);
      }
    });
  }

  function startEdit(r: TxnRow) {
    setEditId(r.id);
    setEditDt(r.debit_code ?? "");
    setEditKt(r.credit_code ?? "");
    setEditCp(r.counterparty ?? "");
    setMsg(null);
  }

  function openSplit(r: TxnRow) {
    const rate = Number(r.exchange_rate) || 1;
    const inc = Number(r.income) || 0;
    const exp = Number(r.expense) || 0;
    const amount = Math.round((inc || exp) * rate * 100) / 100;
    setMsg(null);
    setSplitTxn({
      id: r.id,
      date: r.txn_date,
      description: r.description,
      counterparty: r.counterparty,
      amount,
      dir: inc > 0 ? "in" : "out",
      bankGl: bankGlByAccount[r.account_id] ?? null,
    });
  }

  function remove(r: TxnRow) {
    if (!window.confirm(`Энэ гүйлгээг устгах уу?\n${r.txn_date.slice(0, 10)} · ${r.description ?? ""}`))
      return;
    setMsg(null);
    start(async () => {
      const res = await deleteTxn(r.id);
      if (res.ok) {
        setData((d) => d.filter((x) => x.id !== r.id));
        setSelected((s) => {
          const n = new Set(s);
          n.delete(r.id);
          return n;
        });
      } else {
        setMsg(res.error);
      }
    });
  }

  // Журналдсан (задалсан) гүйлгээг журналаас салгах — журнал устгаж, дахин
  // задлах/кодлох боломжтой болгоно.
  function unlinkSplit(r: TxnRow) {
    if (
      !window.confirm(
        `Журналыг цуцалж, гүйлгээг задлагаас салгах уу?\nДараа нь дахин задлах/кодлох боломжтой болно.\n${r.txn_date.slice(0, 10)} · ${r.description ?? ""}`,
      )
    )
      return;
    setMsg(null);
    start(async () => {
      const res = await unlinkTxnSplit(r.id);
      if (res.ok) {
        setData((d) =>
          d.map((x) => (x.id === r.id ? { ...x, journal_id: null, contra: [] } : x)),
        );
        router.refresh();
      } else {
        setMsg(res.error);
      }
    });
  }

  function save(id: number) {
    start(async () => {
      const res = await updateTxnAccounts(id, editDt || null, editKt || null, editCp);
      if (res.ok) {
        setData((d) =>
          d.map((r) =>
            r.id === id
              ? {
                  ...r,
                  debit_code: editDt || null,
                  credit_code: editKt || null,
                  counterparty: editCp.trim() || null,
                }
              : r,
          ),
        );
        setEditId(null);
      } else {
        setMsg(res.error);
      }
    });
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }));

  const fInput =
    "w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none focus:border-zinc-900";
  const acctCell = (code: string | null) =>
    code ? (
      <span title={nameOf.get(code) ?? ""}>
        <span className="font-mono text-xs">{code}</span>
        <span className="ml-1 text-zinc-400">{(nameOf.get(code) ?? "").slice(0, 16)}</span>
      </span>
    ) : (
      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
        ⚠ дутуу
      </span>
    );

  return (
    <div className="overflow-x-auto">
      {msg && (
        <div
          className={`border-b px-3 py-2 text-xs ${
            msg.startsWith("✓")
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg}
        </div>
      )}

      {postReminder && (
        <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span>
            📒 Тайланд харагдуулахын тулд кодолсон гүйлгээгээ журналд бичих хэрэгтэй.
          </span>
          <Link
            href="/categorize"
            className="rounded-md border border-amber-300 bg-white px-2 py-1 font-medium text-amber-800 hover:bg-amber-100"
          >
            AI ангилал → «Журналд бичих» →
          </Link>
        </div>
      )}

      {/* Автомат холболт + bulk зардал */}
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 bg-zinc-50/60 px-3 py-2">
        <button
          type="button"
          disabled={pending}
          onClick={autoLink}
          title="Ангиллын кодоор нөгөө тал GL дансыг автоматаар оноох"
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "Холбож байна…" : "⚡ Автомат холболт"}
        </button>
        <span className="text-xs text-zinc-400">|</span>
        <label className="flex items-center gap-1.5 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={onlyNoCp}
            onChange={(e) => setOnlyNoCp(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Зөвхөн харилцагчгүй
        </label>
        <span className="text-xs text-zinc-400">|</span>
        <input
          list="acc-list"
          value={expCode}
          onChange={(e) => setExpCode(e.target.value)}
          placeholder="Дт данс, ж: 310101, 702701"
          className="w-56 rounded border border-zinc-300 px-2 py-1 text-xs"
        />
        <button
          type="button"
          disabled={pending || selected.size === 0 || !expCode.trim()}
          onClick={applyExpense}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          Дт-д бичих ({selected.size})
        </button>
        <span className="text-xs text-zinc-400">
          Сонгосон гүйлгээний Дт дансыг олноор ононо (Кт=банк авто). Жнь түрээс
          урьдчилгаа → 310101.
        </span>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
          <tr>
            <th className="px-2 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                title="Бүгдийг сонгох (зардал)"
                className="h-4 w-4 rounded border-zinc-300"
              />
            </th>
            <th className="px-3 py-2">Огноо</th>
            <th className="px-3 py-2">Банк</th>
            <th className="px-3 py-2">Гүйлгээний утга</th>
            <th className="px-3 py-2">Харилцагч</th>
            <th className="px-3 py-2 text-right">Орлого</th>
            <th className="px-3 py-2 text-right">Зарлага</th>
            <th className="px-3 py-2">Дт</th>
            <th className="px-3 py-2">Кт</th>
            <th className="px-3 py-2"></th>
          </tr>
          <tr className="bg-white">
            <th className="px-2 py-1"></th>
            <th className="px-2 py-1"><input value={filters.date} onChange={set("date")} placeholder="огноо…" className={fInput} /></th>
            <th className="px-2 py-1"><input value={filters.bank} onChange={set("bank")} placeholder="банк…" className={fInput} /></th>
            <th className="px-2 py-1"><input value={filters.desc} onChange={set("desc")} placeholder="тайлбар…" className={fInput} /></th>
            <th className="px-2 py-1"><input value={filters.partner} onChange={set("partner")} placeholder="харилцагч…" className={fInput} /></th>
            <th className="px-2 py-1"></th>
            <th className="px-2 py-1"></th>
            <th className="px-2 py-1"><input value={filters.dt} onChange={set("dt")} placeholder="Дт…" className={fInput} /></th>
            <th className="px-2 py-1"><input value={filters.kt} onChange={set("kt")} placeholder="Кт…" className={fInput} /></th>
            <th className="px-2 py-1 text-right">
              <button
                type="button"
                onClick={() => setFilters(EMPTY)}
                className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50"
              >
                ✕
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {filtered.map((r) => {
            const editing = editId === r.id;
            const canSelect = Number(r.expense) > 0;
            return (
              <tr key={r.id} className={editing ? "bg-blue-50/40" : selected.has(r.id) ? "bg-amber-50/40" : ""}>
                <td className="px-2 py-2">
                  {canSelect && (
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-600">{r.txn_date.slice(0, 10)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-500">{r.bank}</td>
                <td className="max-w-xs px-3 py-2 text-zinc-700"><span title={r.description ?? ""}>{r.description}</span></td>
                <td className="px-3 py-2 text-zinc-700">
                  {editing ? (
                    <input
                      list="cp-list"
                      value={editCp}
                      onChange={(e) => setEditCp(e.target.value)}
                      placeholder="харилцагч"
                      className="w-44 rounded border border-zinc-300 px-2 py-1 text-xs"
                    />
                  ) : (
                    r.counterparty
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-green-700">{fmt(mnt(r.income, r.exchange_rate))}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-red-700">{fmt(mnt(r.expense, r.exchange_rate))}</td>
                {editing ? (
                  <>
                    <td className="px-2 py-1">
                      <input list="acc-list" value={editDt} onChange={(e) => setEditDt(e.target.value)} placeholder="Дт код" className="w-28 rounded border border-zinc-300 px-2 py-1 text-xs" />
                    </td>
                    <td className="px-2 py-1">
                      <input list="acc-list" value={editKt} onChange={(e) => setEditKt(e.target.value)} placeholder="Кт код" className="w-28 rounded border border-zinc-300 px-2 py-1 text-xs" />
                    </td>
                    <td className="whitespace-nowrap px-2 py-1">
                      <button type="button" disabled={pending} onClick={() => save(r.id)} className="mr-1 rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50">Хадгал</button>
                      <button type="button" onClick={() => setEditId(null)} className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500">Болих</button>
                    </td>
                  </>
                ) : r.journal_id != null ? (
                  <>
                    <td colSpan={2} className="whitespace-nowrap px-3 py-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {r.draft ? (
                          <span
                            title="Түр холболт — ноорог журнал, тайланд ороогүй. /journals дээр батална."
                            className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                          >
                            ⏳ түр холболт
                          </span>
                        ) : (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            📒 журналдсан
                          </span>
                        )}
                        {(r.contra ?? []).map((code) => (
                          <span key={code} title={nameOf.get(code) ?? ""}>
                            <span className="font-mono text-xs text-zinc-600">{code}</span>
                            <span className="ml-1 text-zinc-400">
                              {(nameOf.get(code) ?? "").slice(0, 14)}
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => unlinkSplit(r)}
                        title="Журналыг цуцалж, дахин задлах/засах боломжтой болгох"
                        className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                      >
                        ↩ Салгах
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600">{acctCell(r.debit_code)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600">{acctCell(r.credit_code)}</td>
                    <td className="whitespace-nowrap px-2 py-1">
                      <button type="button" onClick={() => openSplit(r)} title="Задлах / И-баримт холбох" className="mr-1 rounded border border-blue-200 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">⤴</button>
                      <button type="button" onClick={() => startEdit(r)} title="Засах" className="mr-1 rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50">✏</button>
                      <button type="button" disabled={pending} onClick={() => remove(r)} title="Устгах" className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50">🗑</button>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <datalist id="acc-list">
        {accounts.map((a) => (
          <option key={a.code} value={a.code}>
            {a.code} — {a.name}
          </option>
        ))}
      </datalist>
      <datalist id="cp-list">
        {cpOptions.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <div className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-400">
        {filtered.length} / {data.length} мөр харагдаж байна.
      </div>

      {splitTxn && (
        <StatementSplitModal
          txn={splitTxn}
          accounts={accounts}
          onClose={() => setSplitTxn(null)}
          onSaved={(m, journalId) => {
            const id = splitTxn.id;
            setData((d) => d.map((r) => (r.id === id ? { ...r, journal_id: journalId } : r)));
            setSplitTxn(null);
            setMsg(m);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
