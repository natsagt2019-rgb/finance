import { readFileSync } from "node:fs";
import pg from "pg";
const env = Object.fromEntries(readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>l&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")];}));
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();
// Валютын дансны 2026 оны эхний үлдэгдэл (анхны валютаар). Банкны хуулгаас.
const seed = [["TTU",2026,21.81],["TTE",2026,15.62]];
for (const [acc,year,bal] of seed) {
  await c.query(
    `insert into account_balances (account_id, year, opening_balance) values ($1,$2,$3)
     on conflict (account_id, year) do update set opening_balance = excluded.opening_balance`,
    [acc, year, bal]
  );
}
const rows = await c.query("select account_id, year, opening_balance from account_balances where account_id in ('TTU','TTE') order by account_id");
console.log("оруулсан:", JSON.stringify(rows.rows));
await c.end();
