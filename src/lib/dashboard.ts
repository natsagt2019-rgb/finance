// ── Санхүүгийн дашбоардын өгөгдөл (as-of огноогоор) ──────────────────────────
// Бүх самбарыг нэг огноо (asof)-оор тооцоолно:
//   • Дансны үлдэгдэл  ← trial_balance_range RPC (closing)
//   • Орлого (сараар)  ← pnl_monthly RPC (type='income' дансууд)
//   • Авлага/Өглөгийн үлдэгдэл + насжилт ← journal_entries (+нээлттэй нэхэмжлэх)
//     receivables-calc-ийн FIFO логикоор. Өглөг нь Дт/Кт толин эсрэг.

import { createClient } from "@/lib/supabase/server";
import {
  AGING_BUCKETS,
  bucketOf,
  isPayableAccount,
  isReceivableAccount,
  normalizePartner,
  settleFifo,
  type AgingBucket,
  type DatedAmount,
} from "@/lib/receivables-calc";

const ENTRY_LIMIT = 100000;
const INVOICE_LIMIT = 5000;
const NO_PARTNER = "Тодорхойгүй";

export type PartnerBalance = {
  partnerKey: string;
  partnerName: string;
  total: number;
};

export type AgingTotals = Record<AgingBucket, number>;

export type DashboardData = {
  asof: string;
  year: number;
  // Дансны үлдэгдэл (тэгээс ялгаатай)
  accounts: { code: string; name: string; balance: number }[];
  // Орлого сараар (12 утга), нийт
  incomeMonthly: number[];
  incomeTotal: number;
  // Авлага
  receivables: PartnerBalance[];
  receivableTotal: number;
  receivableAging: AgingTotals;
  // Өглөг
  payables: PartnerBalance[];
  payableTotal: number;
  payableAging: AgingTotals;
};

type AccRow = { code: string; name: string; type: string | null; fs_line: string | null };
type DebitRow = { txn_date: string; partner_name: string | null; amount: number };
type CreditRow = { partner_name: string | null; amount: number };
type InvRow = {
  partner_name: string | null;
  inv_date: string;
  due_date: string | null;
  amount: number;
  paid_amount: number;
};

