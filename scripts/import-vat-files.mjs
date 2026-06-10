// eBarimt портал Excel файлуудыг шууд vat_records-д ачаална (service-role REST).
// Хүснэгт (vat_records) аль хэдийн үүссэн байх ёстой (scripts/vat-schema.sql).
//
// Ажиллуулах:
//   node --experimental-strip-types scripts/import-vat-files.mjs <file1.xlsx> <file2.xlsx> ...
//
// Төрөл (out/in) нь файлын нэрнээс тодорхойлогдоно ("худалдан авалт" → in).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import { parseVatExcel } from "../src/lib/vat-import.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  try {
    const txt = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch {
    /* орчны хувьсагчид найдна */
  }
}

loadEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY олдсонгүй.");
  process.exit(1);
}

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error("Хэрэглээ: node --experimental-strip-types scripts/import-vat-files.mjs <файл.xlsx> ...");
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function rest(path, init = {}) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}

// ── 1. Файлуудыг задлаx ──────────────────────────────────────────────────────
const all = [];
for (const p of paths) {
  const buf = readFileSync(p);
  const res = parseVatExcel(buf, basename(p));
  console.log(`→ ${basename(p).slice(0, 50)}  [${res.format}]  ${res.rows.length} баримт, ${res.skipped} алгассан`);
  all.push(...res.rows);
}

// ── 2. Багц доtorх ДДТД давхардлыг хасах ────────────────────────────────────
const seen = new Set();
const unique = [];
for (const r of all) {
  if (r.ddtd) {
    if (seen.has(r.ddtd)) continue;
    seen.add(r.ddtd);
  }
  unique.push(r);
}
console.log(`\nНийт ${all.length} → давхардал хасаад ${unique.length} баримт`);

// ── 3. Харилцагчийг register-ээр тулгах ──────────────────────────────────────
const regs = [...new Set(unique.map((r) => r.partner_register).filter(Boolean))];
const regToId = new Map();
for (let i = 0; i < regs.length; i += 200) {
  const slice = regs.slice(i, i + 200);
  const inList = slice.map((s) => `"${s}"`).join(",");
  const data = await rest(`partners?select=id,register&register=in.(${encodeURIComponent(inList)})`);
  for (const p of data || []) if (p.register) regToId.set(p.register, p.id);
}
let matched = 0;

// ── 4. DB рүү багцлан upsert (ddtd дээр давхардлыг алгасна) ──────────────────
const dbRows = unique.map((r) => {
  const pid = r.partner_register ? regToId.get(r.partner_register) ?? null : null;
  if (pid) matched++;
  return {
    date: r.date,
    type: r.type,
    ddtd: r.ddtd,
    parent_ddtd: r.parent_ddtd,
    invoice_no: r.invoice_no,
    partner_name: r.partner_name,
    partner_register: r.partner_register,
    partner_id: pid,
    amount: r.amount,
    vat_amount: r.vat_amount,
    total_amount: r.total_amount,
    paid_amount: r.paid_amount,
    remaining: r.remaining,
    tax_type: r.tax_type,
    source: r.source,
    ebarimt_status: r.ebarimt_status,
  };
});

let added = 0;
const BATCH = 500;
for (let i = 0; i < dbRows.length; i += BATCH) {
  const slice = dbRows.slice(i, i + BATCH);
  const res = await rest(`vat_records?on_conflict=ddtd`, {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify(slice),
  });
  added += Array.isArray(res) ? res.length : 0;
  console.log(`  ачаалсан ${Math.min(i + BATCH, dbRows.length)}/${dbRows.length}…`);
}

console.log(`\n✅ Дуусав. Нэмэгдсэн: ${added}, харилцагч тулгасан: ${matched}/${unique.length}`);
