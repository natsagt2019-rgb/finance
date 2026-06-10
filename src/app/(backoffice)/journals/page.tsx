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
