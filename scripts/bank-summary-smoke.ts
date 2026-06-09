import { buildBankSummary, type BankSummaryTxn } from "../src/lib/bank-summary";

const txns: BankSummaryTxn[] = [
  { account_id: "GM", month: 1, income: 200, expense: null },
  { account_id: "GM", month: 1, income: null, expense: 50 },
  { account_id: "TT", month: 1, income: null, expense: 300 },
  { account_id: "TT", month: 2, income: 1000, expense: null },
];
const { banks, total } = buildBankSummary(
  txns,
  { GM: 1000, TT: 5000 },
  ["GM", "TT"],
  { GM: "Голомт", TT: "ХХБ/ТДБ" },
);

for (const b of [...banks, total]) {
  console.log(
    `${b.accountId.padEnd(4)} эхэн=${b.yearOpening} эцэс=${b.yearClosing} ` +
      `net[0..1]=${b.net.slice(0, 2)} closing[0..1]=${b.closing.slice(0, 2)}`,
  );
}
console.log("\nХүлээгдсэн: GM эцэс=1150, TT эцэс=5700, ALL эцэс=6850");
