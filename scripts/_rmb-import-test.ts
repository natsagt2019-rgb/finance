// ============================================================
// ХЯТАДААС RMB-р ГААЛИАР ИМПОРТЛОХ — END-TO-END тест + АУДИТ
// ------------------------------------------------------------
// Хувилбар: 100 нэр төрлийн БМ-ийг Хятадаас RMB(CNY)-р худалдаж аван,
// гаалиар оруулж, дараах нэмэлт зардлуудыг ӨРТӨГТ ШИНГЭЭНЭ (landed cost):
//   • Гаалийн албан татвар (5% × FOB)
//   • Тээврийн зардал (нэг дүн → үнийн дүнгээр хувиарлана)
//   • Хадгалалтын зардал (нэг дүн → үнийн дүнгээр хувиарлана)
//   • Импортын НӨАТ (10%) — НӨХӨН ТӨЛӨГДӨХ тул өртөгт ОРОХГҮЙ (Дт 130600)
// Дараа нь борлуулалт хийж, нийлүүлэгчид RMB өглөгөө өөр ханшаар төлж
// бодит ханшийн олз/гарзыг бүртгэнэ.
//
// АУДИТ:
//   A) Landed allocation: Σ(тээвэр хувиарлал)=тээвэр нийт, Σ(хадгалалт)=нийт
//   B) Import voucher балансжсан (Дт=Кт), нийт landed = FOB+татвар+тээвэр+хадгалалт
//   C) Subledger (FIFO landed) ↔ GL инв данс (journal_entries Дт−Кт)
//   D) Борлуулалтын ашиг = орлого − ББӨ > 0
//   E) Ханшийн зөрүү = (хуучин−шинэ ханш) × CNY өглөг
// Ажиллуулах:  node scripts/_rmb-import-test.ts
// Дата DB-д үлдэнэ (note='RMBIMP'); дараагийн ажиллуулалт автомат цэвэрлэнэ.
// ============================================================
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  computeFifo,
  fifoIssueCost,
  type MoveLite,
} from "../src/lib/inventory-calc.ts";

