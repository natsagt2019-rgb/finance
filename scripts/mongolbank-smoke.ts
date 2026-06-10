import { fetchMongolbankRates } from "../src/lib/mongolbank";

(async () => {
  // Ажлын бус өдөр (Ням гараг) сонгож, өмнөх ажлын өдрийн ханш буцаах эсэхийг шалгана.
  const r = await fetchMongolbankRates("2026-06-10");
  if (!r) { console.error("✗ null result"); process.exit(1); }
  const { rateDate, rates } = r;
  console.log("rateDate:", rateDate);
  console.log("USD:", rates.USD, "EUR:", rates.EUR, "CNY:", rates.CNY, "JPY:", rates.JPY);
  const ok = rates.USD > 1000 && rates.USD < 100000 && rates.CNY > 0 && Number.isFinite(rates.USD);
  console.log(ok ? "✓ rates parsed numerically" : "✗ bad rates");
  process.exit(ok ? 0 : 1);
})();
