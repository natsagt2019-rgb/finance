// Ерөнхий журналыг Supabase-д ачаалж, trial_balances + cash_flow_lines-ийг
// ЖУРНАЛААС гарган, тайлангуудыг шалгана.
//
//   schema.sql (journal_entries + view) → journal-2025.sql →
//   trial_balances (журналаас derive) → cash_flow_lines (журналаас) → тест
//
// Ажиллуулах:  node scripts/apply-journal-2025.mjs
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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch {}
}
loadEnvLocal();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) { console.error("❌ SUPABASE_DB_URL олдсонгүй."); process.exit(1); }

const schemaSql = readFileSync(join(root, "bank_importer", "schema.sql"), "utf8");
const journalSql = readFileSync(join(root, "scripts", "journal-2025.sql"), "utf8");
const fmt = (n) => Math.round(Number(n)).toLocaleString("en-US");

// trial_balances-ийг журналаас гаргах SQL (BS=closing, P&L=турновер).
const DERIVE_TB = `
DELETE FROM trial_balances WHERE year = 2025 AND period = 'annual';
WITH jb AS (
  SELECT code,
    SUM(CASE WHEN EXTRACT(YEAR FROM txn_date) < 2025 THEN net ELSE 0 END) AS opening,
    SUM(CASE WHEN EXTRACT(YEAR FROM txn_date) = 2025 THEN net ELSE 0 END) AS period,
    SUM(net) AS closing
  FROM (
    SELECT txn_date, debit_code  AS code,  amount AS net FROM journal_entries WHERE debit_code  IS NOT NULL
    UNION ALL
    SELECT txn_date, credit_code AS code, -amount AS net FROM journal_entries WHERE credit_code IS NOT NULL
  ) x GROUP BY code
)
INSERT INTO trial_balances (year, period, account_code, account_name, opening_balance, closing_balance)
SELECT 2025, 'annual', jb.code, a.name,
  CASE WHEN a.type IN ('income','expense') THEN 0 ELSE ROUND(jb.opening,2) END,
  CASE WHEN a.type IN ('income','expense') THEN ROUND(jb.period,2) ELSE ROUND(jb.closing,2) END
FROM jb JOIN accounts a ON a.code = jb.code;
`;

const DERIVE_CF = `
DELETE FROM cash_flow_lines WHERE year = 2025 AND period = 'annual';
INSERT INTO cash_flow_lines (year, period, cf_code, amount)
SELECT 2025, 'annual', cf_code, ROUND(SUM(amount),2)
FROM journal_entries
WHERE cf_code IS NOT NULL AND cf_code ~ '^[0-9]+\\.[0-9]'
GROUP BY cf_code;
`;

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();

  console.log("→ schema.sql (journal_entries + view)…");
  await client.query(schemaSql);

  console.log("→ journal-2025.sql ачаалж байна…");
  await client.query(journalSql);
  const jn = (await client.query("SELECT COUNT(*)::int n FROM journal_entries;")).rows[0].n;
  console.log(`  ✅ journal_entries: ${jn} бичилт.`);

  console.log("→ trial_balances-ийг журналаас гаргаж байна…");
  await client.query(DERIVE_TB);
  const tn = (await client.query("SELECT COUNT(*)::int n FROM trial_balances WHERE year=2025;")).rows[0].n;
  console.log(`  ✅ trial_balances: ${tn} данс.`);

  console.log("→ cash_flow_lines-ийг журналаас гаргаж байна…");
  await client.query(DERIVE_CF);
  const cn = (await client.query("SELECT COUNT(*)::int n FROM cash_flow_lines WHERE year=2025;")).rows[0].n;
  console.log(`  ✅ cash_flow_lines: ${cn} мөр.`);

  await client.query("NOTIFY pgrst, 'reload schema';");

  // ── ТЕСТ ──
  console.log("\n── ТЕСТ (2025, журналаас) ──");
  const fs = (await client.query(
    "SELECT fs_line, closing_total FROM fs_line_balances WHERE year=2025 AND period='annual';")).rows;
  const sum = (p, s) => fs.filter(r => r.fs_line.startsWith(p)).reduce((a, r) => a + s * Number(r.closing_total), 0);
  const assets = sum("СБТ 1", 1), liabEq = sum("СБТ 2", -1);
  const net = -fs.filter(r => r.fs_line.startsWith("ОДТ")).reduce((a, r) => a + Number(r.closing_total), 0);
  console.log(`Баланс Актив:    ${fmt(assets)}  (хүл 1,173,924,009)  ${Math.abs(assets - 1173924008.86) < 2 ? "✓" : "⚠"}`);
  console.log(`Баланс Зөрүү:    ${fmt(assets - liabEq)}  ${Math.abs(assets - liabEq) < 1 ? "✓" : "⚠"}`);
  console.log(`Цэвэр ашиг:      ${fmt(net)}  (хүл 469,341,122)  ${Math.abs(net - 469341122.11) < 2 ? "✓" : "⚠"}`);
  const cf = (await client.query("SELECT cf_code, amount FROM cash_flow_lines WHERE year=2025;")).rows;
  const cfNet = cf.reduce((a, r) => a + (r.cf_code.includes(".2.") ? -1 : 1) * Number(r.amount), 0);
  console.log(`Мөнгөн гүйлгээ:   ${fmt(cfNet)}  (хүл 147,854,179)  ${Math.abs(cfNet - 147854178.62) < 2 ? "✓" : "⚠"}`);

  console.log("\n🎉 Журналаас бүх тайлан гарлаа. /reports/* ачаална уу.");
} catch (e) {
  console.error("❌ Алдаа:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