// ── env ──
const txt = readFileSync(".env.local", "utf8");
for (const l of txt.split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}
const sb: any = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// ── helpers ──
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const fmt = (n: number) => Math.round(Number(n) || 0).toLocaleString("en-US");
let pass = 0, fail = 0;
const findings: string[] = [];
const ok = (label: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "OK " : "XX "} ${label}${extra ? "  " + extra : ""}`);
  cond ? pass++ : fail++;
};
function chunks<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// ── config (Хятад импорт) ──
const COMPANY = "ТҮМЭН ТЭЭХ";
const DATE = "2026-06-20"; // гаалийн мэдүүлгийн огноо
const PAY_DATE = "2026-07-05"; // RMB өглөг төлсөн огноо
const TAG = "RMBIMP";
const JE = "RMBIMP:";
const N = 100; // нэр төрөл
const RATE_BUY = 490; // CNY→₮ мэдүүлгийн ханш
const RATE_PAY = 484; // CNY→₮ төлбөрийн өдрийн ханш (RMB суларсан → олз)
const DUTY_RATE = 0.05; // гаалийн албан татвар 5%
const VAT_RATE = 0.10; // импортын/борлуулалтын НӨАТ 10%
const FREIGHT_TOTAL = 12_000_000; // тээвэр (Хятад→УБ), нийт ₮
const STORAGE_TOTAL = 3_000_000; // гаалийн агуулахын хадгалалт, нийт ₮
const MARKUP = 1.45; // борлуулалтын нэмэгдэл
const SELL_FRAC = 0.6; // борлуулах хувь

// 3 ангилал → 3 инв данс руу тарна (худалдааны бараа гол).
const CAT_PLAN: { cat: string; count: number }[] = [
  { cat: "120299", count: 50 }, // 150500 Худалдааны бараа
  { cat: "120201", count: 30 }, // 150100 Түүхий эд
  { cat: "120204", count: 20 }, // 150600 Бага үнэтэй
];

async function main() {
// ── LOAD settings + accounts ──
const { data: S } = await sb.from("inv_settings").select("*").eq("id", 1).maybeSingle();
const catAcc = S.category_accounts as Record<string, number>;
const { data: allAcc } = await sb.from("accounts").select("id,code").limit(5000);
const idToCode = new Map<number, string>();
const codeToId = new Map<string, number>();
for (const a of allAcc ?? []) { idToCode.set(a.id, a.code); codeToId.set(a.code, a.id); }
const AP = codeToId.get("310100")!;       // нийлүүлэгчийн өглөг (RMB)
const VAT_IN = codeToId.get("130600")!;    // НӨАТ-ын авлага (импортын)
const VAT_OUT = codeToId.get("330100")!;   // НӨАТ-ын өглөг (борлуулалтын)
const BANK = codeToId.get("110200")!;      // харилцах данс (гааль/тээвэр төлсөн)
const CNY_CASH = codeToId.get("110400")!;  // гадаад валютын касс (CNY)
const COGS = codeToId.get("710100")!;      // борлуулсан барааны өртөг
const AR = codeToId.get("130100")!;        // худалдан авагчийн авлага
const REV = codeToId.get("610100")!;       // борлуулалтын орлого
const FX_GAIN = codeToId.get("620400")!;   // ханшийн бодит олз
const FX_LOSS = codeToId.get("810200")!;   // ханшийн бодит гарз
const catToInv = new Map<string, number>(); // cat → inv account id
for (const p of CAT_PLAN) catToInv.set(p.cat, catAcc[p.cat]);
const catToInvCode = new Map<string, string>();
for (const [c, id] of catToInv) catToInvCode.set(c, idToCode.get(id)!);
console.log("Ханш:", RATE_BUY, "₮/CNY | inv данс:", JSON.stringify(Object.fromEntries(catToInvCode)),
  "| AP:", idToCode.get(AP), "| VAT_in:", idToCode.get(VAT_IN), "| COGS:", idToCode.get(COGS));

// ── two-pointer: Дт/Кт мөрүүд → journal_entries (хос код) ──
type JErow = { txn_date: string; description: string; amount: number; debit_code: string; credit_code: string; source: string; is_opening: boolean };
function pair(lines: { code: string; debit: number; credit: number }[], date: string, desc: string): JErow[] {
  const debits = lines.filter((l) => r2(l.debit) > 0).map((l) => ({ code: l.code, amt: r2(l.debit) }));
  const credits = lines.filter((l) => r2(l.credit) > 0).map((l) => ({ code: l.code, amt: r2(l.credit) }));
  const out: JErow[] = [];
  let i = 0, j = 0;
  while (i < debits.length && j < credits.length) {
    const amt = r2(Math.min(debits[i].amt, credits[j].amt));
    if (amt > 0) out.push({ txn_date: date, description: desc, amount: amt, debit_code: debits[i].code, credit_code: credits[j].code, source: "rmb_import_test", is_opening: false });
    debits[i].amt = r2(debits[i].amt - amt);
    credits[j].amt = r2(credits[j].amt - amt);
    if (debits[i].amt <= 0.005) i++;
    if (credits[j].amt <= 0.005) j++;
  }
  return out;
}

// ── CLEANUP өмнөх ажиллуулалт ──
console.log("\n=== CLEANUP ===");
const oldIds: number[] = [];
for (let off = 0; off < 100000; off += 1000) {
  const { data } = await sb.from("inv_items").select("id").eq("note", TAG).order("id").range(off, off + 999);
  const page = data ?? [];
  oldIds.push(...page.map((r: any) => r.id));
  if (page.length < 1000) break;
}
if (oldIds.length) {
  for (const grp of chunks(oldIds, 100)) {
    await sb.from("inv_moves").delete().in("item_id", grp);
    await sb.from("inv_items").delete().in("id", grp);
  }
}
await sb.from("journal_entries").delete().eq("source", "rmb_import_test");
await sb.from("journal_entries").delete().like("description", JE + "%");
console.log("Хуучин тест бараа:", oldIds.length, "→ цэвэрлэв.");

// ── SEED 100 бараа (Хятадаас) ──
console.log("\n=== SEED 100 бараа ===");
type Spec = { id?: number; sku: string; name: string; cat: string; qty: number; cnyUnit: number };
const specs: Spec[] = [];
let k = 0;
for (const p of CAT_PLAN) for (let c = 0; c < p.count; c++) {
  k++;
  const qty = 50 + (k * 7) % 250;          // 50..299
  const cnyUnit = r2(8 + (k * 13) % 112);   // 8..119 CNY/нэгж
  specs.push({ sku: `CN-${String(k).padStart(3, "0")}`, name: `ТЕСТ-ХЯТАД БМ #${k}`, cat: p.cat, qty, cnyUnit });
}
const itemRows = specs.map((s) => ({ sku: s.sku, name: s.name, category_code: s.cat, unit: "ш", company: COMPANY, note: TAG, is_active: true }));
const inserted: any[] = [];
for (const grp of chunks(itemRows, 500)) {
  const { data, error } = await sb.from("inv_items").insert(grp).select("id,sku");
  if (error) { console.error("SEED err:", error.message); process.exit(1); }
  inserted.push(...data);
}
const skuToId = new Map<string, number>(inserted.map((r) => [r.sku, r.id]));
for (const s of specs) s.id = skuToId.get(s.sku)!;
ok(`Seed ${N} бараа`, inserted.length === N, `үүссэн ${inserted.length}`);

