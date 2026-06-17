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
// Түлхүүр: данс + БҮТЭН timestamp + нормчилсон тайлбар + орлого + зарлага.
//
// Яагаад БҮТЭН timestamp (огноо-only биш):
//   Цаг л жинхэнэ ялгагч. Ижил гүйлгээг дахин импортлоход банк ижил timestamp
//   өгдөг тул барина. Харин ижил дүн/тайлбартай ч ӨӨР хүнд хийсэн бодит гүйлгээ
//   (ж: 2 ажилтны "урьдчилгаа цалин" 1,120,000) өөр timestamp-тай тул нэгдэхгүй.
//   Огноо-only бол эдгээрийг хуурамчаар нэгтгэж, бодит гүйлгээг устгана.
// Яагаад ХАРИЛЦАГЧГҮЙ:
//   Парсер хувилбар бүр харилцагчийн нэрийг тайлбараас өөрөөр сугалдаг
//   (ж: "ЦЭЦЭНС МАЙНИНГ" vs "ЦЭЦЭНС МАЙНИНГ ЭНД ЭНЕРЖИ") тул найдваргүй.
// Яагаад тайлбарын зайг нормчилдог:
//   Парсер tab/олон зайг өөр өөрөөр тавьдаг ("K3⇥..." vs "K3␣␣␣...") тул
//   нормчлохгүй бол ижил гүйлгээ давхардаж байв.
function fingerprint(
  accountId: string,
  txnDate: string,
  description: string | null,
  income: number | null | string,
  expense: number | null | string,
  _counterparty: string | null = null,
): string {
  const inc = income === null || income === undefined ? "" : String(Number(income));
  const exp = expense === null || expense === undefined ? "" : String(Number(expense));
  const desc = (description ?? "").trim().replace(/\s+/g, " ");
  const d = new Date(txnDate).toISOString();
  return [accountId, d, desc, inc, exp].join("|");
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
  // Мужийг ±1 өдөр өргөтгөнө — timestamp-ийн timezone зөрүү (8 цаг) бүхий
  // давхардсан мөрүүд мужаас гарч мултрахаас сэргийлнэ.
  const DAY = 86400000;
  const minIso = new Date(new Date(isos[0]).getTime() - DAY).toISOString();
  const maxIso = new Date(new Date(isos[isos.length - 1]).getTime() + DAY).toISOString();

  // PostgREST нэг хүсэлтэд дээд тал нь 1000 мөр буцаадаг тул бүх мөрийг
  // хуудаслаж татна. Эс бөгөөс муж 1000-аас олон мөртэй үед DB-д БАЙГАА
  // гүйлгээ dbSet-д ороогүй үлдэж, давхардлыг алдаж дахин импортолно.
  const PAGE = 1000;
  type Row = {
    account_id: string;
    txn_date: string;
    description: string | null;
    income: number | null;
    expense: number | null;
    counterparty: string | null;
  };
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("account_id,txn_date,description,income,expense,counterparty")
      .in("account_id", accounts)
      .gte("txn_date", minIso)
      .lte("txn_date", maxIso)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = (data as Row[] | null) ?? [];
    for (const r of batch) {
      set.add(
        fingerprint(r.account_id, r.txn_date, r.description, r.income, r.expense, r.counterparty),
      );
    }
    if (batch.length < PAGE) break;
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

  // Давхардал тэмдэглэх — DB-д орсонтой БА нэг багц доторх давхардал (ижил мөр
  // дахин). Багцад анх тохиолдсон нь хэвээр, давтагдсан нь давхардал болно.
  const dbSet = await existingFingerprints(supabase, rows);
  const seen = new Set<string>();
  for (const r of rows) {
    const fp = fingerprint(
      r.account_id, r.txn_date, r.description, r.income, r.expense, r.counterparty,
    );
    r.isDuplicate = dbSet.has(fp) || seen.has(fp);
    seen.add(fp);
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

  // Батлахаас өмнө дахин шалгана: DB-тэй тулгах БА нэг багц доторх давхардлыг
  // (ижил мөр 2 удаа) алгасах. UI-аас хамааралгүй, найдвартай.
  const dbSet = await existingFingerprints(supabase, rows);
  const seen = new Set<string>();
  const newRows = rows.filter((r) => {
    const fp = fingerprint(
      r.account_id, r.txn_date, r.description, r.income, r.expense, r.counterparty,
    );
    if (dbSet.has(fp) || seen.has(fp)) return false; // DB эсвэл багц доторх давхардал
    seen.add(fp);
    return true;
  });

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
