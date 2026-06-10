// "Нэхэмжлэх (35).xlsx" → Түмэн Тээх ХХК-ийн 2026 оны нэхэмжлэлийг задлан
// scripts/invoices-tt-2026-seed.sql (idempotent INSERT) болгож үүсгэнэ.
//
// Ажиллуулах:  node scripts/gen-invoices-tt-2026.mjs
//
// Гаралтыг Supabase SQL Editor-д (эсвэл apply скриптээр) ажиллуулна.
// partner_id нь partners.register-ээр (нэрээр fallback) apply үед тулгагдана.
import * as XLSX from "xlsx";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const XLSX_PATH = "C:\\Users\\natsa\\Downloads\\Нэхэмжлэх (35).xlsx";
const ISSUER = "Түмэн Тээх ХХК";
const YEAR = 2026;
const OUT = join(root, "scripts", "invoices-tt-2026-seed.sql");

// Excel raw serial → 'YYYY-MM-DD' (UTC, timezone артефактгүй)
function serialToYMD(serial) {
  if (typeof serial !== "number" || !isFinite(serial)) return null;
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  return d.toISOString().slice(0, 10);
}

// SQL мөрийн литерал escape
const q = (s) =>
  s == null ? "NULL" : "'" + String(s).replace(/'/g, "''").trim() + "'";
const qd = (ymd) => (ymd ? `'${ymd}'::date` : "NULL");
const cleanReg = (r) => {
  const s = String(r ?? "").trim();
  return s && s !== "" ? s : null;
};

const buf = readFileSync(XLSX_PATH);
const wb = XLSX.read(buf, { cellDates: false }); // raw serials
const ws = wb.Sheets["Invoice list"];
const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
const data = aoa.slice(2);

const I = { no: 1, line: 2, date: 3, issuer: 4, payer: 11, payerReg: 13,
  due: 17, utga: 18, qty: 19, unit: 20, linetot: 21, paidtxt: 22, kam: 23 };

// Шүүлт: Түмэн Тээх ХХК + Огнооны жил == 2026
const rows = data.filter((r) => {
  if (!r[I.no]) return false;
  if (String(r[I.issuer]).trim() !== ISSUER) return false;
  const ymd = serialToYMD(r[I.date]);
  return ymd && ymd.slice(0, 4) === String(YEAR);
});

// Нэхэмжлэлээр бүлэглэх (мөрийн дарааллыг хадгалах)
const order = [];
const byNo = new Map();
for (const r of rows) {
  const no = String(r[I.no]).trim();
  if (!byNo.has(no)) { byNo.set(no, []); order.push(no); }
  byNo.get(no).push(r);
}

const invoices = [];
for (const no of order) {
  const ls = byNo.get(no);
  const f = ls[0]; // эхний мөр = толгойн мэдээлэл
  const amount = ls.reduce((s, r) => s + (Number(r[I.linetot]) || 0), 0);
  const allPaid = ls.every((r) => String(r[I.paidtxt]).trim() === "Төлсөн");
  // Огноо: мөрүүдийн хамгийн эртний
  const dates = ls.map((r) => serialToYMD(r[I.date])).filter(Boolean).sort();
  invoices.push({
    invoice_no: no,
    inv_date: dates[0] ?? serialToYMD(f[I.date]),
    due_date: serialToYMD(f[I.due]),
    partner_name: String(f[I.payer] ?? "").trim() || null,
    partner_reg: cleanReg(f[I.payerReg]),
    responsible: String(f[I.kam] ?? "").trim() || null,
    description: String(f[I.utga] ?? "").trim() || null,
    amount: Math.round(amount * 100) / 100,
    paid_amount: allPaid ? Math.round(amount * 100) / 100 : 0,
    status: allPaid ? "paid" : "open",
    lines: ls.length,
  });
}

// ── SQL үүсгэх ──────────────────────────────────────────────────────────
const total = invoices.reduce((s, i) => s + i.amount, 0);
const paidCnt = invoices.filter((i) => i.status === "paid").length;
const out = [];
out.push("-- ============================================================");
out.push(`-- Түмэн Тээх ХХК — ${YEAR} оны нэхэмжлэх (эх сурвалж: Нэхэмжлэх (35).xlsx)`);
out.push(`-- ${invoices.length} нэхэмжлэл | нийт ${total.toLocaleString("en-US")}₮ (НӨАТ-гүй)`);
out.push(`-- Төлөгдсөн: ${paidCnt} | Нээлттэй: ${invoices.length - paidCnt}`);
out.push("-- Урьдчилсан нөхцөл: invoices + partners хүснэгт үүссэн, partners seed хийгдсэн байх.");
out.push("-- partner_id нь register-ээр (нэрээр fallback) apply үед тулгагдана.");
out.push("-- Idempotent: ижил invoice_no дахин орохгүй.");
out.push("-- ============================================================");
out.push("");

for (const v of invoices) {
  // partner_id-г subquery-аар тулгана
  let pid;
  const nameSub = `(SELECT id FROM partners WHERE lower(btrim(name)) = lower(${q(v.partner_name)}) AND is_active ORDER BY id LIMIT 1)`;
  if (v.partner_reg) {
    const regSub = `(SELECT id FROM partners WHERE btrim(register) = ${q(v.partner_reg)} AND is_active ORDER BY id LIMIT 1)`;
    pid = `COALESCE(${regSub}, ${nameSub})`;
  } else {
    pid = nameSub;
  }
  out.push(
    `INSERT INTO invoices (invoice_no, inv_date, due_date, partner_id, partner_name, responsible, description, amount, paid_amount, status, currency)`,
  );
  out.push(
    `SELECT ${q(v.invoice_no)}, ${qd(v.inv_date)}, ${qd(v.due_date)}, ${pid}, ${q(v.partner_name)}, ${q(v.responsible)}, ${q(v.description)}, ${v.amount}, ${v.paid_amount}, ${q(v.status)}, 'MNT'`,
  );
  out.push(
    `WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_no = ${q(v.invoice_no)});`,
  );
  out.push("");
}
out.push("NOTIFY pgrst, 'reload schema';");
out.push("");

writeFileSync(OUT, out.join("\n"), "utf8");
console.log(`✅ Бичигдлээ: ${OUT}`);
console.log(`   ${invoices.length} нэхэмжлэл | нийт ${total.toLocaleString("en-US")}₮`);
console.log(`   Төлөгдсөн: ${paidCnt} | Нээлттэй: ${invoices.length - paidCnt}`);
const noReg = invoices.filter((i) => !i.partner_reg).length;
const multi = invoices.filter((i) => i.lines > 1).length;
console.log(`   Регистргүй: ${noReg} | Олон мөртэй: ${multi}`);