// ── LANDED COST тооцоо ──
console.log("\n=== LANDED COST (өртөг шингээлт) ===");
// FOB
for (const s of specs) (s as any).fobCny = r2(s.qty * s.cnyUnit);
const fobCnyTotal = r2(specs.reduce((a, s) => a + (s as any).fobCny, 0));
for (const s of specs) (s as any).fobMnt = r2((s as any).fobCny * RATE_BUY);
const fobMntTotal = r2(specs.reduce((a, s) => a + (s as any).fobMnt, 0));
// Гаалийн татвар (5% × FOB_MNT)
for (const s of specs) (s as any).duty = r2((s as any).fobMnt * DUTY_RATE);
const dutyTotal = r2(specs.reduce((a, s) => a + (s as any).duty, 0));
// Тээвэр + хадгалалтыг үнийн дүнгээр хувиарла (residual → сүүлийн бараанд)
function allocate(total: number, key: "freight" | "storage") {
  let acc = 0;
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    if (i === specs.length - 1) (s as any)[key] = r2(total - acc);
    else { const v = r2(total * (s as any).fobMnt / fobMntTotal); (s as any)[key] = v; acc = r2(acc + v); }
  }
}
allocate(FREIGHT_TOTAL, "freight");
allocate(STORAGE_TOTAL, "storage");
const freightSum = r2(specs.reduce((a, s) => a + (s as any).freight, 0));
const storageSum = r2(specs.reduce((a, s) => a + (s as any).storage, 0));
// Landed (өртөгт орох) = FOB + татвар + тээвэр + хадгалалт ; импортын НӨАТ ОРОХГҮЙ.
// total_cost = тоо×нэгж_өртөг (production-той ижил, бүхэл тоо тул дугуйралтгүй) →
// subledger (FIFO) ↔ GL яг тэнцэнэ. Концепцийн landed-тэй сүүлийн нэгжийн
// дугуйралтаар <1₮/бараа зөрж болзошгүй (A3-д хүлцэлтэйгээр шалгана).
for (const s of specs) {
  (s as any).conceptual = r2((s as any).fobMnt + (s as any).duty + (s as any).freight + (s as any).storage);
  (s as any).landedUnit = r2((s as any).conceptual / s.qty);
  (s as any).landed = r2(s.qty * (s as any).landedUnit); // = total_cost
}
const landedTotal = r2(specs.reduce((a, s) => a + (s as any).landed, 0));
const conceptualTotal = r2(specs.reduce((a, s) => a + (s as any).conceptual, 0));
// Импортын НӨАТ (нөхөн төлөгдөх) = 10% × (FOB + татвар)
const importVat = r2((fobMntTotal + dutyTotal) * VAT_RATE);

console.log(`  FOB: ${fmt(fobCnyTotal)} CNY × ${RATE_BUY} = ${fmt(fobMntTotal)}₮`);
console.log(`  Гаалийн татвар (5%): ${fmt(dutyTotal)}₮ | Тээвэр: ${fmt(freightSum)}₮ | Хадгалалт: ${fmt(storageSum)}₮`);
console.log(`  Импортын НӨАТ (10%, нөхөгдөх): ${fmt(importVat)}₮`);
console.log(`  → LANDED нийт (өртөг): ${fmt(landedTotal)}₮`);

