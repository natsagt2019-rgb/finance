// 2026 оны мөнгөн гүйлгээний тайлан (cash_flow_lines) — transactions хүснэгтээс.
// 2026 журнал хяналтын данс (120101/310101) руу бичигдсэн тул дэлгэрэнгүй
// ангилалгүй. Харин transactions-д дэлгэрэнгүй код (income_code/expense_code)
// бий — үүнийг E-balance СС№361 код руу буулгаж нэгтгэнэ.
//   node scripts/cashflow-2026.mjs          ← DRY-RUN
//   node scripts/cashflow-2026.mjs --apply  ← cash_flow_lines бичнэ
import pg from "pg";

const APPLY = process.argv.includes("--apply");
const YEAR = 2026;

// Миний дотоод код (transactions) → E-balance МГТ код.
const MAP = {
  // Орлого
  "1.1.1": "1.1.1", // Тээврийн үйлчилгээний орлого → Бараа борлуулсан, үйлчилгээний орлого
  "1.1.2": "1.1.1", // Авлага/тооцоо цуглуулалт → орлого
  "1.1.3": "1.1.6", // Хүүгийн орлого → бусад
  "1.1.4": "1.1.6", // Буцаалт → бусад
  "5.1.2": "3.1.1", // Зээл авсан → санхүүжилт
  "5.1.3": "1.1.6", // Ажилтан зээл буцаалт → бусад
  // Зарлага
  "1.2.1": "1.2.5", // Поткийн зардал (ББӨ) → Түлш, шатахуун, тээврийн хөлс
  "1.2.2": "1.2.5", // Поткийн зардал өмнөх сар → мөн
  "2.1.1": "1.2.1", // Цалин → Ажиллагчдад төлсөн
  "2.2.2": "1.2.1", // Мост Мони (цалин шилжүүлэг) → Ажиллагчдад
  "2.2.4": "1.2.2", // НДШ/ЭМНДШ → НД байгууллагад
  "2.2.1": "1.2.7", // ХХОАТ → Татварын байгууллагад
  "2.2.3": "1.2.7", // НӨАТ/ААН татвар → Татварын байгууллагад
  "2.1.3": "1.2.9", // Томилолт → бусад
  "2.1.5": "1.2.9", // Сургалт → бусад
  "2.1.10": "1.2.9", // Түрээс → бусад
  "2.1.14": "1.2.9", // Банкны шимтгэл → бусад
  "5.2.3": "1.2.9", // Ажилтан зээл олголт → бусад
  "3.2.1": "2.2.1", // Компьютер/техник → Хөрөнгө оруулалт (ҮХ худалдан авсан)
  "3.2.2": "2.2.1", // Тавилга → мөн
  "5.2.2": "3.2.1", // Зээл эргэн төлсөн → санхүүжилт
};
const CF_LABEL = {
  "1.1.1": "Бараа борлуулсан, үйлчилгээний орлого",
  "1.1.6": "Бусад мөнгөн орлого",
  "1.2.1": "Ажиллагчдад төлсөн",
  "1.2.2": "НД байгууллагад төлсөн",
  "1.2.5": "Түлш, шатахуун, тээврийн хөлс, сэлбэг",
  "1.2.7": "Татварын байгууллагад төлсөн",
  "1.2.9": "Бусад мөнгөн зарлага",
  "2.2.1": "Хөрөнгө оруулалт (ҮХ худалдан авсан)",
  "3.1.1": "Зээл авсан (санхүүжилт)",
  "3.2.1": "Зээл эргэн төлсөн (санхүүжилт)",
};

const c = new pg.Client({
  host: "aws-1-ap-southeast-2.pooler.supabase.com",
  port: 5432,
  user: `postgres.${process.env.PROJECT_REF}`,
  password: process.env.PGPASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const inc = await c.query(
  "select income_code code, sum(income)::numeric s from transactions where year=$1 and currency='MNT' and income_code is not null group by income_code",
  [YEAR],
);
const exp = await c.query(
  "select expense_code code, sum(expense)::numeric s from transactions where year=$1 and currency='MNT' and expense_code is not null group by expense_code",
  [YEAR],
);

const agg = {};
const unmapped = [];
for (const r of [...inc.rows, ...exp.rows]) {
  const cf = MAP[r.code];
  if (!cf) { unmapped.push(r.code); continue; }
  agg[cf] = (agg[cf] || 0) + Number(r.s);
}

console.log("Тооцоолсон cash_flow_lines (2026):");
let infl = 0, outfl = 0;
for (const code of Object.keys(agg).sort()) {
  const isIn = code.startsWith("1.1") || code.startsWith("2.1.8") || code.startsWith("3.1");
  if (isIn) infl += agg[code]; else outfl += agg[code];
  console.log(`  ${code.padEnd(7)} ${Math.round(agg[code]).toLocaleString().padStart(16)}  ${CF_LABEL[code] || ""}`);
}
console.log(`  ── орлого ${Math.round(infl).toLocaleString()} · зарлага ${Math.round(outfl).toLocaleString()} · цэвэр ${Math.round(infl - outfl).toLocaleString()}`);
if (unmapped.length) console.log("⚠️ зураглагдаагүй код:", unmapped.join(", "));

if (!APPLY) {
  console.log("\n(DRY-RUN — бичээгүй. --apply нэмж ажиллуулна уу.)");
  await c.end();
} else {
  await c.query("delete from cash_flow_lines where year=$1 and period='annual'", [YEAR]);
  const codes = Object.keys(agg);
  await c.query(
    `insert into cash_flow_lines (year, period, cf_code, amount)
     select $1, 'annual', unnest($2::text[]), unnest($3::numeric[])`,
    [YEAR, codes, codes.map((k) => agg[k])],
  );
  console.log(`\n✅ Бичлээ: cash_flow_lines ${YEAR} → ${codes.length} мөр.`);
  await c.end();
}
