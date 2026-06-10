// invoices хүснэгт + invoice_monthly view-ийг Supabase Postgres-д ажиллуулна.
// .env.local доторх SUPABASE_DB_URL холболтыг ашиглана.
//
// Ажиллуулах:
//   node scripts/apply-invoices.mjs
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
      '   SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres"\n' +
      "   (Supabase → Project Settings → Database → Connection string → URI)",
  );
  process.exit(1);
}

// Бүгд idempotent — дарааллаар ажиллуулна:
//   1. schema.sql          — бүх хүснэгт (invoices, partners, accounts, …)
//   2. partners-seed.sql   — 931 харилцагч (partner_id тулгахад шаардлагатай)
//   3. invoices-tt-2026-seed.sql — Түмэн Тээх ХХК 2026 оны 436 нэхэмжлэл
const steps = [
  ["bank_importer/schema.sql", "Бүх хүснэгт (invoices, partners, …)"],
  ["scripts/partners-seed.sql", "Харилцагчид (partner_id тулгалтад)"],
  ["scripts/invoices-tt-2026-seed.sql", "Түмэн Тээх ХХК 2026 нэхэмжлэл"],
];

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  for (const [file, label] of steps) {
    let sql;
    try {
      sql = readFileSync(join(root, file), "utf8");
    } catch {
      console.warn(`  ⚠ ${file} олдсонгүй — алгаслаа.`);
      continue;
    }
    console.log(`→ ${file} … (${label})`);
    await client.query(sql);
  }

  const { rows: pr } = await client.query(
    "SELECT COUNT(*)::int AS n FROM partners WHERE is_active = true;",
  );
  const { rows: ir } = await client.query(
    "SELECT COUNT(*)::int AS n, COALESCE(SUM(amount),0)::numeric AS amt FROM invoices WHERE is_active = true;",
  );
  const { rows: mr } = await client.query(
    "SELECT COUNT(*)::int AS n FROM invoices WHERE is_active AND partner_id IS NOT NULL;",
  );
  console.log(`  ✅ Харилцагч: ${pr[0].n}`);
  console.log(
    `  ✅ Нэхэмжлэх: ${ir[0].n} (нийт ${Number(ir[0].amt).toLocaleString("en-US")}₮) — харилцагчтай холбогдсон: ${mr[0].n}`,
  );

  // PostgREST schema cache-ийг шинэчилнэ (шинэ хүснэгт шууд харагдана).
  try {
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("  ✅ PostgREST schema cache reload илгээлээ.");
  } catch {
    /* чухал биш */
  }

  console.log("\n🎉 Бэлэн боллоо. /invoices хуудсаа дахин ачаална уу.");
} catch (e) {
  console.error("❌ Алдаа:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