// (A) хувиарлал зөв эсэх
ok("A1: Σ тээвэр хувиарлал = тээвэр нийт", Math.abs(freightSum - FREIGHT_TOTAL) < 0.5, `${fmt(freightSum)} vs ${fmt(FREIGHT_TOTAL)}`);
ok("A2: Σ хадгалалт хувиарлал = хадгалалт нийт", Math.abs(storageSum - STORAGE_TOTAL) < 0.5, `${fmt(storageSum)} vs ${fmt(STORAGE_TOTAL)}`);
ok("A3: landed ≈ FOB+татвар+тээвэр+хадгалалт (нэгж дугуйралт <1₮/бараа)",
  Math.abs(landedTotal - conceptualTotal) < N,
  `landed ${fmt(landedTotal)} vs ${fmt(conceptualTotal)} (дугуйралт ${fmt(landedTotal - conceptualTotal)}₮)`);

// ── inv_moves: 100 орлого (landed unit cost) ──
console.log("\n=== ОРЛОГО (receipts) ===");
const moveRows: any[] = [];
const layers = new Map<number, { unit_cost: number; qty: number }[]>();
for (const s of specs) {
  moveRows.push({ date: DATE, type: "receipt", item_id: s.id, qty: s.qty, unit_cost: (s as any).landedUnit, total_cost: (s as any).landed, vat_amount: 0, doc_no: "ГААЛЬ-01", company: COMPANY, note: TAG });
  layers.set(s.id!, [{ unit_cost: (s as any).landedUnit, qty: s.qty }]);
}

// ── IMPORT VOUCHER journal (нэг гаалийн мэдүүлэг) ──
// Дт инв данс (ангиллаар нэгтгэл) + Дт 130600 НӨАТ авлага
// Кт 310100 өглөг (FOB, RMB) + Кт 110200 банк (татвар+тээвэр+хадгалалт+импортын НӨАТ)
const invByCat = new Map<string, number>();
for (const s of specs) invByCat.set(s.cat, r2((invByCat.get(s.cat) ?? 0) + (s as any).landed));
const importLines: { code: string; debit: number; credit: number }[] = [];
for (const [cat, val] of invByCat) importLines.push({ code: catToInvCode.get(cat)!, debit: val, credit: 0 });
importLines.push({ code: idToCode.get(VAT_IN)!, debit: importVat, credit: 0 });
importLines.push({ code: idToCode.get(AP)!, debit: 0, credit: fobMntTotal });
// Банкаар төлсөн = капиталжуулсан нэмэлт өртөг (татвар+тээвэр+хадгалалт, дугуйралттай) + импортын НӨАТ.
importLines.push({ code: idToCode.get(BANK)!, debit: 0, credit: r2(landedTotal - fobMntTotal + importVat) });
const impDt = r2(importLines.reduce((a, l) => a + l.debit, 0));
const impKt = r2(importLines.reduce((a, l) => a + l.credit, 0));
ok("B1: Import voucher балансжсан (Дт=Кт)", impDt === impKt, `Дт ${fmt(impDt)} = Кт ${fmt(impKt)}`);
const jeRows: JErow[] = [];
jeRows.push(...pair(importLines, DATE, `${JE} Гаалийн импорт (мэдүүлэг ГААЛЬ-01)`));

