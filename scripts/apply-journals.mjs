// journals + journal_lines хүснэгтийг Supabase Postgres-д ажиллуулна (idempotent).
// .env.local доторх SUPABASE_DB_URL холболтыг ашиглана.
//   node scripts/apply-journals.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  try {
    const txt = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch {
    /* орчны хувьсагчид найдна */
  }
}

loadEnvLocal();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL олдсонгүй. Командад env var-аар дамжуулна уу.");
  process.exit(1);
}

const schemaSql = readFileSync(join(root, "scripts", "journals-schema.sql"), "utf8");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log("→ journals-schema.sql ажиллуулж байна (idempotent)…");
  await client.query(schemaSql);
  console.log("  ✅ journals + journal_lines хүснэгт бэлэн.");
  const { rows } = await client.query("SELECT COUNT(*)::int AS n FROM journals;");
  console.log(`  ✅ journals мөр: ${rows[0].n}`);
  try {
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("  ✅ PostgREST schema cache reload илгээлээ.");
  } catch {
    /* чухал биш */
  }
  console.log("\n🎉 Бэлэн боллоо.");
} catch (e) {
  console.error("❌ Алдаа:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
