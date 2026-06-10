import { computeFxLine, buildFxJournalLines } from "../src/lib/fx-calc";

let pass = 0, fail = 0;
function eq(name: string, got: number, want: number) {
  const ok = Math.abs(got - want) < 0.005;
  console.log(`${ok ? "✓" : "✗"} ${name}: got ${got}, want ${want}`);
  ok ? pass++ : fail++;
}

// Актив (валютын харилцах): $1000 @ дэвтэр 3,400,000; ханш өсөв 3,450 → +50,000 ОЛЗ
let a = computeFxLine({ bookBalance: 3_400_000, fxBalance: 1000, rate: 3450, nature: "Актив" });
eq("asset gain diff", a.diff, 50000);
eq("asset gain.gain", a.gain, 50000);
eq("asset gain.loss", a.loss, 0);

// Актив: ханш буурав 3,300 → -100,000 ГАРЗ
let b = computeFxLine({ bookBalance: 3_400_000, fxBalance: 1000, rate: 3300, nature: "Актив" });
eq("asset loss diff", b.diff, -100000);
eq("asset loss.loss", b.loss, 100000);

// Пассив (валютын өглөг): өр $1000, дэвтэр -3,400,000 (кредит); ханш өсөв 3,450 → ГАРЗ
let c = computeFxLine({ bookBalance: -3_400_000, fxBalance: 1000, rate: 3450, nature: "Пассив" });
eq("liab loss diff", c.diff, -50000);
eq("liab loss.loss", c.loss, 50000);

// Пассив: ханш буурав 3,300 → ОЛЗ (өр багасав)
let d = computeFxLine({ bookBalance: -3_400_000, fxBalance: 1000, rate: 3300, nature: "Пассив" });
eq("liab gain diff", d.diff, 100000);
eq("liab gain.gain", d.gain, 100000);

// Журнал баланс: актив олз(+50k) + пассив гарз(-50k), gain=620, loss=810
const lines = buildFxJournalLines(
  [ { account_id: 6, account_code: "110500", diff: 50000 },
    { account_id: 50, account_code: "310100", diff: -50000 } ],
  620, 810,
);
const dr = lines.reduce((s,l)=>s+l.debit,0);
const kt = lines.reduce((s,l)=>s+l.credit,0);
eq("journal Dr", dr, 100000);
eq("journal Kt", kt, 100000);
console.log(JSON.stringify(lines, null, 0));
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
