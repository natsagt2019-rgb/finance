// Мөнгөн урсгалын тайлангийн тоонууд transactions хүснэгтээс гарч байгааг батлах.
// PROJECT_REF, PGPASSWORD орчны хувьсагч (диск рүү бичихгүй).
import pg from "pg";

const ref = process.env.PROJECT_REF;
const password = process.env.PGPASSWORD;
const client = new pg.Client({
  host: "aws-1-ap-southeast-2.pooler.supabase.com",
  port: 5432,
  user: `postgres.${ref}`,
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const accounts = ["TT", "GM", "MB"];
const year = 2026;

console.log(`=== ${year} он · данс ${accounts.join(",")} (Түмэн Тээх бүлэг) ===\n`);

// 1. Ангилал код бүрийн нийлбэр (тайлангийн мөр бүртэй тохирно)
const byCode = await client.query(
  `select coalesce(income_code, expense_code) as code,
          sum(coalesce(income,0))::bigint  as inc,
          sum(coalesce(expense,0))::bigint as exp,
          count(*) as n
   from transactions
   where year=$1 and account_id = any($2)
     and coalesce(income_code, expense_code) is not null
   group by code order by code;`,
  [year, accounts],
);
console.log("Ангилал код бүрийн нийлбэр:");
for (const r of byCode.rows) {
  const amt = Number(r.inc) || Number(r.exp);
  console.log(`  ${r.code.padEnd(7)} ${String(amt).padStart(14)}  (${r.n} гүйлгээ)`);
}

// 2. Нийт орлого / зарлага
const tot = await client.query(
  `select sum(coalesce(income,0))::bigint inc, sum(coalesce(expense,0))::bigint exp, count(*) n
   from transactions where year=$1 and account_id = any($2);`,
  [year, accounts],
);
console.log(
  `\nНийт: орлого=${tot.rows[0].inc}, зарлага=${tot.rows[0].exp}, гүйлгээ=${tot.rows[0].n}`,
);

// 3. Эхний үлдэгдэл (account_balances)
const ob = await client.query(
  `select sum(opening_balance)::bigint ob from account_balances where year=$1 and account_id = any($2);`,
  [year, accounts],
);
console.log(`Эхний үлдэгдэл (account_balances): ${ob.rows[0].ob}`);

// 4. Жишээ: санхүүжилтийн зээл эргэн төлөлт (5.2.2) бодит гүйлгээнүүд
const loan = await client.query(
  `select to_char(txn_date,'YYYY-MM-DD') d, bank, description, expense::bigint
   from transactions
   where year=$1 and account_id = any($2) and expense_code='5.2.2'
   order by txn_date limit 5;`,
  [year, accounts],
);
console.log(`\n5.2.2 (Зээл эргэн төлсөн) бодит гүйлгээ — ${loan.rowCount} мөр:`);
for (const r of loan.rows) {
  console.log(`  ${r.d} | ${r.bank} | ${r.description?.slice(0, 40)} | ${r.expense}`);
}

await client.end();
