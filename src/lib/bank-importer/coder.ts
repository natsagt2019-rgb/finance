// coder.ts — Гүйлгээний авто ангилалын дүрмүүд.
// Эх сурвалж: bank_importer/coder.py-г үнэн зөв хөрвүүлсэн.
//
// direction: 'M' = орлого ангилал, 'N' = зарлага ангилал, '' = тодорхойгүй
// code:      '1.1.1', '1.2.1' гэх мэт (config.ts-д тайлбар)
//
// Дүрмийн эрэмбэ (дээрээс доош, эхний таарсан дүрэм хэрэглэгдэнэ).
import type { Direction, NormalizedTxn } from "./types";

// desc дотор "N/M" хэлбэрийн сарын тоонуудыг олж, бүгд нь month-аас бага эсэхийг шалгана.
function allMonthsBefore(d: string, month: number): boolean {
  const monthsInDesc: number[] = [];
  const re = /\b(\d{1,2})\/\d{1,2}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    const mm = parseInt(m[1], 10);
    if (mm >= 1 && mm <= 12) monthsInDesc.push(mm);
  }
  return monthsInDesc.length > 0 && monthsInDesc.every((mm) => mm < month);
}

// ── TT компанийн ангилалын дүрэм (TT + Golomt + MBank) ────────────────────
export function codeTt(
  desc: string,
  income: number,
  expense: number,
  month: number | null = null,
  counterparty = "",
): [Direction, string] {
  const d = String(desc).toLowerCase();
  const ctp = String(counterparty).toLowerCase();

  // Охин компани болон холбоотой харилцагчид
  const related = ["түмэн ресурс", "түмэн тээх сити"];

  if (income > 0) {
    // Тусгай харилцагчид
    if (
      [
        "мастер фүүдс", "премиум бьюлдинг", "премиум иннова",
        "премиум конкрит", "тера-экспресс", "тера экспресс",
      ].some((x) => ctp.includes(x))
    ) {
      return ["M", "1.1.2"];
    }
    if (ctp.includes("өнөрсайхан")) return ["M", "5.1.3"];
    if (related.some((x) => ctp.includes(x))) {
      return d.includes("тооцоо") ? ["M", "5.1.1"] : ["M", "5.1.2"];
    }

    // Тайлбарын түлхүүр үгс
    if (["тооцоо", "авлага"].some((x) => d.includes(x))) return ["M", "1.1.2"];
    if (["хүүгийн орлого", "хүү", "interest"].some((x) => d.includes(x))) return ["M", "1.1.3"];
    if (["буцаалт", "буцаан"].some((x) => d.includes(x))) return ["M", "1.1.4"];
    if (d.includes("зээл")) {
      return ["ажилтан", "ажилч"].some((x) => (d + ctp).includes(x)) ? ["M", "5.1.3"] : ["M", "5.1.2"];
    }

    // Default орлого
    return ["M", "1.1.1"];
  }

  if (expense > 0) {
    // Тусгай харилцагчид
    if (ctp.includes("өнөрсайхан")) return ["N", "5.2.3"];
    if (related.some((x) => ctp.includes(x))) {
      return d.includes("тооцоо") ? ["N", "5.2.1"] : ["N", "5.2.2"];
    }

    // Банкны шимтгэл
    if (["шимтгэл", "charge", "хөтөлсний"].some((x) => (d + ctp).includes(x))) return ["N", "2.1.14"];

    // Мост Мони (цалин шилжүүлгийн систем)
    if (ctp.includes("мост мони") || d.includes("мост мони")) return ["N", "2.2.2"];

    // МТА татварын шилжүүлэг
    if (ctp.includes("мта") && ctp.includes("татвар")) {
      if (d.startsWith("1251") || d.includes(";1251")) return ["N", "2.2.3"]; // НӨАТ
      if (d.startsWith("126") || d.includes(";126")) return ["N", "2.2.1"]; // ХХОАТ
      return ["N", "2.2.3"];
    }

    // Цалин / НДШ / татвар
    if (d.includes("цалин")) return ["N", "2.1.1"];
    if (d.includes("нөат")) return ["N", "2.2.3"];
    if (["эмндш", "ндш"].some((x) => d.includes(x))) return ["N", "2.2.4"];
    if (d.includes("томилолт")) return ["N", "2.1.3"];
    if (d.includes("сургалт")) return ["N", "2.1.5"];

    // Түрээс — ЗӨВХӨН Гацуурт ХХК-д төлсөн түрээс л энд орно. Бусад "түрээс"
    // (машин/кран түрээс гэх мэт) нь тээврийн төлбөр тул доорх тээврийн дүрэмд
    // унаж 1.2.1/1.2.2 болно.
    if (ctp.includes("гацуурт") || d.includes("гацуурт")) return ["N", "2.1.10"];

    // Техник хэрэгсэл / тавилга
    if (
      ["dell", "notebook", "laptop", "ноутбук", "компьютер", "16gb", "512 gb", "ssd"].some((x) =>
        d.includes(x),
      )
    ) {
      return ["N", "3.2.1"];
    }
    if (["сандал", "шкаф", "шүүгээ", "тавилга", "эд хогшил"].some((x) => d.includes(x))) {
      return ["N", "3.2.2"];
    }

    // Тээврийн зардал (K2/K3/K7/K9 карго, УБ-ДА чиглэл)
    const isTransport =
      (d.includes("кран") && !ctp.includes("гацуурт")) ||
      ["k2", "k3", "k7", "k9", "уб-", "ub-", "машин"].some((x) => d.includes(x));
    if (isTransport || d.includes("өмнөх сар")) {
      if (d.includes("өмнөх сар")) return ["N", "1.2.2"];
      if (month && allMonthsBefore(d, month)) return ["N", "1.2.2"];
      return ["N", "1.2.1"];
    }

    // Зээл
    if (d.includes("зээл")) {
      return ["ажилтан", "ажилч"].some((x) => (d + ctp).includes(x)) ? ["N", "5.2.3"] : ["N", "5.2.2"];
    }

    // Default зарлага → тээвэр
    return ["N", "1.2.1"];
  }

  return ["", ""];
}

