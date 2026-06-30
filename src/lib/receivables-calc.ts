// ── Авлагын насжилт (Receivables aging) — цэвэр тооцооллын логик ──────────────
// Авлагыг хоёр эх сурвалжаас нэгтгэнэ:
//   • Журнал (journal_entries) — авлагын дансны Дт−Кт цэвэр үлдэгдэл, харилцагчийн
//     нэрээр бүлэглэж, гүйлгээний огноогоор FIFO-гоор хааж насжуулна.
//   • Нэхэмжлэх — бүрэн төлөгдөөгүй (open/partial) нэхэмжлэлийн үлдэгдэл.
// Хоёр эх сурвалжийг харилцагчийн нэрийг нормчлон (том үсэг, зай цэгцлэх) нэг
// мөрөнд нэгтгэнэ. Нэг авлагыг хоёр газар бүртгэвэл давхар тоологдож болзошгүй.

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

// Данс "авлага" мөн эсэх: актив + нэр эсвэл fs_line-д "авлага" + хасагдуулга
// (эргэлзээтэй авлагын контр-актив) биш.
export function isReceivableAccount(
  name: string | null | undefined,
  type: string | null | undefined,
  fsLine?: string | null | undefined,
): boolean {
  if (type !== "asset") return false;
  const hay = `${name ?? ""} ${fsLine ?? ""}`.toLowerCase();
  if (!hay.includes("авлага")) return false;
  if (hay.includes("хасагдуулга")) return false;
  return true;
}

// Өглөгийн данс мөн эсэх (өр төлбөр + нэр/fs_line-д "өглөг").
export function isPayableAccount(
  name: string | null | undefined,
  type: string | null | undefined,
  fsLine?: string | null | undefined,
): boolean {
  if (type !== "liability") return false;
  const hay = `${name ?? ""} ${fsLine ?? ""}`.toLowerCase();
  return hay.includes("өглөг");
}

// Харилцагчийн нэрийг нэгтгэх түлхүүр (том үсэг, илүү зай арилгах).
export function normalizePartner(name: string | null | undefined): string {
  return (name ?? "").trim().replace(/\s+/g, " ").toUpperCase();
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
  partnerKey: string; // нэгтгэх түлхүүр (нормчилсон нэр); "" бол партнергүй
  partnerName: string; // дэлгэцэнд харуулах нэр
  amount: number; // авлагын үлдэгдэл (эерэг)
  date: string; // насжилтыг тооцох огноо (YYYY-MM-DD)
  source: ReceivableSource;
};

export type PartnerReceivable = {
  partnerKey: string;
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

// ── Насжилтын дэлгэрэнгүй (нээлттэй зүйл бүрийг тус тусад нь) ─────────────────
// Нэгтгэлийн оронд нээлттэй зүйл (нэхэмжлэх/FIFO хэсэг) бүрийг хоног, бүлэгтэй нь
// харуулна — өр төлбөр цуглуулах/тулгах ажлын жагсаалт.
export type AgingDetailItem = ReceivableItem & { days: number; bucket: AgingBucket };

export type PartnerAgingDetail = {
  partnerKey: string;
  partnerName: string;
  items: AgingDetailItem[]; // огноогоор хуучнаас шинэ рүү
  total: number;
  buckets: Record<AgingBucket, number>;
};

export type AgingDetailSummary = {
  partners: PartnerAgingDetail[]; // дүнгээр буурахаар
  total: number;
  buckets: Record<AgingBucket, number>;
  partnerCount: number;
  itemCount: number;
};

// Нээлттэй зүйлсийг харилцагчаар бүлэглэж, зүйл тус бүрд хоног+бүлэг онооно.
// minDays-аас бага настай зүйлсийг алгасаж болно (анхдагч 0 — бүгд).
export function buildAgingDetail(
  items: ReceivableItem[],
  today: string,
  minDays = 0,
): AgingDetailSummary {
  const byPartner = new Map<string, PartnerAgingDetail>();

  for (const it of items) {
    const amount = Number(it.amount) || 0;
    if (amount <= 0.005) continue;
    const days = daysBetween(it.date, today);
    if (days < minDays) continue;
    const bucket = bucketOf(it.date, today);

    let p = byPartner.get(it.partnerKey);
    if (!p) {
      p = {
        partnerKey: it.partnerKey,
        partnerName: it.partnerName,
        items: [],
        total: 0,
        buckets: emptyBuckets(),
      };
      byPartner.set(it.partnerKey, p);
    }
    p.items.push({ ...it, amount, days, bucket });
    p.total += amount;
    p.buckets[bucket] += amount;
  }

  const partners = [...byPartner.values()].sort((a, b) => b.total - a.total);
  let itemCount = 0;
  const summary: AgingDetailSummary = {
    partners,
    total: 0,
    buckets: emptyBuckets(),
    partnerCount: partners.length,
    itemCount: 0,
  };
  for (const p of partners) {
    // Хуучин зүйл эхэнд (хамгийн их хэтэрсэн нь дээр).
    p.items.sort((a, b) => b.days - a.days);
    summary.total += p.total;
    for (const b of AGING_BUCKETS) summary.buckets[b] += p.buckets[b];
    itemCount += p.items.length;
  }
  summary.itemCount = itemCount;
  return summary;
}

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

    const key = it.partnerKey;
    let p = byPartner.get(key);
    if (!p) {
      p = {
        partnerKey: key,
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
