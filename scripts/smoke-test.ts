// Синтетик хуулга үүсгэж bank-importer pipeline-ийг шалгах smoke test.
// Бодит банкны файлыг орлохгүй (баганын индекс бодит экспорттой таарч байгааг
// зөвхөн бодит файл батална), гэхдээ parse + ангилал + cutoff логикийг шалгана.
import * as XLSX from "xlsx";
import { normalizeFile } from "../src/lib/bank-importer/index";

function bufFromAoa(aoa: unknown[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

const cutoff = new Date("2026-01-01T00:00:00+08:00");

// ── Golomt формат (date=1, desc=2, ctpy=3, acct=4, income=6, expense=7) ──
const golomtRows: unknown[][] = [];
golomtRows.push(["№", "Огноо", "Утга", "Харилцагч", "Данс", "Валют", "Орлого", "Зарлага"]); // header
golomtRows[5] = [1, "2026-03-01", "Үйлчилгээний орлого", "Зайсан ХХК", "5001", "MNT", 1500000, null];
golomtRows[6] = [2, "2026-03-02", "K2 карго тээвэр", "Тээвэрчин", "5002", "MNT", null, 800000];
golomtRows[7] = [3, "2026-03-05", "3 сарын цалин", "Ажилтан", "5003", "MNT", null, 4200000];
golomtRows[8] = [4, "2025-12-15", "Хуучин гүйлгээ (cutoff-аас өмнө)", "Хэн нэгэн", "5004", "MNT", null, 999]; // cutoff-аар алгасагдана

const gmTxns = normalizeFile(bufFromAoa(golomtRows), "GM", cutoff);

console.log("=== Golomt (GM) ===");
console.log("Мөрийн тоо (cutoff-аас хойш):", gmTxns.length, "(хүлээгдсэн: 3)");
for (const t of gmTxns) {
  console.log(
    `${t.txn_date.toISOString().slice(0, 10)} | ${t.bank} | ${t.company} | "${t.description}" | ` +
      `орлого=${t.income} зарлага=${t.expense} | код=${t.income_code ?? t.expense_code}`,
  );
}

// ── TDB формат (date=0, income=7, expense=11, ctpy=23, desc=28, start=12) ──
function tdbRow(date: Date, income: number | null, expense: number | null, ctpy: string, desc: string): unknown[] {
  const r: unknown[] = new Array(29).fill(null);
  r[0] = date;
  r[7] = income;
  r[11] = expense;
  r[23] = ctpy;
  r[28] = desc;
  return r;
}
const tdbRows: unknown[][] = [];
for (let i = 0; i < 12; i++) tdbRows.push(["толгой"]); // 12 header row
tdbRows.push(tdbRow(new Date(Date.UTC(2026, 1, 10)), 2000000, null, "Харилцагч А", "Тооцооны орлого"));
tdbRows.push(tdbRow(new Date(Date.UTC(2026, 1, 11)), null, 350000, "Банк", "Шимтгэл хураамж"));
tdbRows.push(tdbRow(new Date(Date.UTC(2025, 11, 20)), null, 500, "Хуучин", "cutoff-аас өмнө")); // алгасагдана

const ttTxns = normalizeFile(bufFromAoa(tdbRows), "TT", cutoff);

console.log("\n=== TDB (TT) ===");
console.log("Мөрийн тоо (cutoff-аас хойш):", ttTxns.length, "(хүлээгдсэн: 2)");
for (const t of ttTxns) {
  console.log(
    `${t.txn_date.toISOString().slice(0, 10)} | ${t.bank} | ${t.company} | "${t.description}" | ` +
      `орлого=${t.income} зарлага=${t.expense} | код=${t.income_code ?? t.expense_code}`,
  );
}

console.log("\nOK: pipeline ажиллалаа.");
