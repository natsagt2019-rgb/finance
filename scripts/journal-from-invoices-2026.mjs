// 2026 нэхэмжлэх (invoices) → journal_entries (accrual орлого).
// Нэхэмжлэх гарах үед: Дт авлага (120101) / Кт орлого (510102).
// Мөнгө цуглуулалт нь cash-journal-аар авлагыг бууруулна (давхар тооцохгүй).
//
//   node scripts/journal-from-invoices-2026.mjs
import { readFileSync } from "node:fs";
import pg from "pg";

const txt = readFileSync(".env.local", "utf8");
for (const l of txt.split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

const RECEIVABLE = "120101"; // Дансны авлага
const REVENUE = "510102"; // Үйлчилгээний орлого

const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
const fmt = (n) => Math.round(Number(n)).toLocaleString("en-US");

try {
  await c.connect();
  const { rows } = await c.query(
    `SELECT id, invoice_no, inv_date, partner_name, amount
     FROM invoices WHERE is_active AND EXTRACT(YEAR FROM inv_date) = 2026 ORDER BY inv_date, id`,
  );
  console.log(`2026 нэхэмжлэх: ${rows.length}`);

  await c.query("DELETE FROM journal_entries WHERE description LIKE 'INV26:%';");

  const vals = [];
  for (const r of rows) {
    const amt = Number(r.amount) || 0;
    if (amt <= 0) continue;
    const date = r.inv_date instanceof Date ? r.inv_date.toISOString().slice(0, 10) : String(r.inv_date).slice(0, 10);
    const desc = "INV26: " + (r.invoice_no ? `№${r.invoice_no} ` : "") + (r.partner_name || "").slice(0, 150);
    // Дт авлага / Кт орлого
    vals.push([date, desc, null, r.partner_name, amt, RECEIVABLE, REVENUE, null]);
  }

  const CHUNK = 500;
  for (let i = 0; i < vals.length; i += CHUNK) {
    const slice = vals.slice(i, i + CHUNK);
    const ph = slice.map((_, j) => {
      const b = j * 8;
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},FALSE)`;
    }).join(",");
    await c.query(
      `INSERT INTO journal_entries (txn_date, description, partner_code, partner_name, amount, debit_code, credit_code, cf_code, is_opening) VALUES ${ph}`,
      slice.flat(),
    );
  }
  const total = vals.reduce((s, v) => s + v[4], 0);
  console.log(`✅ Нэхэмжлэхийн журнал: ${vals.length}, нийт орлого ${fmt(total)}`);
  await c.query("NOTIFY pgrst, 'reload schema';");
} catch (e) {
  console.error("❌", e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
