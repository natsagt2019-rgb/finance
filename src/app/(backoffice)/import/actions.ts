"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  detectAccountId,
  normalizeFile,
  BANK_GL,
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
  currency: string;
  income: number | null;
  expense: number | null;
  income_code: string | null;
  expense_code: string | null;
  master_code: string | null;
  master_name: string | null;
  isDuplicate: boolean; // дата бейстэй тулгахад аль хэдийн орсон эсэх
};

export type FileResult = {
  filename: string;
  account_id: AccountId | null;
  count: number;
  duplicates: number;
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
    currency: t.currency ?? "MNT",
    income: t.income,
    expense: t.expense,
    income_code: t.income_code ?? null,
    expense_code: t.expense_code ?? null,
    master_code: t.master_code ?? null,
    master_name: t.master_name ?? null,
    isDuplicate: false,
  };
}

// Гүйлгээний давтагдашгүй гарын үсэг — давхардал шалгахад ашиглана.
// (transactions хүснэгтийн unique constraint-тэй ижил талбарууд.)
function fingerprint(
  accountId: string,
  txnDate: string,
  description: string | null,
  income: number | null | string,
  expense: number | null | string,
): string {
  const d = new Date(txnDate).toISOString();
  const inc = income === null || income === undefined ? "" : String(Number(income));
  const exp = expense === null || expense === undefined ? "" : String(Number(expense));
  return [accountId, d, (description ?? "").trim(), inc, exp].join("|");
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Өгөгдсөн мөрүүдтэй ижил данс + огнооны мужид DB-д аль хэдийн орсон
// гүйлгээнүүдийн fingerprint-уудыг авна.
async function existingFingerprints(
  supabase: SupabaseClient,
  rows: { account_id: string; txn_date: string }[],
): Promise<Set<string>> {
  const set = new Set<string>();
  if (rows.length === 0) return set;

  const accounts = [...new Set(rows.map((r) => r.account_id))];
  const isos = rows.map((r) => r.txn_date).sort();
  const minIso = isos[0];
  const maxIso = isos[isos.length - 1];

  const { data } = await supabase
    .from("transactions")
    .select("account_id,txn_date,description,income,expense")
    .in("account_id", accounts)
    .gte("txn_date", minIso)
    .lte("txn_date", maxIso);

  for (const r of (data as
    | {
        account_id: string;
        txn_date: string;
        description: string | null;
        income: number | null;
        expense: number | null;
      }[]
    | null) ?? []) {
    set.add(fingerprint(r.account_id, r.txn_date, r.description, r.income, r.expense));
  }
  return set;
}

// ── Урьдчилан харах: файлыг бүхэлд нь уншиж, давхардлыг тэмдэглэж буцаана ──
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

  const rows: PreviewRow[] = [];
  const fileResults: FileResult[] = [];
  // Файл бүрд аль мөрүүд нь орсныг тэмдэглэхийн тулд индекс хадгална.
  const fileRanges: { result: FileResult; start: number }[] = [];

  for (const file of files) {
    const accountId = detectAccountId(file.name);
    if (!accountId) {
      fileResults.push({
        filename: file.name,
        account_id: null,
        count: 0,
        duplicates: 0,
        error: "Файлын нэрнээс банк/данс тодорхойлж чадсангүй",
      });
      continue;
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      // Бүх мөрийг уншина (огнооны cutoff шүүлтгүй) — давхардлыг мөрөөр шалгана.
      const txns = normalizeFile(buffer, accountId, new Date(0));
      const start = rows.length;
      rows.push(...txns.map(toPreviewRow));
      const result: FileResult = {
        filename: file.name,
        account_id: accountId,
        count: txns.length,
        duplicates: 0,
      };
      fileResults.push(result);
      fileRanges.push({ result, start });
    } catch (e) {
      fileResults.push({
        filename: file.name,
        account_id: accountId,
        count: 0,
        duplicates: 0,
        error: e instanceof Error ? e.message : "Уншихад алдаа гарлаа",
      });
    }
  }

  // Давхардал тэмдэглэх — DB-д аль хэдийн орсон гүйлгээнүүдтэй тулгана.
  const dbSet = await existingFingerprints(supabase, rows);
  for (const r of rows) {
    const fp = fingerprint(r.account_id, r.txn_date, r.description, r.income, r.expense);
    r.isDuplicate = dbSet.has(fp);
  }

  // Файл бүрийн давхардлын тоог тоолно.
  for (let i = 0; i < fileRanges.length; i++) {
    const { result, start } = fileRanges[i];
    const end = i + 1 < fileRanges.length ? fileRanges[i + 1].start : rows.length;
    result.duplicates = rows.slice(start, end).filter((r) => r.isDuplicate).length;
  }

  // Огноогоор эрэмбэлж (шинэ нь дээр) буцаана.
  rows.sort((a, b) => b.txn_date.localeCompare(a.txn_date));

  return { rows, files: fileResults };
}

// ── Батлах: зөвхөн ШИНЭ мөрүүдийг transactions-д бичнэ (давхардлыг алгасна) ──
export async function commitImport(rows: PreviewRow[]): Promise<CommitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");

  if (rows.length === 0) return { added: 0, skipped: 0 };

  // Батлахаас өмнө дахин DB-тэй тулгана (UI-аас хамааралгүй, найдвартай).
  const dbSet = await existingFingerprints(supabase, rows);
  const newRows = rows.filter(
    (r) => !dbSet.has(fingerprint(r.account_id, r.txn_date, r.description, r.income, r.expense)),
  );

  if (newRows.length === 0) {
    return { added: 0, skipped: rows.length };
  }

  const dbRows = newRows.map((r) => {
    // Банкны тал (харилцах дансны өөрийн код) авто: орлого→Дт, зарлага→Кт.
    const bankCode = BANK_GL[r.account_id] ?? null;
    return {
      account_id: r.account_id,
      company: r.company,
      bank: r.bank,
      txn_date: r.txn_date,
      description: r.description,
      counterparty: r.counterparty,
      account_no: r.account_no,
      exchange_rate: r.exchange_rate,
      currency: r.currency,
      income: r.income,
      expense: r.expense,
      income_code: r.income_code,
      expense_code: r.expense_code,
      debit_code: r.income != null ? bankCode : null,
      credit_code: r.expense != null ? bankCode : null,
      master_code: r.master_code,
      master_name: r.master_name,
    };
  });

  const { data, error } = await supabase.from("transactions").insert(dbRows).select();
  if (error) throw new Error(`Хадгалахад алдаа: ${error.message}`);

  const added = data?.length ?? 0;
  const skipped = rows.length - added;

  // Холбоотой тайлангуудыг шинэчлэх.
  revalidatePath("/statements");
  revalidatePath("/reports/cashflow");
  revalidatePath("/cash/bank-summary");

  return { added, skipped };
}