function emptyAging(): AgingTotals {
  return { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
}

// Дт/Кт мөрүүдээс харилцагч бүрийн нээлттэй (FIFO) хэсгүүдийг тооцоолно.
// roleDebitOpens=true бол авлага (Дт нээнэ, Кт хаана); эсрэг бол өглөг.
function buildAging(
  openingRows: DebitRow[], // нээдэг тал (огноотой)
  closingRows: CreditRow[], // хаадаг тал (нийт дүн)
  asof: string,
): { partners: PartnerBalance[]; aging: AgingTotals; total: number; openByKey: Map<string, DatedAmount[]> } {
  const opensByKey = new Map<string, DatedAmount[]>();
  const closeByKey = new Map<string, number>();
  const displayName = new Map<string, string>();

  for (const e of openingRows) {
    const key = normalizePartner(e.partner_name);
    if (key && !displayName.has(key) && e.partner_name)
      displayName.set(key, e.partner_name.trim());
    const arr = opensByKey.get(key) ?? [];
    arr.push({ date: e.txn_date, amount: Number(e.amount) || 0 });
    opensByKey.set(key, arr);
  }
  for (const e of closingRows) {
    const key = normalizePartner(e.partner_name);
    closeByKey.set(key, (closeByKey.get(key) ?? 0) + (Number(e.amount) || 0));
  }

  const partners: PartnerBalance[] = [];
  const aging = emptyAging();
  let total = 0;
  const openByKey = new Map<string, DatedAmount[]>();

  for (const [key, opens] of opensByKey) {
    const remaining = settleFifo(opens, closeByKey.get(key) ?? 0);
    openByKey.set(key, remaining);
    const sum = remaining.reduce((a, c) => a + c.amount, 0);
    if (sum <= 0.005) continue;
    const name = key ? displayName.get(key) ?? key : NO_PARTNER;
    partners.push({ partnerKey: key, partnerName: name, total: sum });
    total += sum;
    for (const chunk of remaining) aging[bucketOf(chunk.date, asof)] += chunk.amount;
  }

  partners.sort((a, b) => b.total - a.total);
  return { partners, aging, total, openByKey };
}

export async function loadDashboard(asof: string): Promise<DashboardData> {
  const supabase = await createClient();
  const year = Number(asof.slice(0, 4)) || new Date().getFullYear();

  const [accRes, tbrRes, pnlRes] = await Promise.all([
    supabase
      .from("accounts")
      .select("code, name, type, fs_line")
      .eq("is_active", true)
      .limit(5000),
    supabase.rpc("trial_balance_range", { d_from: `${year}-01-01`, d_to: asof }),
    supabase.rpc("pnl_monthly", { y: year }),
  ]);

  const accRows = (accRes.data as AccRow[] | null) ?? [];
  const recvCodes = accRows
    .filter((a) => isReceivableAccount(a.name, a.type, a.fs_line))
    .map((a) => a.code);
  const payCodes = accRows
    .filter((a) => isPayableAccount(a.name, a.type, a.fs_line))
    .map((a) => a.code);
  const typeByCode = new Map<string, string | null>();
  for (const a of accRows) typeByCode.set(a.code, a.type);

  // ── Дансны үлдэгдэл ──────────────────────────────────────────────────────
  const accounts = (
    (tbrRes.data as
      | { code: string; name: string | null; closing: number | null }[]
      | null) ?? []
  )
    .map((r) => ({
      code: r.code,
      name: r.name ?? "",
      balance: Number(r.closing) || 0,
    }))
    .filter((a) => Math.abs(a.balance) > 0.5)
    .sort((a, b) => a.code.localeCompare(b.code));

  // ── Орлого сараар ────────────────────────────────────────────────────────
  const incomeMonthly = Array<number>(12).fill(0);
  for (const r of (pnlRes.data as
    | { code: string; mon: number; turnover: number }[]
    | null) ?? []) {
    if (typeByCode.get(r.code) !== "income") continue;
    const m = Number(r.mon);
    if (m >= 1 && m <= 12) incomeMonthly[m - 1] += -(Number(r.turnover) || 0);
  }
  const incomeTotal = incomeMonthly.reduce((a, b) => a + b, 0);

  // ── Авлага (Дт нээнэ, Кт хаана) + нээлттэй нэхэмжлэх ──────────────────────
  let receivables: PartnerBalance[] = [];
  let receivableAging = emptyAging();
  let receivableTotal = 0;

  if (recvCodes.length > 0) {
    const [{ data: dr }, { data: cr }] = await Promise.all([
      supabase
        .from("journal_entries")
        .select("txn_date, partner_name, amount")
        .in("debit_code", recvCodes)
        .lte("txn_date", asof)
        .limit(ENTRY_LIMIT),
      supabase
        .from("journal_entries")
        .select("partner_name, amount")
        .in("credit_code", recvCodes)
        .lte("txn_date", asof)
        .limit(ENTRY_LIMIT),
    ]);

    const r = buildAging(
      (dr as DebitRow[] | null) ?? [],
      (cr as CreditRow[] | null) ?? [],
      asof,
    );
    receivables = r.partners;
    receivableAging = r.aging;
    receivableTotal = r.total;
  }

  // Нээлттэй нэхэмжлэх (нэмэлт авлага)
  const { data: invData } = await supabase
    .from("invoices")
    .select("partner_name, inv_date, due_date, amount, paid_amount")
    .eq("is_active", true)
    .neq("status", "paid")
    .limit(INVOICE_LIMIT);

  const invByKey = new Map<string, PartnerBalance>();
  for (const inv of (invData as InvRow[] | null) ?? []) {
    const remaining = (Number(inv.amount) || 0) - (Number(inv.paid_amount) || 0);
    if (remaining <= 0.005) continue;
    const dateForAging = inv.due_date || inv.inv_date;
    if (dateForAging > asof) continue; // ирээдүйн нэхэмжлэхийг тооцохгүй
    const key = normalizePartner(inv.partner_name);
    const name = key ? inv.partner_name?.trim() ?? key : NO_PARTNER;
    const cur = invByKey.get(key);
    if (cur) cur.total += remaining;
    else invByKey.set(key, { partnerKey: key, partnerName: name, total: remaining });
    receivableAging[bucketOf(dateForAging, asof)] += remaining;
    receivableTotal += remaining;
  }
  // Нэхэмжлэхийн авлагыг харилцагчийн нийт дүнд нэгтгэх
  if (invByKey.size > 0) {
    const merged = new Map<string, PartnerBalance>();
    for (const p of receivables) merged.set(p.partnerKey, { ...p });
    for (const [key, p] of invByKey) {
      const cur = merged.get(key);
      if (cur) cur.total += p.total;
      else merged.set(key, { ...p });
    }
    receivables = [...merged.values()].sort((a, b) => b.total - a.total);
  }

  // ── Өглөг (Кт нээнэ, Дт хаана) ───────────────────────────────────────────
  let payables: PartnerBalance[] = [];
  let payableAging = emptyAging();
  let payableTotal = 0;

  if (payCodes.length > 0) {
    const [{ data: cr }, { data: dr }] = await Promise.all([
      supabase
        .from("journal_entries")
        .select("txn_date, partner_name, amount")
        .in("credit_code", payCodes)
        .lte("txn_date", asof)
        .limit(ENTRY_LIMIT),
      supabase
        .from("journal_entries")
        .select("partner_name, amount")
        .in("debit_code", payCodes)
        .lte("txn_date", asof)
        .limit(ENTRY_LIMIT),
    ]);

    const p = buildAging(
      (cr as DebitRow[] | null) ?? [], // өглөгийг нээдэг тал = Кт (огноотой)
      (dr as CreditRow[] | null) ?? [], // хаадаг тал = Дт (нийт дүн)
      asof,
    );
    payables = p.partners;
    payableAging = p.aging;
    payableTotal = p.total;
  }

  return {
    asof,
    year,
    accounts,
    incomeMonthly,
    incomeTotal,
    receivables,
    receivableTotal,
    receivableAging,
    payables,
    payableTotal,
    payableAging,
  };
}
