// 2.1.10 (Түрээс) кодтой гүйлгээнүүдийг ЗАСАГДСАН coder-ээр дахин ангилна.
// Зөвхөн Гацуурт л 2.1.10 хэвээр үлдэж, бусад (машин/кран түрээс) → тээвэр (1.2.1/1.2.2).
// PROJECT_REF, PGPASSWORD орчны хувьсагч.
import pg from "pg";
import { applyCodes } from "../src/lib/bank-importer/coder";
import type { NormalizedTxn } from "../src/lib/bank-importer/types";

async function main() {
  const c = new pg.Client({
    host: "aws-1-ap-southeast-2.pooler.supabase.com",
    port: 5432,
    user: `postgres.${process.env.PROJECT_REF}`,
    password: process.env.PGPASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const { rows } = await c.query(
    "select id, account_id, description, counterparty, income, expense, txn_date from transactions where expense_code='2.1.10'",
  );
  console.log(`2.1.10 кодтой нийт гүйлгээ: ${rows.length}`);

  const updates: { id: number; code: string }[] = [];
  const breakdown: Record<string, number> = {};

  for (const r of rows) {
    const txn = {
      account_id: r.account_id,
      txn_date: new Date(r.txn_date),
      bank: "",
      description: r.description || "",
      counterparty: r.counterparty || "",
      account_no: "",
      exchange_rate: 1,
      income: r.income != null ? Number(r.income) : null,
      expense: r.expense != null ? Number(r.expense) : null,
    } as NormalizedTxn;

    const coded = applyCodes(txn, r.account_id);
    const newCode = coded.expense_code;
    if (newCode && newCode !== "2.1.10") {
      updates.push({ id: r.id, code: newCode });
      breakdown[newCode] = (breakdown[newCode] || 0) + 1;
    }
  }

  console.log(`Өөрчлөгдөх (Гацуурт биш): ${updates.length}`);
  console.log(`Шинэ кодын задаргаа: ${JSON.stringify(breakdown)}`);

  if (updates.length > 0) {
    await c.query(
      "update transactions t set expense_code = v.code from (select unnest($1::bigint[]) id, unnest($2::text[]) code) v where t.id = v.id",
      [updates.map((u) => u.id), updates.map((u) => u.code)],
    );
    console.log(`✅ Шинэчиллээ: ${updates.length} мөр`);
  }

  const t = await c.query(
    "select sum(expense)::bigint s, count(*) n from transactions where expense_code='2.1.10'",
  );
  console.log(`\nШинэ 2.1.10 (зөвхөн Гацуурт) нийт: ${t.rows[0].s} (${t.rows[0].n} гүйлгээ)`);

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
