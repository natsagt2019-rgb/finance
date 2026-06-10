// ── Авлагын насжилт (Receivables aging) — цэвэр тооцооллын логик ──────────────
// Авлагыг хоёр эх сурвалжаас нэгтгэнэ:
//   • Журнал  — батлагдсан journal_lines-ийн авлагын данс дээрх Дт−Кт цэвэр
//               үлдэгдэл, журналын partner_id-аар бүлэглэнэ.
//   • Нэхэмжлэх — бүрэн төлөгдөөгүй (open/partial) нэхэмжлэлийн үлдэгдэл.
// Нэхэмжлэх нь журнал автоматаар үүсгэдэггүй тул хоёр эх сурвалж давхцахгүй —
// нийлбэр нь зөв (хэрэв гараар журнал бичсэн бол давхар тооцогдож болзошгүй).

export type AgingBucket = "0-30" | "31-60" | "61-90" | "90+";

export const AGING_BUCKETS: AgingBucket[] = ["0-30", "31-60", "61-90", "90+"];

export const AGING_LABEL: Record<AgingBucket, string> = {
  "0-30": "0–30 хоног",
  "31-60": "31–60 хоног",
  "61-90": "61–90 хоног",
  "90+": "90+ хоног",
};

export type ReceivableSource = "journal" | "invoice";

export type DatedAmount = { date: string; amount: number };

// FIFO хаалт: авлага үүсгэсэн (дебет) мөрүүдийг хүлээн авсан төлбөрөөр
// (нийт кредит) хуучноос нь эхлэн хаана. Үлдсэн нээлттэй хэсгүүдийг буцаана.
// Илүү төлбөр (кредит > дебет) бол үлдэгдэл 0 — авлагын тайланд харагдахгүй.
export function settleFifo(
  debits: DatedAmount[],
  totalCredit: number,
): DatedAmount[] {
  const sorted = debits
    .filter((d) => d.amount > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let remaining = Number(totalCredit) || 0;
  const out: DatedAmount[] = [];
  for (const d of sorted) {
    if (remaining <= 0) {
      out.push(d);
    } else if (remaining >= d.amount) {
      remaining -= d.amount;
    } else {
      out.push({ date: d.date, amount: d.amount - remaining });
      remaining = 0;
    }
  }
  return out;
}

// Дансны төлөвлөгөөн дэх "авлага" мөн эсэх:
// актив данс + нэрэндээ "авлага" + эргэлзээтэй авлагын хасагдуулга (контр) биш.
export function isReceivableAccount(
  name: string | null | undefined,
  type: string | null | undefined,
): boolean {
  const n = (name ?? "").toLowerCase();
  if (type !== "asset") return false;
  if (!n.includes("авлага")) return false;
  if (n.includes("хасагдуулга")) return false; // эргэлзээтэй авлагын хасагдуулга (контр-актив)
  return true;
}

// Хоёр огнооны хоорондын хоногийн зөрүү (toDate − fromDate). Сөрөг бол 0.
export function daysBetween(fromDate: string, toDate: string): number {
  const a = Date.parse(`${fromDate}T00:00:00Z`);
  const b = Date.parse(`${toDate}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  const d = Math.floor((b - a) / 86_400_000);
  return d > 0 ? d : 0;
}

// Огнооноос өнөөдрийг хүртэлх настай насжилтын бүлэг.
export function bucketOf(date: string, today: string): AgingBucket {
  const days = daysBetween(date, today);
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

// Нэг авлагын мөр (эх сурвалжаас үл хамаарсан нэгдсэн дүрс).
export type ReceivableItem = {
  partnerId: number | null;
  partnerName: string; // партнергүй бол тогтсон шошго
  amount: number; // авлагын үлдэгдэл (эерэг)
  date: string; // насжилтыг тооцох огноо (YYYY-MM-DD)
  source: ReceivableSource;
};

export type PartnerReceivable = {
  partnerId: number | null;
  partnerName: string;
  total: number;
  fromJournal: number;
  fromInvoice: number;
  buckets: Record<AgingBucket, number>;
};

function emptyBuckets(): Record<AgingBucket, number> {
  return { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
}

export type ReceivablesSummary = {
  partners: PartnerReceivable[]; // дүнгээр буурахаар эрэмбэлэгдсэн
  total: number;
  fromJournal: number;
  fromInvoice: number;
  buckets: Record<AgingBucket, number>;
  partnerCount: number;
};

const NO_PARTNER_KEY = "__none__";

// Авлагын мөрүүдийг харилцагчаар бүлэглэж, насжилтаар задлан нэгтгэнэ.
// 0.005-аас бага (бараг тэг) болон сөрөг үлдэгдлийг алгасна.
export function summarizeReceivables(
  items: ReceivableItem[],
  today: string,
): ReceivablesSummary {
  const byPartner = new Map<string, PartnerReceivable>();

  for (const it of items) {
    const amount = Number(it.amount) || 0;
    if (amount <= 0.005) continue; // тэг буюу сөрөг (кредит) үлдэгдлийг тооцохгүй

    const key = it.partnerId == null ? NO_PARTNER_KEY : String(it.partnerId);
    let p = byPartner.get(key);
    if (!p) {
      p = {
        partnerId: it.partnerId,
        partnerName: it.partnerName,
        total: 0,
        fromJournal: 0,
        fromInvoice: 0,
        buckets: emptyBuckets(),
      };
      byPartner.set(key, p);
    }
    p.total += amount;
    if (it.source === "journal") p.fromJournal += amount;
    else p.fromInvoice += amount;
    p.buckets[bucketOf(it.date, today)] += amount;
  }

  const partners = [...byPartner.values()].sort((a, b) => b.total - a.total);

  const summary: ReceivablesSummary = {
    partners,
    total: 0,
    fromJournal: 0,
    fromInvoice: 0,
    buckets: emptyBuckets(),
    partnerCount: partners.length,
  };
  for (const p of partners) {
    summary.total += p.total;
    summary.fromJournal += p.fromJournal;
    summary.fromInvoice += p.fromInvoice;
    for (const b of AGING_BUCKETS) summary.buckets[b] += p.buckets[b];
  }
  return summary;
}
