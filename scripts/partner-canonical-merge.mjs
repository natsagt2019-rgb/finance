// Харилцагчийн нэрийн хувилбаруудыг (галиглал/зөв бичиг) нэг canonical болгоно.
// 1) Хувилбар нэрсийг partners.aliases-д нэмнэ.  2) journal_entries.partner_name-г
// нэр+alias-аар canonical partners.name руу нэгтгэнэ. Тайлангууд нормчилдог тул нэгдэнэ.
import { readFileSync } from "node:fs"; import pg from "pg";
const txt=readFileSync(".env.local","utf8");for(const l of txt.split(/\r?\n/)){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!(m[1]in process.env)){let v=m[2].trim();if((v[0]==='"'&&v.endsWith('"'))||(v[0]==="'"&&v.endsWith("'")))v=v.slice(1,-1);process.env[m[1]]=v;}}
const c=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,ssl:{rejectUnauthorized:false}});await c.connect();

// variant → canonical partners.name (баталгаатай хосууд)
const PAIRS = [
  ["МАРРИЙ МАЙНИНГ СЕРВИСЕС ХХК", "Murray Mining Services LLC"],
  ["МАК АРАНЖИН ЗЭС ХХК", "MAK Aranjin Zes CO.,ltd"],
  ["Алтгана ресурс ХХК.", "АЛТГАНА РЕСУРСЕС ХХК"],
  ["АПУТРЕЙДИНГ", "АПУ ТРЕЙДИНГ ХХК"],
  ["САММИТ", "Саммит ХХК"],
  ["Сүү ХК", "Сүү"],
  ["БНЦМУ ХХК", "БНЦМҮ ХХК"],
  ["ЭНХТАЙВАН ӨНӨРСАЙХАН", "ӨНӨРСАЙХАН ЭНХТАЙВАН"],
  ["ТАВАН БОГД ФҮҮДС ПИЦЦА", "Таван Богд Фүүдс Пицца ХХК"],
];
let added=0, skipped=[];
for (const [variant, canon] of PAIRS) {
  const p = await c.query("SELECT id, aliases FROM partners WHERE is_active AND name=$1 LIMIT 1",[canon]);
  if (!p.rows.length) { skipped.push(canon); continue; }
  const cur = Array.isArray(p.rows[0].aliases) ? p.rows[0].aliases : [];
  if (cur.some(a => String(a).toUpperCase().trim()===variant.toUpperCase().trim())) continue;
  cur.push(variant);
  await c.query("UPDATE partners SET aliases=$1::jsonb WHERE id=$2",[JSON.stringify(cur), p.rows[0].id]);
  added++;
}
console.log(`Alias нэмсэн: ${added}${skipped.length?` | canonical олдсонгүй: ${skipped.join(", ")}`:""}`);

// journal_entries-ийг canonical руу нэгтгэх (нэр+alias нормчилсон тулгалт)
const res = await c.query(`
  WITH pmap AS (
    SELECT upper(trim(name)) k, name canon FROM partners WHERE is_active AND name IS NOT NULL
    UNION
    SELECT upper(trim(a.val)) k, p.name canon FROM partners p
      CROSS JOIN LATERAL jsonb_array_elements_text(p.aliases) a(val)
      WHERE p.is_active AND p.aliases IS NOT NULL AND jsonb_typeof(p.aliases)='array'
  )
  UPDATE journal_entries je SET partner_name = pm.canon
  FROM pmap pm
  WHERE je.partner_name IS NOT NULL AND je.partner_name<>''
    AND upper(trim(je.partner_name)) = pm.k AND je.partner_name <> pm.canon`);
console.log("journal_entries canonical болгосон мөр:", res.rowCount);
await c.query("NOTIFY pgrst, 'reload schema';");

// Verify
const v=await c.query(`SELECT partner_name, COUNT(*)::int n FROM journal_entries WHERE upper(partner_name) LIKE '%MURRAY%' OR upper(partner_name) LIKE '%МАРРИЙ%' OR upper(partner_name) LIKE '%ARANJIN%' OR upper(partner_name) LIKE '%АРАНЖИН%' OR upper(partner_name) LIKE '%АЛТГАНА%' GROUP BY partner_name ORDER BY 1`);
console.log("\nШалгалт (Murray/Aranjin/Алтгана):"); for(const x of v.rows) console.log(` [${x.partner_name}] ${x.n}м`);
await c.end();
