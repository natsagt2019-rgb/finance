import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { JournalForm, type JournalInitial } from "../journal-form";
import { DeleteJournalButton } from "../delete-button";
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

  const [
    { data: jrn },
    { data: lineRows },
    { data: accRows },
    { data: partRows },
    { data: bankRows },
    { data: cashRegRows },
    { data: linkedTxns },
    { data: linkedCash },
  ] = await Promise.all([
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
    supabase.from("bank_accounts").select("account_no, gl_code"),
    supabase.from("cash_registers").select("id, account_id"),
    supabase
      .from("transactions")
      .select("id, account_id, income, expense, exchange_rate")
      .eq("journal_id", journalId),
    supabase.from("cash_entries").select("id, register_id, type, amount_mnt").eq("journal_id", journalId),
  ]);

  if (!jrn) notFound();

  const accounts = (accRows as AccountOption[] | null) ?? [];
  const partners = (partRows as { id: number; name: string }[] | null) ?? [];

  // Касс/банкны GL кодууд (шинэ хуудастай адил) + холбогдсон гүйлгээ сэргээх.
  const acctNoToGl = new Map(
    ((bankRows as { account_no: string; gl_code: string | null }[] | null) ?? []).map((b) => [
      b.account_no,
      b.gl_code,
    ]),
  );
  const bankCodes = [...acctNoToGl.values()].filter((c): c is string => !!c);
  const regIdToAccId = new Map(
    ((cashRegRows as { id: number; account_id: number | null }[] | null) ?? []).map((r) => [
      r.id,
      r.account_id,
    ]),
  );
  const accIdToCode = new Map(accounts.map((a) => [a.id, a.code]));
  const cashAccIds = new Set(
    [...regIdToAccId.values()].filter((x): x is number => x != null),
  );
  const cashCodes = accounts.filter((a) => cashAccIds.has(a.id)).map((a) => a.code);
  const cashBankCodes = [...new Set([...bankCodes, ...cashCodes])];

  // Холбогдсон гүйлгээг (код|чиглэл|MNT дүн) түлхүүрээр индексжүүлж, мөрд тааруулна.
  const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
  const linkKey = (code: string, dir: "in" | "out", amt: number) => `${code}|${dir}|${round2(amt)}`;
  const linkByKey = new Map<string, { source: "bank" | "cash"; id: number }>();
  for (const t of (linkedTxns as {
    id: number; account_id: string; income: number | null; expense: number | null; exchange_rate: number | null;
  }[] | null) ?? []) {
    const gl = acctNoToGl.get(t.account_id);
    if (!gl) continue;
    const inc = Number(t.income) || 0;
    const exp = Number(t.expense) || 0;
    const rate = Number(t.exchange_rate) || 1;
    linkByKey.set(linkKey(gl, inc > 0 ? "in" : "out", (inc || exp) * rate), { source: "bank", id: t.id });
  }
  for (const e of (linkedCash as {
    id: number; register_id: number; type: string; amount_mnt: number;
  }[] | null) ?? []) {
    const accId = regIdToAccId.get(e.register_id);
    const code = accId != null ? accIdToCode.get(accId) : undefined;
    if (!code) continue;
    linkByKey.set(linkKey(code, e.type === "in" ? "in" : "out", Number(e.amount_mnt)), { source: "cash", id: e.id });
  }
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
        ? lines.map((l) => {
            const code = l.account_id != null ? accIdToCode.get(l.account_id) : undefined;
            let link: { source: "bank" | "cash"; id: number } | null = null;
            if (code && cashBankCodes.includes(code)) {
              const dr = Number(l.debit) || 0;
              const cr = Number(l.credit) || 0;
              const dir = dr > 0 ? "in" : "out";
              link = linkByKey.get(linkKey(code, dir, dr > 0 ? dr : cr)) ?? null;
            }
            return {
              account_id: l.account_id != null ? String(l.account_id) : "",
              debit: fmtNum(toFx(Number(l.debit) || 0)),
              credit: fmtNum(toFx(Number(l.credit) || 0)),
              description: l.description ?? "",
              link,
            };
          })
        : [
            { account_id: "", debit: "", credit: "", description: "", link: null },
            { account_id: "", debit: "", credit: "", description: "", link: null },
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
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Журнал засах — {jrn.number ?? ""}
        </h1>
        <DeleteJournalButton
          id={journalId}
          number={(jrn.number as string | null) ?? ""}
          redirectTo="/journals"
        />
      </div>

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
            cashBankCodes={cashBankCodes}
          />
        </div>
      )}
    </div>
  );
}
