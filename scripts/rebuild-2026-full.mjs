// 2026 БҮРЭН дахин буулгалт — Excel (Орлого+Өглөг) + банк, аккруал, НӨАТ задлал.
// Зөвхөн ТҮМЭН ТЭЭХ ХХК-г үндсэн журналд (Түмэн Ресурс тусад нь тайлагнана).
//
//   Орлого (Invoice list):  Дт 120101 / Кт 510102 (цэвэр) + Кт 310601 (НӨАТ)
//   Тээврийн өртөг (Өглөг):  Дт 711701 / Кт 310101 өглөг
//   Төлбөр авах (банк 1.1.x):Дт банк / Кт 120101
//   Жолоочид төлөх (1.2.x):  Дт 310101 / Кт банк   (өглөг хаах — өртөг биш!)
//   Бусад зардал:            ангиллын дагуу
//   Эргэлзээтэй:             үлдээнэ
//
//   node scripts/rebuild-2026-full.mjs
import { readFileSync } from "node:fs";
import pg from "pg";
import xlsx from "xlsx";

const XLSX_PATH = "C:/Users/natsa/Downloads/Нэхэмжлэх (35).xlsx";
const txt = readFileSync(".env.local", "utf8");
for (const l of txt.split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

const BANK = { GM: "110101", TT: "110102", MB: "110103" };
const CAT = {
  "1.1.1": "120101", "1.1.2": "120101", "1.1.3": "840201", "5.1.1": "120105", "5.1.3": "120601",
  "1.2.1": "310101", "1.2.2": "310101", // жолоочийн төлбөр → ӨГЛӨГ хаах
  "2.1.1": "700101", "2.1.3": "700401", "2.1.5": "700801", "2.1.10": "701401", "2.1.14": "702701",
  "2.2.1": "700101", "2.2.4": "700201", "3.2.1": "200601", "3.2.2": "200501",
  "5.2.1": "120105", "5.2.2": "120105", "5.2.3": "120601",
};
const DOUBTFUL = new Set(["1.1.4", "5.1.2", "2.2.2", "2.2.3"]);
const REVENUE = "510102", VAT_OUT = "310601", RECEIVABLE = "120101", COGS = "711701", AP = "310101";
const isTT = (s) => String(s || "").includes("Тээх");
const isTR = (s) => String(s || "").includes("Ресурс");
const day = (d) => {
  if (!(d instanceof Date)) return String(d || "").slice(0, 10);
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10); // +08 Монгол
};
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const f = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");

const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
const rows = []; // journal_entries (Түмэн Тээх)
const tr = { rev: 0, cost: 0 }; // Түмэн Ресурс нэгтгэл
const add = (date, desc, partner, amt, dt, kt, src) => { if (r2(amt) > 0) rows.push([date, desc, partner, r2(amt), dt, kt, src]); };

