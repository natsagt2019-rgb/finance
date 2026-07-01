// 2026 оны банкны хуулга → journal_entries, ШИНЭ playbook-ийн дагуу.
// (bank_importer/ЖУРНАЛ-БИЧИЛТ-finance2.md). Эргэлзээтэй ангиллыг ҮЛДЭЭНЭ
// (буруу данс руу таахгүй) — гаралтад жагсаана.
//
// Гол өөрчлөлт: тээврийн өртөг 610201 → 711701; цалингийн татвар/НДШ → зардал;
// НӨАТ/ААН татвар, Мост Мони, буцаалт, охин зээл-орлого → ЭРГЭЛЗЭЭТЭЙ (үлдээх).
//
//   node scripts/rebuild-journal-2026.mjs
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

const BANK = { GM: "110101", TT: "110102", MB: "110103" };

// Ангилал → чартын данс (playbook). Орлого: Дт банк/Кт энэ. Зарлага: Дт энэ/Кт банк.
const CAT = {
  // ── Орлого (банкны орлого = авлага цуглуулалт; орлого нь нэхэмжлэхээс) ──
  "1.1.1": "120101", // Үндсэн үйлчилгээ — авлага хаах
  "1.1.2": "120101", // Авлага/тооцоо
  "1.1.3": "840201", // Хүүгийн орлого
  "5.1.1": "120105", // Охин компани — хоорондын тооцоо
  "5.1.3": "120601", // Ажилтан зээл буцаалт — авлага хаах
  // ── Зарлага ──
  "1.2.1": "711701", // Тээврийн зардал (одоо) — ТЭЭВРИЙН ГОЛ ӨРТӨГ (ББӨ)
  "1.2.2": "711701", // Тээврийн зардал (өмнөх) — ББӨ
  "2.1.1": "700101", // Цалин
  "2.1.3": "700401", // Томилолт
  "2.1.5": "700801", // Сургалт
  "2.1.10": "701401", // Түрээс
  "2.1.14": "702701", // Банкны шимтгэл
  "2.2.1": "700101", // ХХОАТ (цалингийн татвар — хүн.зардалд, cash-basis)
  "2.2.4": "700201", // НДШ/ЭМНДШ (ажил олгогчийн НДШ зардал)
  "3.2.1": "200601", // Компьютер/техник — ҮХ
  "3.2.2": "200501", // Тавилга/эд хогшил — ҮХ
  "5.2.1": "120105", // Охин компани — тооцоо
  "5.2.2": "120105", // Охин компани — зээл
  "5.2.3": "120601", // Ажилтан зээл олголт
};

// ЭРГЭЛЗЭЭТЭЙ — буруу данс руу таахгүй, үлдээнэ.
const DOUBTFUL = {
  "1.1.4": "Буцаалтын орлого (юуны буцаалт тодорхойгүй)",
  "5.1.2": "Охин компани — зээл орлого (чиглэл эргэлзээтэй)",
  "2.2.2": "Мост Мони (зориулалт тодорхойгүй)",
  "2.2.3": "НӨАТ / ААН татвар (НӨАТ хуримтлал дутуу + ААНОАТ данс алга)",
};

const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
const fmt = (n) => Math.round(Number(n)).toLocaleString("en-US");

