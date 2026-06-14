// ============================================================
// SQL файл(ууд)-ыг Supabase DB-д дараалан ажиллуулах энгийн runner.
// Дуудлага:  node scripts/run-sql.mjs scripts/a.sql scripts/b.sql
// .env.local-аас SUPABASE_DB_URL уншина. SQL нь идемпотент байх ёстой.
// ============================================================
import { readFileSync } from "node:fs";
import pg from "pg";

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

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Файл заагаагүй. Ж: node scripts/run-sql.mjs scripts/x.sql");
  process.exit(1);
}

const c = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await c.connect();
  for (const f of files) {
    const sql = readFileSync(f, "utf8");
    process.stdout.write(`▶ ${f} … `);
    await c.query(sql);
    console.log("OK");
  }
  console.log("Бүх SQL амжилттай ажиллалаа.");
} catch (e) {
  console.error("\nАлдаа:", e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
