import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { JOURNAL_SELECT, type JournalRow } from "./types";
import { DeleteJournalButton } from "./delete-button";

const ROW_LIMIT = 300;

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

const SOURCE_LABEL: Record<string, string> = {
  manual: "Гар",
  vat: "НӨАТ",
  bank: "Банк",
};

export default async function JournalsPage() {
  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from("journals")
    .select(JOURNAL_SELECT, { count: "exact" })
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

  // Журнал бүрийн харьцсан данс (Дт / Кт) — journal_lines-аас.
  const journalIds = journals.map((j) => j.id);
  const dtByJournal = new Map<number, Set<string>>();
  const ktByJournal = new Map<number, Set<string>>();
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

    for (const l of lines) {
      const code = l.account_id != null ? codeById.get(l.account_id) : null;
      if (!code) continue;
      const target = (Number(l.debit) || 0) > 0 ? dtByJournal : ktByJournal;
      if (!target.has(l.journal_id)) target.set(l.journal_id, new Set());
      target.get(l.journal_id)!.add(code);
    }
  }
  const codes = (s: Set<string> | undefined) =>
    s ? [...s].sort() : [];

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

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white">
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
                      {j.description ?? "—"}
                      {j.reference ? (
                        <span className="ml-2 text-xs text-zinc-400">
                          {j.reference}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-zinc-700">
                          <span className="mr-1 font-semibold text-emerald-600">Дт</span>
                          {codes(dtByJournal.get(j.id)).map((c) => (
                            <span key={`d${c}`} className="mr-1 font-mono" title={acctName.get(c) ?? ""}>
                              {c}
                            </span>
                          ))}
                          {codes(dtByJournal.get(j.id)).length === 0 ? "—" : null}
                        </span>
                        <span className="text-zinc-700">
                          <span className="mr-1 font-semibold text-rose-600">Кт</span>
                          {codes(ktByJournal.get(j.id)).map((c) => (
                            <span key={`c${c}`} className="mr-1 font-mono" title={acctName.get(c) ?? ""}>
                              {c}
                            </span>
                          ))}
                          {codes(ktByJournal.get(j.id)).length === 0 ? "—" : null}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {j.partner_id ? partnerName.get(j.partner_id) ?? "—" : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums text-zinc-800">
                      {fmt(j.total_amount)}₮
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