// ── БОРЛУУЛАЛТ (issue + орлого) ──
console.log("\n=== БОРЛУУЛАЛТ (sales) ===");
let cogsTotal = 0, revNet = 0, revVat = 0;
const cogsByCat = new Map<string, number>();
for (const s of specs) {
  const sellQty = Math.floor(s.qty * SELL_FRAC);
  if (sellQty <= 0) continue;
  const f = fifoIssueCost(layers.get(s.id!)!, sellQty);
  if (f.shortage > 1e-6) { findings.push(`issue shortage item ${s.id}`); continue; }
  layers.set(s.id!, f.layersAfter);
  moveRows.push({ date: DATE, type: "issue", item_id: s.id, qty: sellQty, unit_cost: r2(f.unitCost), total_cost: r2(f.totalCost), vat_amount: 0, counter_account_id: COGS, doc_no: "БОРЛ-01", company: COMPANY, note: TAG });
  cogsByCat.set(s.cat, r2((cogsByCat.get(s.cat) ?? 0) + r2(f.totalCost)));
  cogsTotal = r2(cogsTotal + r2(f.totalCost));
  const sellUnit = r2((s as any).landedUnit * MARKUP);
  const net = r2(sellQty * sellUnit);
  const vat = r2(net * VAT_RATE);
  revNet = r2(revNet + net);
  revVat = r2(revVat + vat);
}
// COGS voucher (ангиллаар): Дт 710100 / Кт инв данс
const cogsLines: { code: string; debit: number; credit: number }[] = [];
for (const [cat, val] of cogsByCat) {
  cogsLines.push({ code: idToCode.get(COGS)!, debit: val, credit: 0 });
  cogsLines.push({ code: catToInvCode.get(cat)!, debit: 0, credit: val });
}
jeRows.push(...pair(cogsLines, DATE, `${JE} Борлуулсан барааны өртөг`));
// Revenue voucher: Дт 130100 авлага / Кт 610100 орлого + Кт 330100 НӨАТ
jeRows.push(...pair([
  { code: idToCode.get(AR)!, debit: r2(revNet + revVat), credit: 0 },
  { code: idToCode.get(REV)!, debit: 0, credit: revNet },
  { code: idToCode.get(VAT_OUT)!, debit: 0, credit: revVat },
], DATE, `${JE} Борлуулалтын орлого`));
console.log(`  ББӨ нийт: ${fmt(cogsTotal)}₮ | Орлого(цэвэр): ${fmt(revNet)}₮ | Output НӨАТ: ${fmt(revVat)}₮`);

// ── RMB ӨГЛӨГ ТӨЛБӨР (ханшийн зөрүү) ──
console.log("\n=== RMB ӨГЛӨГ ТӨЛБӨР (FX settlement) ===");
const payMnt = r2(fobCnyTotal * RATE_PAY);       // төлбөрийн өдрийн ₮ дүн
const fxDiff = r2(fobMntTotal - payMnt);          // эерэг → олз (бага төлсөн)
const settleLines: { code: string; debit: number; credit: number }[] = [
  { code: idToCode.get(AP)!, debit: fobMntTotal, credit: 0 },     // өглөг хаах (хуучин ханш)
  { code: idToCode.get(CNY_CASH)!, debit: 0, credit: payMnt },    // CNY-р төлсөн (шинэ ханш)
];
if (fxDiff > 0) settleLines.push({ code: idToCode.get(FX_GAIN)!, debit: 0, credit: fxDiff });
else if (fxDiff < 0) settleLines.push({ code: idToCode.get(FX_LOSS)!, debit: -fxDiff, credit: 0 });
jeRows.push(...pair(settleLines, PAY_DATE, `${JE} RMB өглөг төлбөр (ханш ${RATE_PAY})`));
console.log(`  Өглөг ${fmt(fobMntTotal)}₮ (${RATE_BUY}) → төлсөн ${fmt(payMnt)}₮ (${RATE_PAY}) → ${fxDiff >= 0 ? "ОЛЗ" : "ГАРЗ"} ${fmt(Math.abs(fxDiff))}₮`);
ok("E: ханшийн зөрүү = (хуучин−шинэ)×CNY", Math.abs(fxDiff - r2(fobCnyTotal * (RATE_BUY - RATE_PAY))) < 0.5, `${fmt(fxDiff)}₮`);

// ── BULK INSERT ──
console.log("\n=== INSERT ===");
for (const grp of chunks(moveRows, 500)) { const { error } = await sb.from("inv_moves").insert(grp); if (error) { console.error("moves err:", error.message); process.exit(1); } }
for (const grp of chunks(jeRows, 500)) { const { error } = await sb.from("journal_entries").insert(grp); if (error) { console.error("je err:", error.message); process.exit(1); } }
ok("inv_moves insert", true, `${moveRows.length} мөр`);
ok("journal_entries insert", true, `${jeRows.length} мөр`);

