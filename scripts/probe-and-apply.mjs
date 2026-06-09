// Pooler бүсийг таамаглаж холбогдоод, зөв бүс олдвол schema.sql ажиллуулна.
// Орчны хувьсагч: PROJECT_REF, PGPASSWORD (диск рүү бичихгүй).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, "..", "bank_importer", "schema.sql"), "utf8");

const ref = process.env.PROJECT_REF;
const password = process.env.PGPASSWORD;
if (!ref || !password) {
  console.error("PROJECT_REF болон PGPASSWORD шаардлагатай.");
  process.exit(1);
}

// Магадлалаар эрэмбэлсэн бүсүүд (Монгол → Ази эхэлж).
const regions = [
  "ap-southeast-1", "ap-northeast-1", "ap-northeast-2", "ap-south-1",
  "ap-southeast-2", "us-east-1", "us-east-2", "us-west-1",
  "eu-central-1", "eu-west-1", "eu-west-2",
];
const prefixes = ["aws-0", "aws-1"];

async function tryConnect(host) {
  const client = new pg.Client({
    host,
    port: 5432, // Session pooler
    user: `postgres.${ref}`,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    query_timeout: 8000,
  });
  try {
    await client.connect();
    await client.query("select 1");
    return client; // амжилттай — нээлттэй client буцаана
  } catch (e) {
    try { await client.end(); } catch {}
    return { error: e.message };
  }
}

let live = null;
let liveHost = null;
outer: for (const region of regions) {
  for (const prefix of prefixes) {
    const host = `${prefix}-${region}.pooler.supabase.com`;
    const res = await tryConnect(host);
    if (res && typeof res.query === "function") {
      live = res;
      liveHost = host;
      break outer;
    }
    // Зөвхөн "хост/бүс буруу" төрлийн алдааг чимээгүй өнгөрөөнө;
    // нууц үг буруу бол бүх бүс дээр адил алдаа гарна → дор мэдэгдэнэ.
    if (res?.error && /password|authentication/i.test(res.error)) {
      console.error("❌ Нэвтрэлт амжилтгүй (нууц үг буруу байж магадгүй):", res.error);
      process.exit(2);
    }
  }
}

if (!live) {
  console.error("❌ Аль ч бүсэд холбогдсонгүй.");
  process.exit(1);
}

console.log("✅ Холбогдсон бүс:", liveHost);

try {
  await live.query(sql); // idempotent
  console.log("✅ Schema ажиллалаа.");

  const { rows } = await live.query(
    `select table_name from information_schema.tables
     where table_schema='public'
       and table_name in ('transactions','cutoffs','account_balances')
     order by table_name;`,
  );
  console.log("Хүснэгтүүд:", rows.map((r) => r.table_name).join(", "));

  const { rows: cut } = await live.query(
    "select account_id, to_char(last_txn_at,'YYYY-MM-DD') d from cutoffs order by account_id;",
  );
  console.log("cutoffs seed:", JSON.stringify(cut));

  const { rows: bal } = await live.query(
    "select account_id, year, opening_balance from account_balances order by account_id;",
  );
  console.log("account_balances seed:", JSON.stringify(bal));
} catch (e) {
  console.error("❌ Schema алдаа:", e.message);
  process.exitCode = 1;
} finally {
  await live.end();
}
