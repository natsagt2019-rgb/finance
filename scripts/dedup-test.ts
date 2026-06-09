// Давхардал илрүүлэлтийн end-to-end тест:
// DB дэх жинхэнэ GM гүйлгээнүүдээс Golomt-форматын файл сэргээж, parse хийгээд
// fingerprint нь DB-тэй таарч "давхардал" гэж зөв илрэхийг шалгана.
// PROJECT_REF, PGPASSWORD орчны хувьсагч.
import * as XLSX from "xlsx";
import pg from "pg";
import { normalizeFile } from "../src/lib/bank-importer/index";

// actions.ts доторх fingerprint-тэй ИЖИЛ алгоритм.
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

async function main() {
const client = new pg.Client({
  host: "aws-1-ap-southeast-2.pooler.supabase.com",
  port: 5432,
  user: `postgres.${process.env.PROJECT_REF}`,
  password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// GM-ийн 2026 оны гүйлгээнүүд
const { rows: dbRows } = await client.query(
  `select txn_date, description, counterparty, account_no, income, expense
   from transactions where account_id='GM' and year=2026
   order by txn_date limit 25;`,
);
console.log(`DB-аас GM гүйлгээ: ${dbRows.length}`);

// DB fingerprint олонлог
const dbSet = new Set<string>();
for (const r of dbRows) {
  dbSet.add(fingerprint("GM", r.txn_date.toISOString(), r.description, r.income, r.expense));
}

// Golomt-формат файл сэргээх (date=1, desc=2, ctpy=3, acct=4, income=6, expense=7)
const aoa: unknown[][] = [["№", "Огноо", "Утга", "Харилцагч", "Данс", "Вал", "Орлого", "Зарлага"]];
for (const r of dbRows) {
  const row = new Array(8).fill(null);
  row[1] = r.txn_date.toISOString();
  row[2] = r.description;
  row[3] = r.counterparty;
  row[4] = r.account_no;
  row[6] = r.income != null ? Number(r.income) : null;
  row[7] = r.expense != null ? Number(r.expense) : null;
  aoa.push(row);
}
// Нэг ЗОРИУД шинэ мөр (дүнг өөрчилсөн) — давхардал биш байх ёстой
if (dbRows.length) {
  const r = dbRows[0];
  const row = new Array(8).fill(null);
  row[1] = r.txn_date.toISOString();
  row[2] = r.description;
  row[6] = r.income != null ? Number(r.income) + 7 : 999;
  aoa.push(row);
}

const ws = XLSX.utils.aoa_to_sheet(aoa);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

// Parse + давхардал тэмдэглэх
const parsed = normalizeFile(buf, "GM", new Date(0));
let dup = 0;
let fresh = 0;
for (const t of parsed) {
  const fp = fingerprint("GM", t.txn_date.toISOString(), t.description, t.income, t.expense);
  if (dbSet.has(fp)) dup++;
  else fresh++;
}

console.log(`Parse хийсэн мөр: ${parsed.length}`);
console.log(`  давхардал илэрсэн: ${dup}  (хүлээгдсэн: ${dbRows.length})`);
console.log(`  шинэ (давхардалгүй): ${fresh}  (хүлээгдсэн: 1 — зориуд өөрчилсөн мөр)`);
console.log(
  dup === dbRows.length && fresh === 1
    ? "\n✅ PASS — давхардал зөв илэрч, шинэ мөр зөв ялгарлаа."
    : "\n⚠️ Үр дүн хүлээлттэй таарсангүй (доор шалга).",
);

await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
