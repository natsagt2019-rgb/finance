// SQL файлыг SUPABASE_DB_URL руу ажиллуулна (schema migration).
//   node scripts/apply-sql.mjs scripts/cash-schema.sql
import { readFileSync } from "node:fs";
import pg from "pg";

// .env.local-оос орчны хувьсагч уншина.
const txt = readFileSync(".env.local", "utf8");
for (const l of txt.split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

const file = process.argv[2];
if (!file) {
  console.error("Хэрэглээ: node scripts/apply-sql.mjs <файл.sql>");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL олдсонгүй (.env.local).");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log(`✓ Ажиллаа: ${file}`);
} catch (e) {
  console.error(`✗ Алдаа: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
