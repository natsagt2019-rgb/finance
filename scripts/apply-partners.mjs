// partners хүснэгт + view + 931 seed-ийг Supabase Postgres-д ажиллуулна.
// .env.local доторх SUPABASE_DB_URL холболтыг ашиглана.
//
// Ажиллуулах:
//   node scripts/apply-partners.mjs
//
// SUPABASE_DB_URL-ийг Supabase Dashboard → Project Settings → Database →
// "Connection string" → URI (Session pooler эсвэл Direct) хэсгээс авна.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// .env.local-ийг гараар уншина (Next.js-гүйгээр).
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
    // .env.local байхгүй бол орчны хувьсагчид найдна.
  }
}

loadEnvLocal();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error(
    "❌ SUPABASE_DB_URL олдсонгүй. .env.local-д дараах мөрийг нэмнэ үү:\n" +
      '   SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.hfcrbojxqfghztbzlqfj.supabase.co:5432/postgres"\n' +
      "   (Supabase → Project Settings → Database → Connection string → URI)",
  );
  process.exit(1);
}

const schemaSql = readFileSync(join(root, "bank_importer", "schema.sql"), "utf8");
const seedSql = readFileSync(join(root, "scripts", "partners-seed.sql"), "utf8");

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  console.log("→ schema.sql ажиллуулж байна (idempotent)…");
  await client.query(schemaSql);
  console.log("  ✅ partners хүснэгт + partner_cashflow view бэлэн.");

  console.log("→ partners-seed.sql ажиллуулж байна…");
  await client.query(seedSql);

  const { rows } = await client.query(
    "SELECT COUNT(*)::int AS n FROM partners WHERE is_active = true;",
  );
  console.log(`  ✅ Идэвхтэй харилцагч: ${rows[0].n}`);

  // PostgREST schema cache-ийг шинэчилнэ (шинэ хүснэгт шууд харагдана).
  try {
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("  ✅ PostgREST schema cache reload илгээлээ.");
  } catch {
    /* чухал биш */
  }

  console.log("\n🎉 Бэлэн боллоо. /partners хуудсаа дахин ачаална уу.");
} catch (e) {
  console.error("❌ Алдаа:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
