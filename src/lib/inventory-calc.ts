// ============================================================
// Бараа материалын тооцооллын цөм — FIFO үлдэгдэл, өртөг.
// ============================================================
// Цэвэр функцууд: page (preview) болон action (хадгалах) хоёул дуудна —
// тооцооллын нэг эх сурвалж байх зорилготой.
// Эх дүрэм: Бараа_Материалын_Журам.docx §6.3 (ДФХН/FIFO).
// ============================================================

// ── Ангиллын лавлах (дүрмийн ДӨРӨВ-р бүлэг) ──────────────────────────────────
export type Category = { code: string; label: string };

export const CATEGORIES: Category[] = [
  { code: "120201", label: "Шатахуун, тосолгоо" },
  { code: "120202", label: "Сэлбэг эд анги" },
  { code: "120203", label: "Засварын материал" },
  { code: "120204", label: "Оффисын хэрэглэл" },
  { code: "120205", label: "Аюулгүй ажиллагааны" },
  { code: "120299", label: "Бусад материал" },
];

export function categoryLabel(code: string): string {
  return CATEGORIES.find((c) => c.code === code)?.label ?? code;
}

// ── Тоо форматлах (модулийн конвенц) ─────────────────────────────────────────
export function fmt(n: number): string {
  return Math.round(Number(n) || 0).toLocaleString("en-US");
}

// Тоо хэмжээ (бутархайтай) форматлах.
export function fmtQty(n: number): string {
  const v = Number(n) || 0;
  return v.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

// ── FIFO ─────────────────────────────────────────────────────────────────────
// Хөдөлгөөний нэг мөрийн хялбаршуулсан хэлбэр (нэг барааных).
export type MoveLite = {
  id: number;
  date: string; // YYYY-MM-DD
  type: "receipt" | "issue" | "return_supplier" | "return_in" | "disposal" | "count_adj";
  qty: number;
  unit_cost: number;
};

// Орлогын үлдэж буй давхарга (FIFO дараалал).
export type Layer = { unit_cost: number; qty: number };

// Орлого эсэх (нөөц нэмэгдэх чиглэл).
export function isInbound(type: MoveLite["type"]): boolean {
  return type === "receipt" || type === "return_in";
}

// Огноо, дараа нь id-аар эрэмбэлэх (тогтвортой дараалал).
function chrono(a: MoveLite, b: MoveLite): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.id - b.id;
}

// Нэг барааны бүх хөдөлгөөнөөс FIFO-оор гаргалт хасч, үлдэх давхарга/үлдэгдэл буцаана.
// count_adj: эерэг qty (illüü) → орлогын давхарга (unit_cost-оор), сөрөг → гаргалт.
//   (Манай тохиолдолд count_adj үргэлж дутагдал тул out гэж үзнэ — qty эерэг.)
export function computeFifo(moves: MoveLite[]): {
  qtyRemaining: number;
  valueRemaining: number;
  layers: Layer[];
} {
  const sorted = [...moves].sort(chrono);
  const layers: Layer[] = [];

  for (const m of sorted) {
    const qty = Number(m.qty) || 0;
    if (qty <= 0) continue;

    if (isInbound(m.type)) {
      layers.push({ unit_cost: Number(m.unit_cost) || 0, qty });
    } else {
      // Гаргалт — давхаргуудаас FIFO-оор хасна.
      let remaining = qty;
      while (remaining > 1e-9 && layers.length > 0) {
        const layer = layers[0];
        if (layer.qty <= remaining + 1e-9) {
          remaining -= layer.qty;
          layers.shift();
        } else {
          layer.qty -= remaining;
          remaining = 0;
        }
      }
      // Давхарга хүрэлцэхгүй бол (сөрөг үлдэгдэл) үлдсэнийг үл тоомсорлоно.
    }
  }

  const qtyRemaining = layers.reduce((s, l) => s + l.qty, 0);
  const valueRemaining = layers.reduce((s, l) => s + l.qty * l.unit_cost, 0);
  return { qtyRemaining, valueRemaining, layers };
}

// Өгөгдсөн давхаргаас qty гаргахад FIFO нийт өртөг + үлдэх давхаргуудыг буцаана.
// Зарлага/устгал хадгалахад server дуудаж unit_cost/total_cost тогтооно.
export function fifoIssueCost(
  layers: Layer[],
  qty: number,
): { totalCost: number; unitCost: number; layersAfter: Layer[]; shortage: number } {
  const work = layers.map((l) => ({ ...l }));
  let remaining = Number(qty) || 0;
  let totalCost = 0;

  while (remaining > 1e-9 && work.length > 0) {
    const layer = work[0];
    if (layer.qty <= remaining + 1e-9) {
      totalCost += layer.qty * layer.unit_cost;
      remaining -= layer.qty;
      work.shift();
    } else {
      totalCost += remaining * layer.unit_cost;
      layer.qty -= remaining;
      remaining = 0;
    }
  }

  const issued = (Number(qty) || 0) - remaining;
  const unitCost = issued > 0 ? totalCost / issued : 0;
  return { totalCost, unitCost, layersAfter: work, shortage: remaining };
}

// ── Дундаж өртгийн арга (moving weighted average) ─────────────────────────────
// Орлого болгонд дундаж шинэчлэгдэнэ; гаргалт тухайн үеийн дундаж өртгөөр.
// Бүх хөдөлгөөнийг дарааллаар боловсруулж эцсийн үлдэгдэл/дунджийг буцаана.
export function computeAverage(moves: MoveLite[]): {
  qtyRemaining: number;
  valueRemaining: number;
  unitCost: number; // одоогийн дундаж нэгж өртөг
} {
  const sorted = [...moves].sort(chrono);
  let qty = 0;
  let value = 0;
  for (const m of sorted) {
    const mq = Number(m.qty) || 0;
    if (mq <= 0) continue;
    if (isInbound(m.type)) {
      qty += mq;
      value += mq * (Number(m.unit_cost) || 0);
    } else {
      const avg = qty > 0 ? value / qty : 0;
      const take = Math.min(mq, qty);
      value -= take * avg;
      qty -= take;
    }
  }
  const unitCost = qty > 0 ? value / qty : 0;
  return { qtyRemaining: qty, valueRemaining: value, unitCost };
}

// Дундаж өртгөөр qty гаргахад нийт өртөг + дундаж нэгж өртөг + дутагдал.
export function averageIssueCost(
  moves: MoveLite[],
  qty: number,
): { totalCost: number; unitCost: number; shortage: number } {
  const { qtyRemaining, unitCost } = computeAverage(moves);
  const want = Number(qty) || 0;
  const shortage = Math.max(0, want - qtyRemaining);
  const issued = want - shortage;
  return { totalCost: issued * unitCost, unitCost, shortage };
}
