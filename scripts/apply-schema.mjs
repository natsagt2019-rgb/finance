// bank_importer/schema.sql-ийг Supabase Postgres-д ажиллуулна.
// Холболтыг орчны хувьсагчаар дамжуулна (диск рүү бичихгүй). Хоёр арга:
//   1) SUPABASE_DB_URL="postgresql://..." node scripts/apply-schema.mjs
//   2) PGHOST/PGUSER/PGPASSWORD/PGPORT/PGDATABASE тус тусдаа (нууц үгэнд @ байвал)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, "..", "bank_importer", "schema.sql");

const sql = readFileSync(sqlPath, "utf8");

// SUPABASE_DB_URL байвал тэр, эсвэл PG* орчны хувьсагчдыг pg өөрөө уншина.
const client = new pg.Client(
  process.env.SUPABASE_DB_URL
    ? { connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } }
    : { ssl: { rejectUnauthorized: false } },
);

try {
  await client.connect();
  await client.query(sql); // schema.sql нь idempotent (IF NOT EXISTS / OR REPLACE)
  console.log("✅ Schema амжилттай ажиллалаа.");

  const { rows } = await client.query(
    `select table_name from information_schema.tables
     where table_schema = 'public'
       and table_name in ('transactions','cutoffs','account_balances')
     order by table_name;`,
  );
  console.log("Үүссэн хүснэгтүүд:", rows.map((r) => r.table_name).join(", "));

  const { rows: cut } = await client.query(
    "select account_id, last_txn_at from cutoffs order by account_id;",
  );
  console.log("cutoffs seed:", JSON.stringify(cut));
} catch (e) {
  console.error("❌ Алдаа:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
