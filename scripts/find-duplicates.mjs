// Давхардал илрүүлэлт — import/actions.ts доторх fingerprint-тэй ИЖИЛ логик:
// данс + БҮТЭН timestamp + нормчилсон тайлбар + орлого + зарлага. Зөвхөн УНШИНА.
import { readFileSync } from "node:fs";
import pg from "pg";
const txt=readFileSync(".env.local","utf8");
for(const l of txt.split(/\r?\n/)){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!(m[1]in process.env)){let v=m[2].trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[m[1]]=v;}}
const fmt=n=>Number(n).toLocaleString("en-US",{minimumFractionDigits:2});
function fp(acc,ts,desc,inc,exp){
  const i=inc==null?"":String(Number(inc)), e=exp==null?"":String(Number(exp));
  const d=(desc??"").trim().replace(/\s+/g," ");
  return [acc,new Date(ts).toISOString(),d,i,e].join("|");
}
const c=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,ssl:{rejectUnauthorized:false}});
await c.connect();
const {rows}=await c.query(`select id,account_id,txn_date,income,expense,counterparty,description from transactions order by id;`);
const groups=new Map();
for(const r of rows){const k=fp(r.account_id,r.txn_date,r.description,r.income,r.expense);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
const dups=[...groups.values()].filter(a=>a.length>1);
let extra=0, amt=0; const byAcct={}; const delIds=[];
for(const a of dups){extra+=a.length-1; amt+=(a.length-1)*(Number(a[0].income||0)+Number(a[0].expense||0)); byAcct[a[0].account_id]=(byAcct[a[0].account_id]||0)+(a.length-1); delIds.push(...a.slice(1).map(r=>r.id));}
console.log(`Нийт гүйлгээ: ${rows.length}`);
console.log(`Давхардсан бүлэг: ${dups.length},  илүүдэл мөр: ${extra},  дүн: ${fmt(amt)}`);
console.log(`Дансаар:`, JSON.stringify(byAcct));
console.log(`Устгах ID-ууд: [${delIds.join(", ")}]`);
console.log(`\nДэлгэрэнгүй:`);
for(const a of dups){
  console.log(`  ${a[0].account_id} ${new Date(a[0].txn_date).toISOString()} x${a.length} орл=${fmt(a[0].income||0)} зар=${fmt(a[0].expense||0)} cp=[${a[0].counterparty}]`);
  console.log(`     үлдээх=${a[0].id}  устгах=${a.slice(1).map(r=>r.id).join(",")}  "${(a[0].description||'').replace(/\s+/g,' ').slice(0,34)}"`);
}
await c.end();
