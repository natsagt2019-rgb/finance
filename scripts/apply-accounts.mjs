// Дансны төлөвлөгөө (accounts) + санхүүгийн тайлангийн хүснэгтүүдийг Supabase-д
// оруулна: schema.sql (accounts, trial_balances, cash_flow_lines, view-үүд) +
// accounts-seed.sql (бодит 159 данс). .env.local доторх SUPABASE_DB_URL ашиглана.
//
// Ажиллуулах:  node scripts/apply-accounts.mjs
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
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch {
    /* орчны хувьсагчид найдна */
  }
}

loadEnvLocal();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL олдсонгүй (.env.local).");
  process.exit(1);
}

const schemaSql = readFileSync(join(root, "bank_importer", "schema.sql"), "utf8");
const seedSql = readFileSync(join(root, "scripts", "accounts-seed.sql"), "utf8");

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  console.log("→ schema.sql ажиллуулж байна (idempotent)…");
  await client.query(schemaSql);
  console.log("  ✅ accounts / trial_balances / cash_flow_lines + view-үүд бэлэн.");

  const before = (
    await client.query("SELECT COUNT(*)::int AS n FROM accounts;")
  ).rows[0].n;
  console.log(`  ℹ accounts хүснэгтэд одоо ${before} данс байна.`);

  console.log("→ accounts-seed.sql ажиллуулж байна…");
  await client.query(seedSql);

  const after = (
    await client.query("SELECT COUNT(*)::int AS n FROM accounts;")
  ).rows[0].n;

  if (before > 0 && after === before) {
    console.log(
      `  ⚠ Хүснэгт хоосон биш байсан тул seed алгассан (${after} данс хэвээр).\n` +
        "    Шинээр сольж оруулах бол эхлээд: TRUNCATE accounts CASCADE;",
    );
  } else {
    console.log(`  ✅ Дансны төлөвлөгөө орлоо. Нийт: ${after} данс.`);
    const byFs = (
      await client.query(
        "SELECT COUNT(*)::int AS n FROM accounts WHERE fs_line IS NOT NULL;",
      )
    ).rows[0].n;
    console.log(`  ✅ Тайлангийн мөртэй холбогдсон: ${byFs} данс.`);
  }

  try {
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("  ✅ PostgREST schema cache reload илгээлээ.");
  } catch {
    /* чухал биш */
  }

  console.log("\n🎉 Бэлэн. /accounts болон /reports/* хуудсуудаа ачаална уу.");
} catch (e) {
  console.error("❌ Алдаа:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
