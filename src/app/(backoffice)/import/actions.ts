"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  detectAccountId,
  normalizeFile,
  type AccountId,
  type NormalizedTxn,
} from "@/lib/bank-importer";

// Client ↔ server хооронд дамжих мөр (txn_date нь ISO string).
export type PreviewRow = {
  account_id: AccountId;
  company: string;
  bank: string;
  txn_date: string; // ISO
  description: string;
  counterparty: string;
  account_no: string;
  exchange_rate: number;
  income: number | null;
  expense: number | null;
  income_code: string | null;
  expense_code: string | null;
  master_code: string | null;
  master_name: string | null;
};

export type FileResult = {
  filename: string;
  account_id: AccountId | null;
  count: number;
  error?: string;
};

export type PreviewResult = {
  rows: PreviewRow[];
  files: FileResult[];
};

export type CommitResult = {
  added: number;
  skipped: number;
};

// GM нь TT-тэй ижил cutoff ашиглана (importer.py-тэй адил).
function cutoffKey(accountId: AccountId): AccountId {
  return accountId === "GM" ? "TT" : accountId;
}

function toPreviewRow(t: NormalizedTxn): PreviewRow {
  return {
    account_id: t.account_id,
    company: t.company ?? "",
    bank: t.bank,
    txn_date: t.txn_date.toISOString(),
    description: t.description,
    counterparty: t.counterparty,
    account_no: t.account_no,
    exchange_rate: t.exchange_rate,
    income: t.income,
    expense: t.expense,
    income_code: t.income_code ?? null,
    expense_code: t.expense_code ?? null,
    master_code: t.master_code ?? null,
    master_name: t.master_name ?? null,
  };
}

// ── Урьдчилан харах: файл уншиж нормчилсон мөр буцаана (DB-д бичихгүй) ────
export async function previewImport(formData: FormData): Promise<PreviewResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return { rows: [], files: [] };
  }

  // cutoff-уудыг key тус бүрээр нэг л удаа уншина.
  const cutoffCache = new Map<AccountId, Date>();
  async function getCutoff(accountId: AccountId): Promise<Date> {
    const key = cutoffKey(accountId);
    const cached = cutoffCache.get(key);
    if (cached) return cached;

    const { data } = await supabase
      .from("cutoffs")
      .select("last_txn_at")
      .eq("account_id", key)
      .maybeSingle();

    // Cutoff олдоогүй бол бүх түүхийг авна (анхны import).
    const cutoff = data?.last_txn_at ? new Date(data.last_txn_at) : new Date(0);
    cutoffCache.set(key, cutoff);
    return cutoff;
  }

  const rows: PreviewRow[] = [];
  const fileResults: FileResult[] = [];

  for (const file of files) {
    const accountId = detectAccountId(file.name);
    if (!accountId) {
      fileResults.push({
        filename: file.name,
        account_id: null,
        count: 0,
        error: "Файлын нэрнээс банк/данс тодорхойлж чадсангүй",
      });
      continue;
    }

    try {
      const cutoff = await getCutoff(accountId);
      const buffer = Buffer.from(await file.arrayBuffer());
      const txns = normalizeFile(buffer, accountId, cutoff);
      const previewRows = txns.map(toPreviewRow);
      rows.push(...previewRows);
      fileResults.push({
        filename: file.name,
        account_id: accountId,
        count: previewRows.length,
      });
    } catch (e) {
      fileResults.push({
        filename: file.name,
        account_id: accountId,
        count: 0,
        error: e instanceof Error ? e.message : "Уншихад алдаа гарлаа",
      });
    }
  }

  // Огноогоор эрэмбэлж (шинэ нь дээр) буцаана.
  rows.sort((a, b) => b.txn_date.localeCompare(a.txn_date));

  return { rows, files: fileResults };
}

// ── Батлах: зассан мөрүүдийг transactions-д бичиж cutoff шинэчилнэ ─────────
export async function commitImport(rows: PreviewRow[]): Promise<CommitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");

  if (rows.length === 0) return { added: 0, skipped: 0 };

  // DB баганад тохирох мөр (month/year нь generated, id/created_at auto).
  const dbRows = rows.map((r) => ({
    account_id: r.account_id,
    company: r.company,
    bank: r.bank,
    txn_date: r.txn_date,
    description: r.description,
    counterparty: r.counterparty,
    account_no: r.account_no,
    exchange_rate: r.exchange_rate,
    income: r.income,
    expense: r.expense,
    income_code: r.income_code,
    expense_code: r.expense_code,
    master_code: r.master_code,
    master_name: r.master_name,
  }));

  // Давхардлыг alгасна (importer.py: on_conflict skip).
  const { data, error } = await supabase
    .from("transactions")
    .upsert(dbRows, {
      onConflict: "account_id,txn_date,description,income,expense",
      ignoreDuplicates: true,
    })
    .select();

  if (error) throw new Error(`Хадгалахад алдаа: ${error.message}`);

  const added = data?.length ?? 0;
  const skipped = dbRows.length - added;

  // Cutoff шинэчлэх — cutoff key тус бүрийн max(txn_date), өсөх тал руу л.
  const maxByKey = new Map<AccountId, string>();
  for (const r of rows) {
    const key = cutoffKey(r.account_id);
    const cur = maxByKey.get(key);
    if (!cur || r.txn_date > cur) maxByKey.set(key, r.txn_date);
  }

  for (const [key, maxIso] of maxByKey) {
    const { data: existing } = await supabase
      .from("cutoffs")
      .select("last_txn_at")
      .eq("account_id", key)
      .maybeSingle();

    const existingIso = existing?.last_txn_at
      ? new Date(existing.last_txn_at).toISOString()
      : null;

    if (!existingIso || maxIso > existingIso) {
      await supabase.from("cutoffs").upsert({
        account_id: key,
        last_txn_at: maxIso,
        updated_at: new Date().toISOString(),
      });
    }
  }

  // Дансны хуулга хуудсыг шинэчлэх.
  revalidatePath("/statements");

  return { added, skipped };
}
