// ТДБ компакт форматын интеграцийн тест: detectAccountId + normalizeFile.
import { readFileSync } from "node:fs";
import { detectAccountId, normalizeFile } from "../src/lib/bank-importer/index";

const dir = "C:/Users/natsa/Downloads/";
const files = [
  "ST_411096635_3100.XLS",
  "ST_411099342_9778.XLS",
  "ST_411099343_5543.XLS",
];

for (const f of files) {
  const acct = detectAccountId(f);
  process.stdout.write(`\n### ${f} → account=${acct}\n`);
  if (!acct) {
    console.log("  ❌ данс танигдсангүй");
    continue;
  }
  try {
    const buf = readFileSync(dir + f);
    const txns = normalizeFile(buf, acct, new Date(0));
    const inc = txns.reduce((s, t) => s + (t.income ?? 0), 0);
    const exp = txns.reduce((s, t) => s + (t.expense ?? 0), 0);
    const cur = txns[0]?.currency ?? "—";
    const company = txns[0]?.company ?? "—";
    console.log(
      `  ✅ ${txns.length} гүйлгээ · валют=${cur} · компани=${company}` +
        ` · орлого=${inc.toLocaleString()} · зарлага=${exp.toLocaleString()}`,
    );
    txns.slice(0, 2).forEach((t) =>
      console.log(
        `     ${t.txn_date.toISOString().slice(0, 10)} орл=${t.income ?? 0} зар=${t.expense ?? 0}` +
          ` ханш=${t.exchange_rate} код=${t.income_code ?? t.expense_code ?? "-"} [${t.counterparty.slice(0, 16)}]`,
      ),
    );
  } catch (e) {
    console.log("  ⚠️ алдаа:", e instanceof Error ? e.message : e);
  }
}
