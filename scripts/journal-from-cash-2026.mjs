// 2026 оны банкны гүйлгээ (transactions) → journal_entries (double-entry).
// Орлого: Дт банк / Кт ангиллын данс.  Зарлага: Дт ангиллын данс / Кт банк.
// 2025 журналын ДЭЭР сууна — огнооны мужаар 2026 opening нь 2025 closing-оос гарна.
//
//   node scripts/journal-from-cash-2026.mjs
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

// Банк (account_id) → чартын мөнгөн данс
const BANK = { GM: "110101", TT: "110102", MB: "110103" };

// Ангиллын код → чартын данс
const CAT = {
  // Орлого (accrual: цуглуулалт → авлага бууруулна; орлого нь нэхэмжлэхээс)
  "1.1.1": "120101", "1.1.2": "120101", "1.1.3": "840201", "1.1.4": "120101",
  "5.1.1": "120105", "5.1.2": "120105", "5.1.3": "120601",
  // Зарлага
  "1.2.1": "610201", "1.2.2": "610201", "2.1.1": "700101", "2.1.3": "700401",
  "2.1.5": "700801", "2.1.10": "701401", "2.1.14": "702701", "2.2.1": "310401",
  "2.2.2": "700101", "2.2.3": "310601", "2.2.4": "310501", "3.2.1": "200601",
  "3.2.2": "200501", "5.2.1": "120105", "5.2.2": "120105", "5.2.3": "120601",
};

// Ангиллын код → мөнгөн гүйлгээний код (МГТ)
const CF = {
  "1.1.1": "1.1.1", "1.1.2": "1.1.1", "1.1.3": "2.1.6", "1.1.4": "1.1.6",
  "5.1.2": "2.1.5", "5.1.3": "2.1.5",
  "1.2.1": "1.2.5", "1.2.2": "1.2.5", "2.1.1": "1.2.1", "2.1.3": "1.2.9",
  "2.1.5": "1.2.9", "2.1.10": "1.2.4", "2.1.14": "1.2.9", "2.2.1": "1.2.7",
  "2.2.2": "1.2.1", "2.2.3": "1.2.7", "2.2.4": "1.2.2", "3.2.1": "2.2.1",
  "3.2.2": "2.2.1", "5.2.2": "2.2.5", "5.2.3": "2.2.5",
};

const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
const fmt = (n) => Math.round(Number(n)).toLocaleString("en-US");

try {
  await c.connect();

  const { rows: txns } = await c.query(
    `SELECT id, txn_date, description, counterparty, master_code, master_name,
            income, expense, income_code, expense_code, account_id
     FROM transactions WHERE year = 2026 ORDER BY txn_date, id`,
  );
  console.log(`2026 гүйлгээ: ${txns.length}`);

  // Хуучин 2026-аас үүсгэсэн журналыг арилгана (idempotent)
  await c.query("DELETE FROM journal_entries WHERE description LIKE 'CASH26:%';");

  let made = 0, skipped = 0;
  const vals = [];
  for (const t of txns) {
    const bank = BANK[t.account_id];
    const isIncome = Number(t.income) > 0;
    const code = isIncome ? t.income_code : t.expense_code;
    const cat = CAT[code];
    const amount = Number(t.income) || Number(t.expense) || 0;
    if (!bank || !cat || amount <= 0) { skipped++; continue; }

    const dt = isIncome ? bank : cat; // Дебет
    const kt = isIncome ? cat : bank; // Кредит
    const cf = CF[code] ?? null;
    const date = t.txn_date instanceof Date ? t.txn_date.toISOString().slice(0, 10) : String(t.txn_date).slice(0, 10);
    const desc = "CASH26: " + (t.description || "").slice(0, 180);
    vals.push([date, desc, t.master_code, t.master_name, amount, dt, kt, cf]);
    made++;
  }

  // Багцлан оруулна
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
  console.log(`✅ Журналд оруулсан: ${made}, алгассан: ${skipped}`);

  // ── ТЕСТ: 2026 (журналаас, муж) ──────────────────────────────────────
  const tb = await c.query("SELECT SUM(CASE WHEN closing-opening>0 THEN closing-opening ELSE 0 END)::numeric dt, SUM(CASE WHEN closing-opening<0 THEN opening-closing ELSE 0 END)::numeric kt FROM trial_balance_range('2026-01-01','2026-12-31')");
  console.log(`\n── 2026 тест (журналаас) ──`);
  console.log(`Гүйлгээ Дт=${fmt(tb.rows[0].dt)} Кт=${fmt(tb.rows[0].kt)} ${Math.abs(tb.rows[0].dt-tb.rows[0].kt)<1?"✓ тэнцэв":"⚠"}`);

  // P&L журналаас
  const pl = await c.query(`
    SELECT a.type, a.is_cogs, SUM(r.closing - r.opening) AS turn
    FROM trial_balance_range('2026-01-01','2026-12-31') r
    JOIN accounts a ON a.code = r.code
    WHERE a.type IN ('income','expense') AND left(r.code,2) NOT IN ('92','91')
    GROUP BY a.type, a.is_cogs`);
  let income = 0, cogs = 0, expense = 0;
  for (const r of pl.rows) {
    const turn = Number(r.turn);
    if (r.type === "income") income += -turn;
    else if (r.is_cogs) cogs += turn;
    else expense += turn; // (61/71-ийг доор тусгайлан)
  }
  // ББӨ-г кодоор (61/71) дахин тооцъё
  const cg = await c.query("SELECT SUM(r.closing-r.opening) s FROM trial_balance_range('2026-01-01','2026-12-31') r JOIN accounts a ON a.code=r.code WHERE a.type='expense' AND (left(r.code,1)='6' OR left(r.code,2)='71')");
  cogs = Number(cg.rows[0].s) || 0;
  expense = (await c.query("SELECT SUM(r.closing-r.opening) s FROM trial_balance_range('2026-01-01','2026-12-31') r JOIN accounts a ON a.code=r.code WHERE a.type='expense' AND left(r.code,1)<>'6' AND left(r.code,2) NOT IN ('71','91','92')")).rows[0].s || 0;
  expense = Number(expense);
  console.log(`Орлого = ${fmt(income)}`);
  console.log(`ББӨ    = ${fmt(cogs)}`);
  console.log(`Зардал = ${fmt(expense)}`);
  console.log(`Ашиг(татвар өмнө) = ${fmt(income - cogs - expense)}`);

  await c.query("NOTIFY pgrst, 'reload schema';");
  console.log("\n🎉 2026 журнал бэлэн. /reports/* дээр огноо 2026-01-01 → 2026-12-31 сонгоно уу.");
} catch (e) {
  console.error("❌", e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
