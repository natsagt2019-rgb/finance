// buildInternalCashflow-ийн тооцоог синтетик өгөгдлөөр шалгах.
import { buildInternalCashflow, type CashflowTxn } from "../src/lib/cashflow";

const txns: CashflowTxn[] = [
  { month: 1, income: 1000, expense: null, income_code: "1.1.1", expense_code: null },
  { month: 1, income: null, expense: 300, income_code: null, expense_code: "2.1.1" },
  { month: 2, income: 500, expense: null, income_code: "1.1.2", expense_code: null },
  { month: 2, income: null, expense: 200, income_code: null, expense_code: "3.2.1" },
  { month: 3, income: 2000, expense: null, income_code: "5.1.2", expense_code: null },
  { month: 3, income: null, expense: 400, income_code: null, expense_code: "5.2.3" },
];

const { rows } = buildInternalCashflow(txns, 100);

function show(label: string) {
  const r = rows.find(
    (x) => (x.kind === "total" || x.kind === "balance") && x.label === label,
  );
  if (r && "vals" in r) {
    console.log(label.padEnd(40), r.vals.slice(0, 4).join(", "), "...");
  }
}

show("Нийт мөнгөн орлого");
show("Нийт мөнгөн зарлага");
show("ҮЙЛ АЖИЛЛАГААНЫ ЦЭВЭР УРСГАЛ");
show("ХӨРӨНГӨ ОРУУЛАЛТЫН ЦЭВЭР УРСГАЛ");
show("САНХҮҮЖИЛТИЙН ЦЭВЭР УРСГАЛ");
show("ХОЛБООТОЙ БАЙГУУЛАГЫН ЦЭВЭР УРСГАЛ");
show("ТУХАЙН ҮЕИЙН ЦЭВЭР МӨНГӨН ГҮЙЛГЭЭ");
show("Эхний үлдэгдэл");
show("Эцсийн үлдэгдэл");

console.log("\nХүлээгдсэн: цэвэр гүйлгээ [700,300,1600], эцсийн үлдэгдэл [800,1100,2700]");
