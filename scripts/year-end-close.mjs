// ============================================================
// Жилийн хаалтын бичилт — орлого/зардлыг 920101-ээр дамжуулж 430101 руу.
// ============================================================
// Дуудлага:
//   node scripts/year-end-close.mjs 2025            ← DRY-RUN (зөвхөн харуулна)
//   node scripts/year-end-close.mjs 2025 --apply    ← журналд бичнэ (idempotent)
//
// Хаалтын бичилт (debit-positive дансны логик):
//   1) Орлого бүр:  Дт орлого / Кт 920101   (орлогын эргэлтийн дүнгээр)
//   2) Зардал бүр:  Дт 920101 / Кт зардал   (зардлын эргэлтийн дүнгээр)
//   3) Цэвэр ашиг:  Дт 920101 / Кт 430101   (ашиг>0) | эсрэгээр (алдагдал)
// Үр дүнд: P&L дансууд тэг, 920101 тэг, 430101 (өмч) ашгаар нэмэгдэж,
// санхүүгийн байдлын тайлангийн Зөрүү=0 болно.
//
// ⚠ Зөвхөн ДУУССАН жилд (12-р сарын дараа) ажиллуул. Урсгал (нээлттэй) жилд
//   дунд үед хаалт хийхгүй — энэ нь стандарт нягтлан бодох зарчим биш.
// ============================================================
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

const YEAR = Number(process.argv[2]) || new Date().getFullYear() - 1;
const APPLY = process.argv.includes("--apply");
const CLOSING = "920101";   // Орлого зардлын нэгдсэн данс
const RETAINED = "430101";  // Тайлант үеийн хуримтлагдсан ашиг
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });

try {
  await c.connect();
  const from = `${YEAR}-01-01`, to = `${YEAR}-12-31`, date = `${YEAR}-12-31`;

  // Idempotent: хаалт давтан ажиллахад P&L turnover буруу болохгүйн тулд
  // өмнөх хаалтын бичилтийг ЭХЛЭЭД устгана (APPLY үед), дараа эргэлт тооцно.
  if (APPLY) {
    await c.query(`DELETE FROM journal_entries WHERE description LIKE $1`, [`CLOSE:${YEAR}%`]);
    await c.query(
      `DELETE FROM journal_entries
         WHERE EXTRACT(YEAR FROM txn_date) = $1 AND description NOT LIKE 'CLOSE:%'
           AND ((debit_code='920101' AND credit_code='430101')
             OR (debit_code='430101' AND credit_code='920101'))`,
      [YEAR],
    );
  }

  // P&L дансны жилийн эргэлт. 91xxxx (орлогын татвар) ч хаагдана —
  // зөвхөн 92xxxx (нэгдсэн хаалтын данс өөрөө) хасагдана.
  const { rows } = await c.query(
    `SELECT r.code, a.name, a.type, (r.closing - r.opening) AS turn
       FROM trial_balance_range($1,$2) r JOIN accounts a ON a.code = r.code
      WHERE a.type IN ('income','expense') AND left(r.code,2) <> '92'
        AND abs(r.closing - r.opening) > 0.005`,
    [from, to],
  );

  let totIncome = 0, totExpense = 0;
  const entries = []; // [date, desc, amount, debit_code, credit_code]
  for (const x of rows) {
    const turn = r2(x.turn); // debit-positive: зардал +, орлого −
    if (x.type === "income") {
      const amt = r2(-turn); // орлогын кредит эргэлт
      if (amt <= 0) continue;
      totIncome += amt;
      entries.push([date, `CLOSE:${YEAR} орлого хаах — ${x.name}`, amt, x.code, CLOSING]);
    } else {
      const amt = r2(turn); // зардлын дебет эргэлт
      if (amt <= 0) continue;
      totExpense += amt;
      entries.push([date, `CLOSE:${YEAR} зардал хаах — ${x.name}`, amt, CLOSING, x.code]);
    }
  }
  const net = r2(totIncome - totExpense);
  // Цэвэр ашиг → өмч (ашиг бол Дт 920101 / Кт 430101).
  if (net > 0) entries.push([date, `CLOSE:${YEAR} цэвэр ашиг → хуримтлагдсан ашиг`, net, CLOSING, RETAINED]);
  else if (net < 0) entries.push([date, `CLOSE:${YEAR} цэвэр алдагдал → хуримтлагдсан ашиг`, -net, RETAINED, CLOSING]);

  console.log(`═══ ЖИЛИЙН ХААЛТ ${YEAR} ${APPLY ? "(APPLY)" : "(DRY-RUN)"} ═══`);
  console.log(`Орлого нийт : ${fmt(totIncome)}`);
  console.log(`Зардал нийт : ${fmt(totExpense)}`);
  console.log(`Цэвэр ашиг  : ${fmt(net)}  →  ${RETAINED} руу`);
  console.log(`Хаалтын бичилт: ${entries.length} мөр (920101 нийт Дт=Кт тул нэгдсэн данс тэг болно)`);

  if (!APPLY) {
    console.log("\nDRY-RUN — өгөгдөл өөрчлөгдөөгүй. Бодитоор хийхдээ `--apply` нэм.");
    await c.end();
    process.exit(0);
  }

  // (Өмнөх хаалт + дутуу транфер аль хэдийн дээр устсан — turnover-ийн өмнө.)
  const ph = entries.map((_, i) => { const b = i * 5; return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},FALSE,'close')`; }).join(",");
  await c.query(
    `INSERT INTO journal_entries (txn_date, description, amount, debit_code, credit_code, is_opening, source) VALUES ${ph}`,
    entries.flat(),
  );

  // Баталгаажуулалт: санхүүгийн байдлын Зөрүү=0 болсон эсэх.
  const fs = (await c.query(
    `SELECT a.fs_line, SUM(r.closing) cl FROM trial_balance_range($1,$2) r
       JOIN accounts a ON a.code=r.code WHERE a.fs_line IS NOT NULL GROUP BY 1`, [from, to])).rows;
  let assets = 0, liabEq = 0;
  for (const r of fs) { if (r.fs_line.startsWith("СБТ 1")) assets += Number(r.cl); else if (r.fs_line.startsWith("СБТ 2")) liabEq += -Number(r.cl); }
  console.log(`\n✅ Бичигдлээ. Баланс: Актив=${fmt(assets)} Өр+Өмч=${fmt(liabEq)} Зөрүү=${fmt(assets - liabEq)} ${Math.abs(assets - liabEq) < 1 ? "✓ ТЭНЦЭВ" : "⚠"}`);
  await c.query(`NOTIFY pgrst, 'reload schema';`);
} catch (e) {
  console.error("❌", e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
