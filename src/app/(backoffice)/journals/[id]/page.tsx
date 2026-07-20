import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { JournalForm, type JournalInitial } from "../journal-form";
import type { AccountOption } from "../types";

const SOURCE_LABEL: Record<string, string> = {
  manual: "Гар",
  vat: "НӨАТ",
  bank: "Банк",
};

export default async function EditJournalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const journalId = Number(id);
  const supabase = await createClient();

  const [{ data: jrn }, { data: lineRows }, { data: accRows }, { data: partRows }] =
    await Promise.all([
      supabase
        .from("journals")
        .select(
          "id, date, number, description, reference, status, source, partner_id, currency, exchange_rate, fx_amount",
        )
        .eq("id", journalId)
        .maybeSingle(),
      supabase
        .from("journal_lines")
        .select("account_id, debit, credit, description, line_no")
        .eq("journal_id", journalId)
        .order("line_no", { ascending: true }),
      supabase
        .from("accounts")
        .select("id, code, name")
        .eq("is_active", true)
        .order("code", { ascending: true })
        .limit(2000),
      supabase
        .from("partners")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(2000),
    ]);

  if (!jrn) notFound();

  const accounts = (accRows as AccountOption[] | null) ?? [];
  const partners = (partRows as { id: number; name: string }[] | null) ?? [];
  const lines =
    (lineRows as
      | { account_id: number | null; debit: number; credit: number; description: string | null }[]
      | null) ?? [];

  // Гар бичилт ба харилцагчийн хуудсаас (eBarimt/банк) үүсгэсэн журнал засагдана.
  const isManual = ["manual", "payable", "receivable", "expense"].includes(
    jrn.source as string,
  );

  // Валют/ханш — журналын мөр ₮-өөр хадгалагддаг тул валютын журналыг харуулахдаа
  // ханшид хувааж, оруулсан валютын дүнг сэргээнэ.
  const currency = ((jrn.currency as string | null) ?? "MNT").toUpperCase();
  const rate = Number(jrn.exchange_rate) || 1;
  const toFx = (mnt: number) =>
    currency === "MNT" || rate <= 0 ? mnt : Math.round((mnt / rate) * 100) / 100;

  const fmtNum = (n: number) => (n ? String(n) : "");
  const initial: JournalInitial = {
    date: jrn.date as string,
    description: (jrn.description as string | null) ?? "",
    reference: (jrn.reference as string | null) ?? "",
    partner_id: (jrn.partner_id as number | null) ?? null,
    status: (jrn.status as "draft" | "posted") ?? "posted",
    currency,
    exchange_rate: rate,
    rows:
      lines.length > 0
        ? lines.map((l) => ({
            account_id: l.account_id != null ? String(l.account_id) : "",
            debit: fmtNum(toFx(Number(l.debit) || 0)),
            credit: fmtNum(toFx(Number(l.credit) || 0)),
            description: l.description ?? "",
          }))
        : [
            { account_id: "", debit: "", credit: "", description: "" },
            { account_id: "", debit: "", credit: "", description: "" },
          ],
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/journals" className="hover:text-zinc-700 hover:underline">
          Журнал
        </Link>
        <span>›</span>
        <span className="text-zinc-700">{jrn.number ?? "Засах"}</span>
      </div>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
        Журнал засах — {jrn.number ?? ""}
      </h1>

      {!isManual ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Энэ нь <b>{SOURCE_LABEL[jrn.source as string] ?? jrn.source}</b> эх
          сурвалжтай <b>автомат журнал</b> тул энд засагдахгүй. Холбогдох модуль
          (Цалин, Үндсэн хөрөнгө, НӨАТ, Банк/Касс ...)-аар нь засна уу.
          <div className="mt-3">
            <Link
              href="/journals"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              ← Жагсаалт руу буцах
            </Link>
          </div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Данс олдсонгүй.
        </div>
      ) : (
        <div className="mt-6">
          <JournalForm
            accounts={accounts}
            partners={partners}
            today={jrn.date as string}
            journalId={journalId}
            initial={initial}
          />
        </div>
      )}
    </div>
  );
}
