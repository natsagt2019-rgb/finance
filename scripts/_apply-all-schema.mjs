// Шинэ хоосон DB-д бүх schema-г зөв дарааллаар ажиллуулна (зөвхөн DDL/функц, seed өгөгдөлгүй).
// Хэрэглээ: node scripts/_apply-all-schema.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// .env.local-аас SUPABASE_DB_URL уншина (process.env-д байхгүй бол)
let dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  const env = readFileSync(join(root, ".env.local"), "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("SUPABASE_DB_URL"));
  dbUrl = line.slice(line.indexOf("=") + 1).trim().replace(/^"|"$/g, "");
}

// Хамаарлын дараалал: суурь → модулиуд → alter → функц
const FILES = [
  "bank_importer/schema.sql",          // partners, accounts, journal_entries, invoices, ...
  "scripts/journals-schema.sql",       // journals, journal_lines
  "scripts/salary-schema.sql",         // employees, salary_records, salary_settings
  "scripts/cash-schema.sql",           // cash_registers, cash_entries, cash_settings
  "scripts/assets-schema.sql",         // asset_categories, assets, asset_depreciation
  "scripts/fx-schema.sql",             // fx_revaluations
  "scripts/vat-schema.sql",            // vat_records
  "scripts/inventory-schema.sql",      // inv_items, inv_moves, inv_counts, inv_settings
  "scripts/staff-receivables-schema.sql", // staff_receivables (employees + inv_moves + salary_records-аас хамаарна)
  "scripts/company-settings-schema.sql",  // үндсэн байгууллагын мэдээлэл (нэг мөр)
  "scripts/invoice-lines-schema.sql",     // нэхэмжлэлийн мөр (line items)
  "scripts/bank-accounts-schema.sql",     // банкны данс (хуулга цэгцлэгч)
  "scripts/cash-entries-extra-cols.sql",
  "scripts/cash-entries-partner-cols.sql",
  "scripts/journal-entries-source-id.sql",
  "scripts/asset-expense-account.sql",
  "scripts/partner-pnorm-merge.sql",  // pnorm() функцийг эхэлж үүсгэнэ
  "scripts/partner-merge-rpc.sql",    // pnorm()-аас хамаарна
  "scripts/worksheet-rpc.sql",
  "scripts/trial-balance-full-range.sql", // trial_balance_full_range (by-type тайлан)
];

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("🔌 Холбогдлоо\n");

for (const f of FILES) {
  const sql = readFileSync(join(root, f), "utf8");
  try {
    await client.query(sql);
    console.log("✅", f);
  } catch (e) {
    console.error("❌", f, "→", e.message);
  }
}

const { rows } = await client.query(
  `select table_name from information_schema.tables
   where table_schema='public' and table_type='BASE TABLE' order by 1`,
);
console.log(`\n📊 Нийт хүснэгт: ${rows.length}`);
console.log(rows.map((r) => r.table_name).join(", "));

await client.end();