try {
  await c.connect();
  const wb = xlsx.readFile(XLSX_PATH, { cellDates: true });

  // ── 1. ОРЛОГО (Invoice list) ──────────────────────────────────────────
  const inv = xlsx.utils.sheet_to_json(wb.Sheets["Invoice list"], { header: 1, defval: null }).slice(2);
  let invN = 0, invNet = 0, invVat = 0;
  for (const r of inv) {
    if (!r || Number(r[24]) !== 2026) continue;       // Year=24
    const co = r[4];                                   // Нэхэмжлэгч (гаргагч)
    const net = Number(r[21]) || 0;                    // Нийт үнэ (цэвэр)
    const vatFlag = String(r[27]);                     // VAT % (1=НӨАТ-тай, 0=чөлөөлөгдсөн)
    const vat = vatFlag === "1" || vatFlag === "10" ? r2(net * 0.1) : 0; // 10% дүрэм
    if (net <= 0) continue;
    if (isTR(co)) { tr.rev += net + vat; continue; }   // Ресурс — тусад нь
    if (!isTT(co)) continue;
    const date = day(r[3]);
    const desc = "INV26: " + (r[1] ? `№${r[1]} ` : "") + String(r[11] || "").slice(0, 120);
    add(date, desc, r[11], net, RECEIVABLE, REVENUE, "inv2026");
    if (vat > 0) add(date, desc, r[11], vat, RECEIVABLE, VAT_OUT, "inv2026");
    invN++; invNet += net; invVat += vat;
  }

  // ── 2. ТЭЭВРИЙН ӨРТӨГ (Өглөг) + payables хүснэгт ───────────────────────
  const og = xlsx.utils.sheet_to_json(wb.Sheets["Өглөг"], { header: 1, defval: null }).slice(2);
  await c.query("DELETE FROM payables WHERE EXTRACT(YEAR FROM pay_date)=2026;");
  const payVals = [];
  let ogN = 0, ogSum = 0;
  for (const r of og) {
    if (!r || Number(r[3]) !== 2026) continue;         // жил=3
    const amt = Number(r[19]) || 0;                    // Гүйлгээний дүн=19
    if (amt <= 0) continue;
    const co = r[9];                                   // Шилжүүлэгч (өөрийн компани)
    const date = day(r[4]);
    payVals.push([date, isTR(co) ? "ТҮМЭН РЕСУРС ХХК" : "ТҮМЭН ТЭЭХ ХХК", r[5], r[6], r[7], String(r[11] || "").slice(0, 200), String(r[12] || "").includes("НӨАТ"), r2(amt), r[20]]);
    if (isTR(co)) { tr.cost += amt; continue; }
    if (!isTT(co)) continue;
    add(date, "OG26: " + String(r[7] || "").slice(0, 60) + " — " + String(r[11] || "").slice(0, 90), r[7], amt, COGS, AP, "og2026");
    ogN++; ogSum += amt;
  }
  // payables insert
  for (let i = 0; i < payVals.length; i += 500) {
    const sl = payVals.slice(i, i + 500);
    const ph = sl.map((_, j) => { const b = j * 9; return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9})`; }).join(",");
    await c.query(`INSERT INTO payables (pay_date,company,manager,transport_type,subcontractor,description,has_vat,amount,status) VALUES ${ph}`, sl.flat());
  }

  // ── 3. БАНК (transactions, бүгд Түмэн Тээх) ────────────────────────────
  const { rows: txns } = await c.query(
    `SELECT txn_date, description, master_code, master_name, income, expense, income_code, expense_code, account_id
     FROM transactions WHERE year=2026 ORDER BY txn_date, id`);
  const doubtful = {};
  let bankN = 0;
  for (const t of txns) {
    const amount = Number(t.income) || Number(t.expense) || 0;
    const isInc = Number(t.income) > 0;
    const code = isInc ? t.income_code : t.expense_code;
    const bank = BANK[t.account_id];
    if (amount <= 0 || !bank || !code) continue;
    if (DOUBTFUL.has(code)) { doubtful[code] = (doubtful[code] || 0) + amount; continue; }
    const cat = CAT[code];
    if (!cat) continue;
    const date = day(t.txn_date);
    const desc = "CASH26: " + String(t.description || "").slice(0, 160);
    if (isInc) add(date, desc, t.master_name, amount, bank, cat, "cash2026");
    else add(date, desc, t.master_name, amount, cat, bank, "cash2026");
    bankN++;
  }

  // ── 4. Хуучин 2026 устгаад шинээр оруулах ─────────────────────────────
  await c.query("DELETE FROM journal_entries WHERE source IN ('inv2026','og2026','cash2026') OR description LIKE 'INV26:%' OR description LIKE 'CASH26:%' OR description LIKE 'OG26:%';");
  for (let i = 0; i < rows.length; i += 500) {
    const sl = rows.slice(i, i + 500);
    const ph = sl.map((_, j) => { const b = j * 7; return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},FALSE,$${b+7})`; }).join(",");
    await c.query(`INSERT INTO journal_entries (txn_date,description,partner_name,amount,debit_code,credit_code,is_opening,source) VALUES ${ph}`, sl.flat());
  }

  console.log(`✅ Журналд бичсэн (Түмэн Тээх): ${rows.length} мөр`);
  console.log(`   Орлого: ${invN} нэхэмжлэх (цэвэр ${f(invNet)} + НӨАТ ${f(invVat)})`);
  console.log(`   Өртөг (Өглөг): ${ogN} мөр, ${f(ogSum)}`);
  console.log(`   Банк: ${bankN} гүйлгээ`);
  console.log(`   payables хүснэгт: ${payVals.length} мөр`);
  console.log(`\n— Түмэн Ресурс (журналд ОРООГҮЙ, тусад нь): орлого≈${f(tr.rev)}, өртөг≈${f(tr.cost)}`);
  console.log(`— Эргэлзээтэй (үлдээсэн): ${Object.entries(doubtful).map(([k, v]) => `${k}=${f(v)}`).join(", ")}`);

  // ── ТЕСТ ──────────────────────────────────────────────────────────────
  const tb = (await c.query("SELECT SUM(CASE WHEN closing-opening>0 THEN closing-opening ELSE 0 END)::numeric dt, SUM(CASE WHEN closing-opening<0 THEN opening-closing ELSE 0 END)::numeric kt FROM trial_balance_range('2026-01-01','2026-12-31')")).rows[0];
  console.log(`\n── 2026 тест ──`);
  console.log(`Гүйлгээ Дт=${f(tb.dt)} Кт=${f(tb.kt)} ${Math.abs(tb.dt - tb.kt) < 1 ? "✓ тэнцэв" : "⚠"}`);
  for (const code of [COGS, AP, REVENUE, VAT_OUT, RECEIVABLE]) {
    const x = (await c.query("SELECT closing, closing-opening turn FROM trial_balance_range('2026-01-01','2026-12-31') WHERE code=$1", [code])).rows[0];
    console.log(`  ${code}: эцсийн=${f(x?.closing || 0)}  эргэлт=${f(x?.turn || 0)}`);
  }
  await c.query("NOTIFY pgrst, 'reload schema';");
} catch (e) {
  console.error("❌", e.message, e.stack);
  process.exitCode = 1;
} finally {
  await c.end();
}