// ── TR компанийн ангилалын дүрэм ─────────────────────────────────────────
export function codeTr(
  desc: string,
  income: number,
  expense: number,
  month: number | null = null,
  counterparty = "",
): [Direction, string] {
  const d = String(desc).toLowerCase();
  const ctp = String(counterparty).toLowerCase();

  if (income > 0) {
    if (ctp.includes("өнөрсайхан")) return ["M", "5.1.3"];
    if (ctp.includes("түмэн тээх")) {
      return d.includes("тооцоо") ? ["M", "5.1.1"] : ["M", "5.1.2"];
    }

    if (["тооцоо", "авлага"].some((x) => d.includes(x))) return ["M", "1.1.2"];
    if (["хүүгийн орлого", "хүү", "interest"].some((x) => d.includes(x))) return ["M", "1.1.3"];
    if (["буцаалт", "буцаан"].some((x) => d.includes(x))) return ["M", "1.1.4"];
    if (d.includes("зээл")) {
      return ["ажилтан", "ажилч"].some((x) => (d + ctp).includes(x)) ? ["M", "5.1.3"] : ["M", "5.1.2"];
    }

    return ["M", "1.1.1"];
  }

  if (expense > 0) {
    if (ctp.includes("өнөрсайхан")) return ["N", "5.2.3"];
    if (ctp.includes("түмэн тээх")) {
      return d.includes("тооцоо") ? ["N", "5.2.1"] : ["N", "5.2.2"];
    }

    if (["шимтгэл", "charge"].some((x) => (d + ctp).includes(x))) return ["N", "2.1.14"];
    if (ctp.includes("мост мони") || d.includes("мост мони")) return ["N", "2.2.2"];

    if (d.includes("цалин")) return ["N", "2.1.1"];
    if (d.includes("нөат")) return ["N", "2.2.3"];
    if (["эмндш", "ндш"].some((x) => d.includes(x))) return ["N", "2.2.4"];
    if (d.includes("томилолт")) return ["N", "2.1.3"];
    if (d.includes("сургалт")) return ["N", "2.1.5"];
    // Түрээс — ЗӨВХӨН Гацуурт ХХК-д төлсөн (бусад түрээс → тээвэр).
    if (ctp.includes("гацуурт") || d.includes("гацуурт")) return ["N", "2.1.10"];

    if (["dell", "notebook", "laptop", "ноутбук", "компьютер"].some((x) => d.includes(x))) {
      return ["N", "3.2.1"];
    }

    const isTransport =
      (d.includes("кран") && !ctp.includes("гацуурт")) ||
      ["k2", "k3", "k7", "k9", "уб-", "ub-", "машин"].some((x) => d.includes(x));
    if (isTransport || d.includes("өмнөх сар")) {
      if (d.includes("өмнөх сар")) return ["N", "1.2.2"];
      if (month && allMonthsBefore(d, month)) return ["N", "1.2.2"];
      return ["N", "1.2.1"];
    }

    if (d.includes("зээл")) {
      return ["ажилтан", "ажилч"].some((x) => (d + ctp).includes(x)) ? ["N", "5.2.3"] : ["N", "5.2.2"];
    }

    return ["N", "1.2.1"];
  }

  return ["", ""];
}

// Гүйлгээний dict-д ангиллын кодыг нэмж буцаана.
// company: 'TT' | 'GM' | 'MB' → code_tt, бусад (TR) → code_tr
export function applyCodes(txn: NormalizedTxn, company: string): NormalizedTxn {
  const desc = txn.description ?? "";
  const inc = txn.income ?? 0;
  const exp = txn.expense ?? 0;
  const month = txn.txn_date ? txn.txn_date.getMonth() + 1 : null;
  const ctpy = txn.counterparty ?? "";

  const [direction, code] =
    company === "TT" || company === "GM" || company === "MB"
      ? codeTt(desc, inc, exp, month, ctpy)
      : codeTr(desc, inc, exp, month, ctpy);

  return {
    ...txn,
    income_code: direction === "M" ? code : null,
    expense_code: direction === "N" ? code : null,
  };
}
