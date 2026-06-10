// 2025 оны гүйлгээ баланс (trial-balance-2025.sql) + мөнгөн гүйлгээ
// (cashflow-2025.sql)-ийг Supabase-д оруулж, тайлангуудыг автоматаар шалгана.
//
// Ажиллуулах:  node scripts/apply-tb-2025.mjs
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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch {
    /* env */
  }
}
loadEnvLocal();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL олдсонгүй.");
  process.exit(1);
}

const tbSql = readFileSync(join(root, "scripts", "trial-balance-2025.sql"), "utf8");
const cfSql = readFileSync(join(root, "scripts", "cashflow-2025.sql"), "utf8");

const fmt = (n) => Math.round(Number(n)).toLocaleString("en-US");

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();

  console.log("→ trial-balance-2025.sql ажиллуулж байна…");
  await client.query(tbSql);
  const tbN = (await client.query("SELECT COUNT(*)::int n FROM trial_balances WHERE year=2025;")).rows[0].n;
  console.log(`  ✅ trial_balances: ${tbN} мөр (2025).`);

  console.log("→ cashflow-2025.sql ажиллуулж байна…");
  await client.query(cfSql);
  const cfN = (await client.query("SELECT COUNT(*)::int n FROM cash_flow_lines WHERE year=2025;")).rows[0].n;
  console.log(`  ✅ cash_flow_lines: ${cfN} мөр (2025).`);

  // ── ТЕСТ: тайлангуудыг fs_line_balances-аас шалгана ──────────────────────
  console.log("\n── ТЕСТ (2025) ──");
  const fs = (await client.query(
    "SELECT fs_line, closing_total FROM fs_line_balances WHERE year=2025 AND period='annual';",
  )).rows;
  const m = new Map(fs.map((r) => [r.fs_line, Number(r.closing_total)]));
  const sumByPrefix = (p, sign) =>
    fs.filter((r) => r.fs_line.startsWith(p)).reduce((s, r) => s + sign * Number(r.closing_total), 0);

  // Баланс: актив (СБТ 1) ба өр+өмч (СБТ 2)
  const assets = sumByPrefix("СБТ 1", 1);
  const liabEq = sumByPrefix("СБТ 2", -1);
  console.log(`Баланс — Актив:        ${fmt(assets)}  (хүл 1,173,924,009)`);
  console.log(`Баланс — Өр+Өмч:       ${fmt(liabEq)}`);
  console.log(`Баланс — Зөрүү:        ${fmt(assets - liabEq)}  ${Math.abs(assets - liabEq) < 1 ? "✓" : "⚠"}`);

  // Орлого: цэвэр ашиг = −Σ(ОДТ)
  const net = -fs.filter((r) => r.fs_line.startsWith("ОДТ")).reduce((s, r) => s + Number(r.closing_total), 0);
  console.log(`Орлого — Цэвэр ашиг:   ${fmt(net)}  (хүл 469,341,122)  ${Math.abs(net - 469341122) < 2 ? "✓" : "⚠"}`);
  console.log(`  1.1.1 Мөнгө:         ${fmt(m.get("СБТ 1.1.1 Мөнгө, түүнтэй адилтгах хөрөнгө") || 0)}  (хүл 173,733,062)`);

  // Мөнгөн гүйлгээ: бүх цэвэр
  const cf = (await client.query("SELECT cf_code, amount FROM cash_flow_lines WHERE year=2025;")).rows;
  const cfNet = cf.reduce((s, r) => s + (r.cf_code.includes(".2.") ? -1 : 1) * Number(r.amount), 0);
  console.log(`Мөнгөн гүйлгээ — Цэвэр: ${fmt(cfNet)}  (хүл 147,854,179)  ${Math.abs(cfNet - 147854178.62) < 2 ? "✓" : "⚠"}`);

  console.log("\n🎉 Бэлэн. /reports/* хуудсуудаа ачаална уу.");
} catch (e) {
  console.error("❌ Алдаа:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