// ── AUDIT C: subledger (FIFO) ↔ GL инв данс ──
console.log("\n=== AUDIT: subledger ↔ GL ===");
async function loadMoves(itemId: number): Promise<MoveLite[]> {
  const { data } = await sb.from("inv_moves").select("id,date,type,qty,unit_cost").eq("item_id", itemId).limit(10000);
  return (data ?? []) as MoveLite[];
}
const invCodes = [...new Set([...catToInvCode.values()])];
const subByCode = new Map<string, number>();
for (const s of specs) {
  const code = catToInvCode.get(s.cat)!;
  const v = computeFifo(await loadMoves(s.id!)).valueRemaining;
  subByCode.set(code, r2((subByCode.get(code) ?? 0) + v));
}
let maxDiff = 0;
console.log("  Инв данс | subledger(FIFO) | GL(journal_entries) | зөрүү");
for (const code of invCodes) {
  const { data: dr } = await sb.from("journal_entries").select("amount").eq("debit_code", code).like("description", JE + "%");
  const { data: cr } = await sb.from("journal_entries").select("amount").eq("credit_code", code).like("description", JE + "%");
  const d = (dr ?? []).reduce((a: number, x: any) => a + Number(x.amount), 0);
  const c = (cr ?? []).reduce((a: number, x: any) => a + Number(x.amount), 0);
  const gl = r2(d - c);
  const sub = subByCode.get(code) ?? 0;
  const diff = r2(sub - gl);
  maxDiff = Math.max(maxDiff, Math.abs(diff));
  console.log(`  ${code} | ${fmt(sub)} | ${fmt(gl)} | ${fmt(diff)}`);
}
ok("C: Subledger (FIFO landed) = GL инв данс", maxDiff < 1, `макс зөрүү ${fmt(maxDiff)}₮`);

// ── AUDIT D: ашиг ──
const profit = r2(revNet - cogsTotal);
ok("D: борлуулалтын ашиг > 0", profit > 0, `орлого ${fmt(revNet)} − ББӨ ${fmt(cogsTotal)} = ${fmt(profit)}₮ (ашгийн маржин ${(profit / revNet * 100).toFixed(1)}%)`);

// ── AUDIT B2: GL нийт балансжсан (бидний бүх journal_entries) ──
{
  const { data } = await sb.from("journal_entries").select("amount,debit_code,credit_code").like("description", JE + "%");
  const byCode = new Map<string, number>();
  for (const x of data ?? []) {
    byCode.set(x.debit_code, r2((byCode.get(x.debit_code) ?? 0) + Number(x.amount)));
    byCode.set(x.credit_code, r2((byCode.get(x.credit_code) ?? 0) - Number(x.amount)));
  }
  const net = r2([...byCode.values()].reduce((a, v) => a + v, 0));
  ok("B2: бүх journal_entries нийт Дт=Кт (net 0)", Math.abs(net) < 1, `net ${fmt(net)}₮`);
  // НӨАТ-ын цэвэр байдал
  const vatNet = r2((byCode.get(idToCode.get(VAT_OUT)!) ?? 0) * -1 - (byCode.get(idToCode.get(VAT_IN)!) ?? 0));
  console.log(`  НӨАТ: output(330100) ${fmt(revVat)} − input(130600) ${fmt(importVat)} = төлөх ${fmt(r2(revVat - importVat))}₮`);
}

// ── REPORT ──
console.log("\n============================================================");
console.log(`ТЕСТ ДҮН:  PASS ${pass}  /  FAIL ${fail}`);
console.log("ГОЛ ДҮНГҮҮД:");
console.log(`  • Импорт FOB: ${fmt(fobCnyTotal)} CNY = ${fmt(fobMntTotal)}₮ (ханш ${RATE_BUY})`);
console.log(`  • Шингээсэн нэмэлт өртөг: татвар ${fmt(dutyTotal)} + тээвэр ${fmt(freightSum)} + хадгалалт ${fmt(storageSum)} = ${fmt(r2(dutyTotal + freightSum + storageSum))}₮`);
console.log(`  • LANDED нийт өртөг: ${fmt(landedTotal)}₮ (нэмэгдэл ${((landedTotal / fobMntTotal - 1) * 100).toFixed(1)}% > FOB)`);
console.log(`  • Борлуулалт: орлого ${fmt(revNet)} − ББӨ ${fmt(cogsTotal)} = ашиг ${fmt(profit)}₮`);
console.log(`  • Ханшийн ${fxDiff >= 0 ? "олз" : "гарз"}: ${fmt(Math.abs(fxDiff))}₮`);
if (findings.length) { console.log("ОЛДВОР:"); for (const f of findings) console.log("  • " + f); }
console.log("\nДата DB-д үлдсэн (note='RMBIMP', name 'ТЕСТ-ХЯТАД%'). Дахин ажиллуулбал автомат цэвэрлэнэ.");
console.log("============================================================");
process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
