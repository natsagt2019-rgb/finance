// ── Авлага/өглөгийн нээлттэй зүйлсийг ачаалах (server) ───────────────────────
// Насжилтын хуудас (/receivables, /payables) болон насжилтын дэлгэрэнгүй
// тайлангууд НЭГ эх сурвалжаас тооцоолохын тулд энд төвлөрүүлэв. Логик нь:
//   • Авлага: авлагын дансны Дт (огноотой) − Кт (нийт) → FIFO хаалт + нээлттэй
//     нэхэмжлэх. Өглөг: өглөгийн дансны Кт (огноотой) − Дт (нийт) → FIFO хаалт.
//   • Харилцагчийг нэрээр нь нормчилж (normalizePartner) бүлэглэнэ.
// PostgREST 1000-мөр cap-аас зайлсхийхийн тулд .range()-ээр бүрэн хуудаслана.

import { createClient } from "@/lib/supabase/server";
import {
  isPayableAccount,
  isReceivableAccount,
  normalizePartner,
  settleFifo,
  type DatedAmount,
  type ReceivableItem,
} from "@/lib/receivables-calc";

type SB = Awaited<ReturnType<typeof createClient>>;

const NO_PARTNER = "Тодорхойгүй (партнергүй)";
const INVOICE_LIMIT = 5000;

type AccRow = { code: string; name: string; type: string | null; fs_line: string | null };
type EntryRow = { txn_date: string; partner_name: string | null; amount: number };
type InvRow = {
  partner_name: string | null;
  inv_date: string;
  due_date: string | null;
  amount: number;
  paid_amount: number;
};

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const PAGE = 1000;
  const rows: T[] = [];
  for (let offset = 0; offset < 1_000_000; offset += PAGE) {
    const { data } = await build(offset, offset + PAGE - 1);
    const page = (data as T[] | null) ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

// Авлагын нээлттэй зүйлс (журнал FIFO + нээлттэй нэхэмжлэх).
export async function loadReceivableItems(supabase: SB, today: string): Promise<ReceivableItem[]> {
  const { data: accData } = await supabase
    .from("accounts")
    .select("code, name, type, fs_line")
    .eq("is_active", true)
    .limit(5000);
  const recvCodes = ((accData as AccRow[] | null) ?? [])
    .filter((a) => isReceivableAccount(a.name, a.type, a.fs_line))
    .map((a) => a.code);

  const jDebits = new Map<string, DatedAmount[]>();
  const jCredit = new Map<string, number>();
  const displayName = new Map<string, string>();

  if (recvCodes.length > 0) {
    const [dr, cr] = await Promise.all([
      fetchAll<EntryRow>((from, to) =>
        supabase
          .from("journal_entries")
          .select("txn_date, partner_name, amount")
          .in("debit_code", recvCodes)
          .lte("txn_date", today)
          .range(from, to)),
      fetchAll<{ partner_name: string | null; amount: number }>((from, to) =>
        supabase
          .from("journal_entries")
          .select("partner_name, amount")
          .in("credit_code", recvCodes)
          .lte("txn_date", today)
          .range(from, to)),
    ]);

    for (const e of dr) {
      const key = normalizePartner(e.partner_name);
      if (key && !displayName.has(key) && e.partner_name) displayName.set(key, e.partner_name.trim());
      const arr = jDebits.get(key) ?? [];
      arr.push({ date: e.txn_date, amount: Number(e.amount) || 0 });
      jDebits.set(key, arr);
    }
    for (const e of cr) {
      const key = normalizePartner(e.partner_name);
      jCredit.set(key, (jCredit.get(key) ?? 0) + (Number(e.amount) || 0));
    }
  }

  const items: ReceivableItem[] = [];

  // Нээлттэй нэхэмжлэх (дэлгэцийн нэрний цэвэр бичлэг давамгайлахаар эхэлж).
  const { data: invData } = await supabase
    .from("invoices")
    .select("partner_name, inv_date, due_date, amount, paid_amount")
    .eq("is_active", true)
    .neq("status", "paid")
    .limit(INVOICE_LIMIT);

  for (const r of (invData as InvRow[] | null) ?? []) {
    const remaining = (Number(r.amount) || 0) - (Number(r.paid_amount) || 0);
    if (remaining <= 0.005) continue;
    const key = normalizePartner(r.partner_name);
    if (key && !displayName.has(key) && r.partner_name) displayName.set(key, r.partner_name.trim());
    items.push({
      partnerKey: key,
      partnerName: key ? displayName.get(key) ?? r.partner_name ?? NO_PARTNER : NO_PARTNER,
      amount: remaining,
      date: r.due_date || r.inv_date,
      source: "invoice",
    });
  }

  // Журналын авлага — харилцагч бүрээр FIFO хаалт.
  for (const [key, debits] of jDebits) {
    const open = settleFifo(debits, jCredit.get(key) ?? 0);
    const name = key ? displayName.get(key) ?? key : NO_PARTNER;
    for (const chunk of open) {
      items.push({ partnerKey: key, partnerName: name, amount: chunk.amount, date: chunk.date, source: "journal" });
    }
  }

  return items;
}

// Өглөгийн нээлттэй зүйлс (журнал FIFO).
export async function loadPayableItems(supabase: SB, today: string): Promise<ReceivableItem[]> {
  const { data: accData } = await supabase
    .from("accounts")
    .select("code, name, type, fs_line")
    .eq("is_active", true)
    .limit(5000);
  const payCodes = ((accData as AccRow[] | null) ?? [])
    .filter((a) => isPayableAccount(a.name, a.type, a.fs_line))
    .map((a) => a.code);

  const jCreated = new Map<string, DatedAmount[]>();
  const jPaid = new Map<string, number>();
  const displayName = new Map<string, string>();

  if (payCodes.length > 0) {
    const [cr, dr] = await Promise.all([
      fetchAll<EntryRow>((from, to) =>
        supabase
          .from("journal_entries")
          .select("txn_date, partner_name, amount")
          .in("credit_code", payCodes)
          .lte("txn_date", today)
          .range(from, to)),
      fetchAll<{ partner_name: string | null; amount: number }>((from, to) =>
        supabase
          .from("journal_entries")
          .select("partner_name, amount")
          .in("debit_code", payCodes)
          .lte("txn_date", today)
          .range(from, to)),
    ]);

    for (const e of cr) {
      const key = normalizePartner(e.partner_name);
      if (key && !displayName.has(key) && e.partner_name) displayName.set(key, e.partner_name.trim());
      const arr = jCreated.get(key) ?? [];
      arr.push({ date: e.txn_date, amount: Number(e.amount) || 0 });
      jCreated.set(key, arr);
    }
    for (const e of dr) {
      const key = normalizePartner(e.partner_name);
      jPaid.set(key, (jPaid.get(key) ?? 0) + (Number(e.amount) || 0));
    }
  }

  const items: ReceivableItem[] = [];
  for (const [key, created] of jCreated) {
    const open = settleFifo(created, jPaid.get(key) ?? 0);
    const name = key ? displayName.get(key) ?? key : NO_PARTNER;
    for (const chunk of open) {
      items.push({ partnerKey: key, partnerName: name, amount: chunk.amount, date: chunk.date, source: "journal" });
    }
  }

  return items;
}
