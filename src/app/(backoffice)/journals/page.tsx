import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { JOURNAL_SELECT, type JournalRow } from "./types";
import { DeleteJournalButton } from "./delete-button";
import { JournalsFilter } from "./journals-filter";

const ROW_LIMIT = 300;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

const SOURCE_LABEL: Record<string, string> = {
  manual: "Гар",
  vat: "НӨАТ",
  bank: "Банк",
};

type SearchParams = { q?: string; from?: string; to?: string };

export default async function JournalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const from = sp.from && ISO.test(sp.from) ? sp.from : "";
  const to = sp.to && ISO.test(sp.to) ? sp.to : "";

  let query = supabase
    .from("journals")
    .select(JOURNAL_SELECT, { count: "exact" });

  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  if (q) {
    // PostgREST or()-д тусгай тэмдэгт асуудал үүсгэхээс сэргийлж цэвэрлэнэ.
    const safe = q.replace(/[,()*]/g, " ").trim();
    if (safe)
      query = query.or(
        `description.ilike.*${safe}*,number.ilike.*${safe}*,reference.ilike.*${safe}*`,
      );
  }

  const { data, error, count } = await query
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(ROW_LIMIT);

  const journals = (data as JournalRow[] | null) ?? [];
  const total = count ?? journals.length;

  // Харилцагчийн нэрийг id-аар.
  const partnerIds = [
    ...new Set(journals.map((j) => j.partner_id).filter((x): x is number => x != null)),
  ];
  const partnerName = new Map<number, string>();
  if (partnerIds.length > 0) {
    const { data: parts } = await supabase
      .from("partners")
      .select("id, name")
      .in("id", partnerIds);
    for (const p of (parts as { id: number; name: string }[] | null) ?? [])
      partnerName.set(p.id, p.name);
  }

  // Журнал бүрийн харьцсан данс ба данс тус бүрийн дүн — journal_lines-аас.
  type JLine = { side: "Дт" | "Кт"; code: string; amount: number };
  const journalIds = journals.map((j) => j.id);
  const linesByJournal = new Map<number, JLine[]>();
  const acctName = new Map<string, string>();
  if (journalIds.length > 0) {
    const { data: lineData } = await supabase
      .from("journal_lines")
      .select("journal_id, account_id, debit, credit")
      .in("journal_id", journalIds)
      .limit(20000);
    const lines =
      (lineData as
        | { journal_id: number; account_id: number | null; debit: number; credit: number }[]
        | null) ?? [];

    const acctIds = [
      ...new Set(lines.map((l) => l.account_id).filter((x): x is number => x != null)),
    ];
    const codeById = new Map<number, string>();
    if (acctIds.length > 0) {
      const { data: acctData } = await supabase
        .from("accounts")
        .select("id, code, name")
        .in("id", acctIds);
      for (const a of (acctData as { id: number; code: string; name: string }[] | null) ?? []) {
        codeById.set(a.id, a.code);
        acctName.set(a.code, a.name);
      }
    }

    // Ижил данс+талыг нэгтгэнэ (нэг данс = нэг мөр, дүнг нэмж).
    const agg = new Map<number, Map<string, JLine>>();
    for (const l of lines) {
      const code = l.account_id != null ? codeById.get(l.account_id) : null;
      if (!code) continue;
      const debit = Number(l.debit) || 0;
      const credit = Number(l.credit) || 0;
      if (!agg.has(l.journal_id)) agg.set(l.journal_id, new Map());
      const m = agg.get(l.journal_id)!;
      const add = (side: "Дт" | "Кт", amount: number) => {
        if (amount <= 0) return;
        const key = `${side}|${code}`;
        const cur = m.get(key);
        if (cur) cur.amount += amount;
        else m.set(key, { side, code, amount });
      };
      add("Дт", debit);
      add("Кт", credit);
    }
    // Дт мөрүүдийг эхэнд эрэмбэлнэ.
    for (const [jid, m] of agg) {
      const arr = [...m.values()].sort((a, b) =>
        a.side === b.side ? 0 : a.side === "Дт" ? -1 : 1,
      );
      linesByJournal.set(jid, arr);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Журнал</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Ерөнхий дэвтрийн бичилтүүд — гар болон автомат журнал.
          </p>
        </div>
        <Link
          href="/journals/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + Гар бичилт
        </Link>
      </div>

      <div className="mt-5">
        <JournalsFilter q={q} from={from} to={to} />
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <span className="text-sm font-semibold text-zinc-700">
            Журналын жагсаалт
          </span>
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
            {fmt(total)} бичилт
            {total > journals.length ? ` (${fmt(journals.length)} харуулав)` : ""}
          </span>
        </div>

        {error ? (
          <div className="px-6 py-10 text-center text-sm text-red-600">
            Алдаа: {error.message}
            <p className="mt-2 text-zinc-500">
              journals хүснэгт үүссэн эсэхийг шалгана уу (scripts/journals-schema.sql).
            </p>
          </div>
        ) : journals.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            Журнал байхгүй байна.{" "}
            <Link href="/journals/new" className="font-medium text-zinc-700 underline">
              Эхний бичилтийг хийх
            </Link>
            .
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800 text-left text-xs font-medium text-zinc-100">
                <tr>
                  <th className="px-4 py-2">Огноо</th>
                  <th className="px-4 py-2">Дугаар</th>
                  <th className="px-4 py-2">Утга</th>
                  <th className="px-4 py-2">Дт / Кт данс</th>
                  <th className="px-4 py-2">Харилцагч</th>
                  <th className="px-4 py-2 text-right">Дүн</th>
                  <th className="px-4 py-2">Эх</th>
                  <th className="px-4 py-2">Төлөв</th>
                  <th className="px-4 py-2 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {journals.map((j) => (
                  <tr key={j.id} className="hover:bg-zinc-50">
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-600">
                      {j.date}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-zinc-500">
                      {j.number ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-zinc-800">
                      <Link
                        href={`/journals/${j.id}`}
                        className="block max-w-[260px] hover:text-zinc-900"
                        title="Дарж засах / устгах"
                      >
                        <div className="truncate font-medium hover:underline">
                          {j.description ?? "—"}
                        </div>
                        {j.reference ? (
                          <div className="truncate text-xs text-zinc-400">
                            {j.reference}
                          </div>
                        ) : null}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {(linesByJournal.get(j.id) ?? []).length === 0 ? (
                        <span className="text-zinc-400">—</span>
                      ) : (
                        <div className="min-w-[180px] space-y-0.5">
                          {(linesByJournal.get(j.id) ?? []).map((ln, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-4"
                            >
                              <span className="whitespace-nowrap">
                                <span
                                  className={`mr-1 font-semibold ${
                                    ln.side === "Дт" ? "text-emerald-600" : "text-rose-600"
                                  }`}
                                >
                                  {ln.side}
                                </span>
                                <span
                                  className="font-mono text-zinc-700"
                                  title={acctName.get(ln.code) ?? ""}
                                >
                                  {ln.code}
                                </span>
                              </span>
                              <span className="tabular-nums text-zinc-600">
                                {fmt(ln.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {j.partner_id ? partnerName.get(j.partner_id) ?? "—" : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums text-zinc-800">
                      {fmt(j.total_amount)}₮
                      {j.currency && j.currency !== "MNT" && j.fx_amount ? (
                        <div className="text-[10px] font-normal text-amber-600">
                          {fmt(j.fx_amount)} {j.currency} × {j.exchange_rate}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2">
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        {SOURCE_LABEL[j.source] ?? j.source}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {j.status === "posted" ? (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Батлагдсан
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Ноорог
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      {["manual", "payable", "receivable", "expense"].includes(j.source) && (
                        <Link
                          href={`/journals/${j.id}`}
                          className="mr-1 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Засах
                        </Link>
                      )}
                      <DeleteJournalButton
                        id={j.id}
                        number={j.number ?? ""}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
