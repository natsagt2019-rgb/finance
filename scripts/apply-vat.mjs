// vat_records хүснэгтийг Supabase Postgres-д ажиллуулна (idempotent).
// .env.local доторх SUPABASE_DB_URL холболтыг ашиглана.
//
// Ажиллуулах:
//   node scripts/apply-vat.mjs
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
    /* .env.local байхгүй бол орчны хувьсагчид найдна. */
  }
}

loadEnvLocal();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error(
    "❌ SUPABASE_DB_URL олдсонгүй. .env.local-д нэмнэ үү (apply-partners.mjs-тэй ижил).",
  );
  process.exit(1);
}

const schemaSql = readFileSync(join(root, "scripts", "vat-schema.sql"), "utf8");

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  console.log("→ vat-schema.sql ажиллуулж байна (idempotent)…");
  await client.query(schemaSql);
  console.log("  ✅ vat_records хүснэгт + индексүүд бэлэн.");

  const { rows } = await client.query(
    "SELECT COUNT(*)::int AS n FROM vat_records;",
  );
  console.log(`  ✅ vat_records мөр: ${rows[0].n}`);

  try {
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("  ✅ PostgREST schema cache reload илгээлээ.");
  } catch {
    /* чухал биш */
  }

  console.log("\n🎉 Бэлэн боллоо. /vat хуудсаа дахин ачаална уу.");
} catch (e) {
  console.error("❌ Алдаа:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
