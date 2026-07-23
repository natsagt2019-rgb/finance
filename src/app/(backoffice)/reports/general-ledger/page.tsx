import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { bankJournalStatus } from "@/lib/bank-journal-status";
import { BankJournalBanner } from "../bank-journal-banner";
import { GeneralLedgerExport, type ExportRow } from "./gl-export";

type SearchParams = { account?: string; from?: string; to?: string; view?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ENTRY_LIMIT = 100000;

type GLRow = {
  contra_code: string | null;
  contra_name: string | null;
  debit: number | null;
  credit: number | null;
  is_opening: boolean;
};

// Задаргааны нэг мөр (гүйлгээ тус бүр).
type DetailRow = {
  date: string;
  desc: string;
  contra_code: string | null;
  contra_name: string;
  debit: number;
  credit: number;
  balance: number;
};

function fmt(n: number): string {
  if (!n) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export default async function GeneralLedgerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });
  const year = today.slice(0, 4);
  const dFrom = sp.from && ISO.test(sp.from) ? sp.from : `${year}-01-01`;
  const dTo = sp.to && ISO.test(sp.to) ? sp.to : today;
  const account = (sp.account ?? "").trim();
  const view = sp.view === "detail" ? "detail" : "summary";

  // Дансны жагсаалт (сонгох + нэр харах)
  const { data: accRows } = await supabase
    .from("accounts")
    .select("code, name")
    .eq("is_active", true)
    .order("code", { ascending: true })
    .limit(5000);
  const accounts =
    (accRows as { code: string; name: string }[] | null) ?? [];
  const selName = accounts.find((a) => a.code === account)?.name ?? "";
  const nameByCode = new Map(accounts.map((a) => [a.code, a.name]));

  // Банкны хуулга журналд бүрэн/шинэ тусаагүй бол энэ тайлан гүйлгээ дутуу
  // харуулна (journal_entries-ээс уншдаг). Хуучирсан/кодгүй бол анхааруулна.
  const glYear = Number(dFrom.slice(0, 4)) || new Date().getFullYear();
  const bankStatus = await bankJournalStatus(supabase, glYear);

  // GL мөрүүд (данс сонгосон үед)
  let opening = 0;
  let rows: GLRow[] = [];
  let rpcError: string | null = null;
  if (account) {
    const { data, error } = await supabase.rpc("general_ledger_by_contra", {
      p_code: account,
      d_from: dFrom,
      d_to: dTo,
    });
    if (error) rpcError = error.message;
    const all = (data as GLRow[] | null) ?? [];
    const op = all.find((r) => r.is_opening);
    opening = (Number(op?.debit) || 0) - (Number(op?.credit) || 0);
    rows = all
      .filter((r) => !r.is_opening && r.contra_code)
      .sort((a, b) => (a.contra_code! < b.contra_code! ? -1 : 1));
  }

  const totalDebit = rows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (Number(r.credit) || 0), 0);
  const closing = opening + totalDebit - totalCredit;

  // ── Задаргаа (гүйлгээ тус бүр) — journal_entries шууд ──────────────────────
  const detailRows: DetailRow[] = [];
  let detailOpening = 0;
  if (account && view === "detail") {
    type JE = {
      txn_date: string;
      description: string | null;
      amount: number;
      debit_code: string | null;
      credit_code: string | null;
    };
    const { data: jeData } = await supabase
      .from("journal_entries")
      .select("txn_date, description, amount, debit_code, credit_code")
      .or(`debit_code.eq.${account},credit_code.eq.${account}`)
      .lte("txn_date", dTo)
      .order("txn_date", { ascending: true })
      .limit(ENTRY_LIMIT);
    const je = (jeData as JE[] | null) ?? [];
    // Мужаас өмнөх = эхний үлдэгдэлд.
    for (const e of je) {
      const d = (e.txn_date || "").slice(0, 10);
      if (d >= dFrom) continue;
      const amt = Number(e.amount) || 0;
      detailOpening += (e.debit_code === account ? amt : 0) - (e.credit_code === account ? amt : 0);
    }
    let bal = detailOpening;
    for (const e of je) {
      const d = (e.txn_date || "").slice(0, 10);
      if (d < dFrom) continue;
      const amt = Number(e.amount) || 0;
      const isDr = e.debit_code === account;
      const contra = isDr ? e.credit_code : e.debit_code;
      bal += (isDr ? amt : 0) - (!isDr ? amt : 0);
      detailRows.push({
        date: d,
        desc: e.description ?? "",
        contra_code: contra,
        contra_name: (contra && nameByCode.get(contra)) || "—",
        debit: isDr ? amt : 0,
        credit: isDr ? 0 : amt,
        balance: bal,
      });
    }
  }
  const detailTotalDr = detailRows.reduce((s, r) => s + r.debit, 0);
  const detailTotalCr = detailRows.reduce((s, r) => s + r.credit, 0);
  const detailClosing = detailOpening + detailTotalDr - detailTotalCr;

  // Excel export-д идэвхтэй горимын өгөгдлийг бэлдэнэ.
  const exportRows: ExportRow[] =
    view === "detail"
      ? detailRows.map((r) => ({
          date: r.date,
          desc: r.desc,
          code: r.contra_code,
          name: r.contra_name,
          debit: r.debit,
          credit: r.credit,
          balance: r.balance,
        }))
      : rows.map((r) => ({
          code: r.contra_code,
          name: r.contra_name ?? "—",
          debit: Number(r.debit) || 0,
          credit: Number(r.credit) || 0,
        }));

  // Горим хооронд сэлгэх линк (параметр хадгална).
  const modeHref = (v: string) => {
    const p = new URLSearchParams();
    if (account) p.set("account", account);
    p.set("from", dFrom);
    p.set("to", dTo);
    if (v === "detail") p.set("view", "detail");
    return `/reports/general-ledger?${p.toString()}`;
  };

  const inputCls =
    "rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

  // Үлдэгдлийг зөв тал руу (Дт+ бол Дебет, сөрөг бол Кредит)
  const balCell = (bal: number) => ({
    debit: bal >= 0 ? fmt(Math.abs(bal)) : "",
    credit: bal < 0 ? fmt(Math.abs(bal)) : "",
  });
  const openCell = balCell(opening);
  const closeCell = balCell(closing);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Ерөнхий данс <span className="text-zinc-400">/харьцсан дансаар/</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Сонгосон дансны хөдөлгөөн харьцсан дансаар ({dFrom} → {dTo}).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="view" value={view} />
            <select name="account" defaultValue={account} className={`${inputCls} max-w-[20rem]`}>
              <option value="">— Данс сонгох —</option>
              {accounts.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
            <input type="date" name="from" defaultValue={dFrom} className={inputCls} />
            <input type="date" name="to" defaultValue={dTo} className={inputCls} />
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Харах
            </button>
          </form>
          {account && (
            <GeneralLedgerExport
              account={account}
              accountName={selName}
              dFrom={dFrom}
              dTo={dTo}
              view={view}
              opening={view === "detail" ? detailOpening : opening}
              closing={view === "detail" ? detailClosing : closing}
              rows={exportRows}
            />
          )}
          <PrintButton />
        </div>
      </div>

      {/* Хэвлэхэд гарах гарчиг */}
      <div className="mb-3 hidden text-center print:block">
        <h2 className="text-lg font-bold text-zinc-900">Ерөнхий данс</h2>
        <p className="text-sm text-zinc-600">
          {account} {selName} · {dFrom} → {dTo}
        </p>
      </div>

      <BankJournalBanner year={glYear} status={bankStatus} />

      {!account ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          Дээрээс данс сонгоно уу.
        </div>
      ) : rpcError ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Алдаа: {rpcError}
          <p className="mt-1 text-red-500">
            general_ledger_by_contra() RPC үүссэн эсэхийг шалгана уу (schema.sql §18c).
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-700 print:hidden">
            <span>
              Данс:{" "}
              <span className="font-mono text-rose-600">{account}</span>{" "}
              <span className="font-medium">{selName}</span>
            </span>
            <span className="inline-flex overflow-hidden rounded-lg border border-zinc-300">
              <a
                href={modeHref("summary")}
                className={`px-3 py-1 text-xs font-medium ${view === "summary" ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
              >
                Нэгтгэл
              </a>
              <a
                href={modeHref("detail")}
                className={`px-3 py-1 text-xs font-medium ${view === "detail" ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
              >
                Задаргаа
              </a>
            </span>
          </div>

          {view === "detail" ? (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-100 text-xs font-medium text-zinc-600">
                <tr>
                  <th className="border border-zinc-200 px-2 py-2 text-right">№</th>
                  <th className="border border-zinc-200 px-3 py-2 text-left">Огноо</th>
                  <th className="border border-zinc-200 px-3 py-2 text-left">Гүйлгээний утга</th>
                  <th className="border border-zinc-200 px-3 py-2 text-left">Харьцсан данс</th>
                  <th className="border border-zinc-200 px-3 py-2 text-right">Дебет</th>
                  <th className="border border-zinc-200 px-3 py-2 text-right">Кредит</th>
                  <th className="border border-zinc-200 px-3 py-2 text-right">Үлдэгдэл</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-zinc-50 font-medium text-zinc-700">
                  <td className="border border-zinc-200 px-2 py-1.5" />
                  <td colSpan={3} className="border border-zinc-200 px-3 py-1.5">Эхний үлдэгдэл</td>
                  <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums">{detailOpening >= 0 ? fmt(detailOpening) : ""}</td>
                  <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums">{detailOpening < 0 ? fmt(-detailOpening) : ""}</td>
                  <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums font-medium">{fmt(Math.abs(detailOpening))}</td>
                </tr>
                {detailRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border border-zinc-200 px-4 py-6 text-center text-zinc-400">
                      Энэ хугацаанд гүйлгээ алга.
                    </td>
                  </tr>
                ) : (
                  detailRows.map((r, i) => (
                    <tr key={i} className="hover:bg-zinc-50">
                      <td className="border border-zinc-200 px-2 py-1.5 text-right tabular-nums text-zinc-400">{i + 1}</td>
                      <td className="whitespace-nowrap border border-zinc-200 px-3 py-1.5 text-zinc-500">{r.date}</td>
                      <td className="max-w-[24rem] truncate border border-zinc-200 px-3 py-1.5 text-zinc-700" title={r.desc}>{r.desc || "—"}</td>
                      <td className="whitespace-nowrap border border-zinc-200 px-3 py-1.5">
                        <span className="font-mono text-xs text-rose-600">{r.contra_code ?? "—"}</span>
                        <span className="ml-1 text-xs text-zinc-500">{r.contra_name}</span>
                      </td>
                      <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-zinc-700">{fmt(r.debit)}</td>
                      <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-zinc-700">{fmt(r.credit)}</td>
                      <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-zinc-600">{fmt(Math.abs(r.balance))}</td>
                    </tr>
                  ))
                )}
                <tr className="bg-zinc-50 font-semibold text-zinc-900">
                  <td className="border border-zinc-200 px-2 py-2" />
                  <td colSpan={3} className="border border-zinc-200 px-3 py-2">Нийт</td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums">{fmt(detailTotalDr)}</td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums">{fmt(detailTotalCr)}</td>
                  <td className="border border-zinc-200 px-3 py-2" />
                </tr>
                <tr className="bg-zinc-100 font-semibold text-zinc-900">
                  <td className="border border-zinc-200 px-2 py-2" />
                  <td colSpan={3} className="border border-zinc-200 px-3 py-2">Эцсийн үлдэгдэл</td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums">{detailClosing >= 0 ? fmt(detailClosing) : ""}</td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums">{detailClosing < 0 ? fmt(-detailClosing) : ""}</td>
                  <td className="border border-zinc-200 px-3 py-2 text-right tabular-nums">{fmt(Math.abs(detailClosing))}</td>
                </tr>
              </tbody>
            </table>
          </div>
          ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-100 text-xs font-medium text-zinc-600">
                <tr>
                  <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-right">
                    №
                  </th>
                  <th colSpan={2} className="border border-zinc-200 px-4 py-1.5 text-center">
                    Харьцсан данс
                  </th>
                  <th rowSpan={2} className="border border-zinc-200 px-3 py-2 text-center">
                    Валют
                  </th>
                  <th colSpan={2} className="border border-zinc-200 px-4 py-1.5 text-center">
                    Дүн
                  </th>
                </tr>
                <tr>
                  <th className="border border-zinc-200 px-4 py-1.5 text-left">
                    Дансны код
                  </th>
                  <th className="border border-zinc-200 px-4 py-1.5 text-left">
                    Дансны нэр
                  </th>
                  <th className="border border-zinc-200 px-4 py-1.5 text-right">Дебет</th>
                  <th className="border border-zinc-200 px-4 py-1.5 text-right">Кредит</th>
                </tr>
              </thead>
              <tbody>
                {/* Эхний үлдэгдэл */}
                <tr className="bg-zinc-50 font-medium text-zinc-700">
                  <td className="border border-zinc-200 px-3 py-1.5" />
                  <td colSpan={3} className="border border-zinc-200 px-4 py-1.5">
                    Эхний үлдэгдэл
                  </td>
                  <td className="border border-zinc-200 px-4 py-1.5 text-right tabular-nums">
                    {openCell.debit}
                  </td>
                  <td className="border border-zinc-200 px-4 py-1.5 text-right tabular-nums">
                    {openCell.credit}
                  </td>
                </tr>

                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border border-zinc-200 px-4 py-6 text-center text-zinc-400">
                      Энэ хугацаанд гүйлгээ алга.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={r.contra_code} className="hover:bg-zinc-50">
                      <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-zinc-400">
                        {i + 1}
                      </td>
                      <td className="whitespace-nowrap border border-zinc-200 px-4 py-1.5 font-mono text-xs text-rose-600">
                        {r.contra_code}
                      </td>
                      <td className="border border-zinc-200 px-4 py-1.5 text-zinc-700">
                        {r.contra_name ?? "—"}
                      </td>
                      <td className="border border-zinc-200 px-4 py-1.5 text-center text-zinc-400">
                        MNT
                      </td>
                      <td className="border border-zinc-200 px-4 py-1.5 text-right tabular-nums text-zinc-700">
                        {fmt(Number(r.debit) || 0)}
                      </td>
                      <td className="border border-zinc-200 px-4 py-1.5 text-right tabular-nums text-zinc-700">
                        {fmt(Number(r.credit) || 0)}
                      </td>
                    </tr>
                  ))
                )}

                {/* Нийт */}
                <tr className="bg-zinc-50 font-semibold text-zinc-900">
                  <td className="border border-zinc-200 px-3 py-2" />
                  <td colSpan={3} className="border border-zinc-200 px-4 py-2">
                    Нийт
                  </td>
                  <td className="border border-zinc-200 px-4 py-2 text-right tabular-nums">
                    {fmt(totalDebit)}
                  </td>
                  <td className="border border-zinc-200 px-4 py-2 text-right tabular-nums">
                    {fmt(totalCredit)}
                  </td>
                </tr>

                {/* Эцсийн үлдэгдэл */}
                <tr className="bg-zinc-100 font-semibold text-zinc-900">
                  <td className="border border-zinc-200 px-3 py-2" />
                  <td colSpan={3} className="border border-zinc-200 px-4 py-2">
                    Эцсийн үлдэгдэл
                  </td>
                  <td className="border border-zinc-200 px-4 py-2 text-right tabular-nums">
                    {closeCell.debit}
                  </td>
                  <td className="border border-zinc-200 px-4 py-2 text-right tabular-nums">
                    {closeCell.credit}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          )}
        </>
      )}
    </div>
  );
}