try {
  await c.connect();
  const { rows: txns } = await c.query(
    `SELECT id, txn_date, description, master_code, master_name,
            income, expense, income_code, expense_code, account_id, currency
     FROM transactions WHERE year = 2026 ORDER BY txn_date, id`,
  );
  console.log(`2026 гүйлгээ: ${txns.length}`);

  // Хуучин CASH26-г арилгана (idempotent).
  await c.query("DELETE FROM journal_entries WHERE description LIKE 'CASH26:%';");

  const vals = [];
  const doubtful = {}; // code → {n, sum}
  const skipped = {};  // шалтгаан → {n, sum}
  let made = 0;

  for (const t of txns) {
    const amount = Number(t.income) || Number(t.expense) || 0;
    const isIncome = Number(t.income) > 0;
    const code = isIncome ? t.income_code : t.expense_code;
    const bank = BANK[t.account_id];
    const bump = (obj, key) => { obj[key] = obj[key] || { n: 0, sum: 0 }; obj[key].n++; obj[key].sum += amount; };

    if (t.currency && t.currency !== "MNT") { bump(skipped, `Валют ${t.currency}`); continue; }
    if (amount <= 0) { bump(skipped, "Дүн 0"); continue; }
    if (!bank) { bump(skipped, `Банк тодорхойгүй (${t.account_id})`); continue; }
    if (!code) { bump(skipped, "Ангилалгүй"); continue; }
    if (DOUBTFUL[code]) { bump(doubtful, code); continue; }

    const cat = CAT[code];
    if (!cat) { bump(skipped, `Мэплэгдээгүй ангилал ${code}`); continue; }

    const dt = isIncome ? bank : cat;
    const kt = isIncome ? cat : bank;
    const date = t.txn_date instanceof Date ? t.txn_date.toISOString().slice(0, 10) : String(t.txn_date).slice(0, 10);
    const desc = "CASH26: " + (t.description || "").slice(0, 180);
    vals.push([date, desc, t.master_code, t.master_name, amount, dt, kt, null, "cash2026"]);
    made++;
  }

  const CHUNK = 500;
  for (let i = 0; i < vals.length; i += CHUNK) {
    const slice = vals.slice(i, i + CHUNK);
    const ph = slice.map((_, j) => { const b = j * 9; return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},FALSE,$${b+9})`; }).join(",");
    await c.query(
      `INSERT INTO journal_entries (txn_date, description, partner_code, partner_name, amount, debit_code, credit_code, cf_code, is_opening, source) VALUES ${ph}`,
      slice.flat(),
    );
  }
  console.log(`\n✅ Журналд бичсэн: ${made} гүйлгээ`);

  console.log(`\n⚠️  ЭРГЭЛЗЭЭТЭЙ — ҮЛДЭЭСЭН (гараар хянана уу):`);
  let dN = 0, dS = 0;
  for (const [code, v] of Object.entries(doubtful)) { dN += v.n; dS += v.sum; console.log(`  ${code}  ×${v.n}  ${fmt(v.sum).padStart(14)}  — ${DOUBTFUL[code]}`); }
  console.log(`  НИЙТ эргэлзээтэй: ×${dN}  ${fmt(dS)}`);

  if (Object.keys(skipped).length) {
    console.log(`\n— Бусад алгассан:`);
    for (const [r, v] of Object.entries(skipped)) console.log(`  ${r}: ×${v.n}  ${fmt(v.sum)}`);
  }

  // ── ТЕСТ: 2026 тэнцэл (журналаас) ──
  const tb = (await c.query("SELECT SUM(CASE WHEN closing-opening>0 THEN closing-opening ELSE 0 END)::numeric dt, SUM(CASE WHEN closing-opening<0 THEN opening-closing ELSE 0 END)::numeric kt FROM trial_balance_range('2026-01-01','2026-12-31')")).rows[0];
  console.log(`\n── 2026 тест (журналаас) ──`);
  console.log(`Гүйлгээ Дт=${fmt(tb.dt)} Кт=${fmt(tb.kt)} ${Math.abs(tb.dt - tb.kt) < 1 ? "✓ тэнцэв" : "⚠ ЗӨРҮҮ"}`);

  // Тээврийн өртөг 711701 шилжсэн эсэх
  const tr = (await c.query("SELECT closing-opening turn FROM trial_balance_range('2026-01-01','2026-12-31') WHERE code='711701'")).rows[0];
  const old = (await c.query("SELECT closing-opening turn FROM trial_balance_range('2026-01-01','2026-12-31') WHERE code='610201'")).rows[0];
  console.log(`Тээврийн өртөг 711701 = ${fmt(tr?.turn || 0)} (хуучин 610201 = ${fmt(old?.turn || 0)})`);

  await c.query("NOTIFY pgrst, 'reload schema';");
} catch (e) {
  console.error("❌", e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
