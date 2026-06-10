// ── Монголбанкны албан ёсны валютын ханш татах ───────────────────────────────
// Эх сурвалж: https://www.mongolbank.mn/mn/currency-rates (Vue SPA-н дотоод API).
//   POST /mn/currency-rates/data  body: { startDate, endDate }
//   → { success: true, data: [{ RATE_DATE: "YYYY-MM-DD", USD: "3,576.11", ... }] }
// Ханш нь 1 нэгж валют → MNT (мянгатын таслалтай тэмдэгт мөр).

const ENDPOINT = "https://www.mongolbank.mn/mn/currency-rates/data";

export type MongolbankRates = {
  rateDate: string; // бодитоор хэрэглэсэн ханшийн огноо (YYYY-MM-DD)
  rates: Record<string, number>; // валютын код → MNT/нэгж (жишээ: USD → 3576.11)
};

// "3,576.11" → 3576.11
function parseNum(s: unknown): number {
  if (typeof s === "number") return s;
  return Number(String(s ?? "").replace(/,/g, "")) || 0;
}

// ISO огноог хоногоор шилжүүлэх (ажлын бус өдөр бол өмнөх ажлын өдрийг олох).
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function fetchMongolbankRates(
  date: string,
): Promise<MongolbankRates | null> {
  // Амралтын өдөр/баяр бол ханш зарлагдаагүй байж болзошгүй тул 10 хоног ухрааж,
  // огнооноос өмнөх хамгийн сүүлийн зарласан ханшийг авна.
  const start = addDays(date, -10);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0",
    },
    body: JSON.stringify({ startDate: start, endDate: date }),
    cache: "no-store",
  });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    success?: boolean;
    data?: Record<string, unknown>[];
  };
  const rows = json?.data ?? [];
  if (rows.length === 0) return null;

  // RATE_DATE ≤ date дотроос хамгийн сүүлийнхийг сонгоно.
  const valid = rows
    .filter((r) => typeof r.RATE_DATE === "string" && r.RATE_DATE <= date)
    .sort((a, b) =>
      (a.RATE_DATE as string) < (b.RATE_DATE as string) ? 1 : -1,
    );
  const row = valid[0] ?? rows[0];

  const rates: Record<string, number> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "RATE_DATE") continue;
    const n = parseNum(v);
    if (n > 0) rates[k.toUpperCase()] = n;
  }

  return { rateDate: String(row.RATE_DATE ?? date), rates };
}
