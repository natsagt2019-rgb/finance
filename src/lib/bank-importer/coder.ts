// coder.ts — Гүйлгээний авто ангилалын дүрмүүд.
// Эх сурвалж: bank_importer/coder.py-г үнэн зөв хөрвүүлсэн.
//
// direction: 'M' = орлого ангилал, 'N' = зарлага ангилал, '' = тодорхойгүй
// code:      '1.1.1', '1.2.1' гэх мэт (config.ts-д тайлбар)
//
// Дүрмийн эрэмбэ (дээрээс доош, эхний таарсан дүрэм хэрэглэгдэнэ).
//
// ⚠️ Зарим банкны хуулга (жишээ нь Хаан банк) тайлбарыг ЛАТИНААР (romanized)
// илгээдэг тул түлхүүр үг бүрд кирилл + латин хувилбарыг хосоор нь өгнө.
// Ингэснээр "tsalin" (цалин), "tomilolt" (томилолт) гэх мэт латин бичвэр ч
// зөв ангилагдана — өмнө нь бүгд default 1.2.1 (тээвэр) руу унаж байсан.
import type { Direction, NormalizedTxn } from "./types";

// ── Түлхүүр үгс: кирилл + латин (romanized) хувилбарууд ───────────────────
const KW = {
  tootsoo: ["тооцоо", "tootsoo", "tootsoo"],
  avlaga: ["авлага", "avlaga"],
  huu: ["хүүгийн орлого", "хүү", "interest", "huugiin", "huu "],
  butsaalt: ["буцаалт", "буцаан", "butsaalt", "butsaan", "butsaah"],
  zeel: ["зээл", "zeel"],
  ajiltan: ["ажилтан", "ажилч", "ajiltan", "ajilch", "ajiltn"],
  shimtgel: ["шимтгэл", "charge", "хөтөлсний", "shimtgel", "hutulsnii"],
  mostMoni: ["мост мони", "most moni", "mostmoni"],
  tsalin: ["цалин", "tsalin", "calin", "tsaling"],
  noat: ["нөат", "noat", "noat "],
  ndsh: ["эмндш", "ндш", "emndsh", "ndsh"],
  tomilolt: ["томилолт", "tomilolt", "tomiolt"],
  surgalt: ["сургалт", "surgalt"],
  gatsuurt: ["гацуурт", "gatsuurt", "gatuurt"],
  kran: ["кран", "kran"],
  mashin: ["машин", "mashin"],
  // Холбоо, интернэт (утас, дата, интернэт үйлчилгээ)
  holboo: ["холбоо", "интернэт", "интернет", "mobikom", "mobicom", "unitel", "skytel", "gmobile", "g-mobile", "internet", " data ", "data ", "дата", "starlink", "старлинк", "утас"],
  // Бичиг хэрэг, оффис
  bichig: ["бичиг хэрэг", "бичиг", "bichig", "принтер", "printer", "toner", "тонер", "канц", "kants", "цаас", "tsaas", "хэвлэл", "hevlel"],
  // Орчуулга / бусад үйлчилгээ
  orchuulga: ["орчуулга", "orchuulga", "notariat", "нотариат"],
  // Барьцаа, дэнчин
  baritsaa: ["барьцаа", "baritsaa", "дэнчин", "denchin", "batlan"],
} as const;

const has = (d: string, keys: readonly string[]) => keys.some((k) => d.includes(k));

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
    if (ctp.includes("өнөрсайхан") || ctp.includes("onorsaihan")) return ["M", "5.1.3"];
    if (related.some((x) => ctp.includes(x))) {
      return has(d, KW.tootsoo) ? ["M", "5.1.1"] : ["M", "5.1.2"];
    }

    // Тайлбарын түлхүүр үгс
    if (has(d, KW.tootsoo) || has(d, KW.avlaga)) return ["M", "1.1.2"];
    if (has(d, KW.huu)) return ["M", "1.1.3"];
    if (has(d, KW.butsaalt)) return ["M", "1.1.4"];
    if (has(d, KW.zeel)) {
      return has(d + ctp, KW.ajiltan) ? ["M", "5.1.3"] : ["M", "5.1.2"];
    }

    // Default орлого
    return ["M", "1.1.1"];
  }

  if (expense > 0) {
    // Тусгай харилцагчид
    if (ctp.includes("өнөрсайхан") || ctp.includes("onorsaihan")) return ["N", "5.2.3"];
    if (related.some((x) => ctp.includes(x))) {
      return has(d, KW.tootsoo) ? ["N", "5.2.1"] : ["N", "5.2.2"];
    }

    // Банкны шимтгэл
    if (has(d + ctp, KW.shimtgel)) return ["N", "2.1.14"];

    // Мост Мони (цалин шилжүүлгийн систем)
    if (has(d + ctp, KW.mostMoni)) return ["N", "2.2.2"];

    // МТА татварын шилжүүлэг
    if (ctp.includes("мта") && ctp.includes("татвар")) {
      if (d.startsWith("1251") || d.includes(";1251")) return ["N", "2.2.3"]; // НӨАТ
      if (d.startsWith("126") || d.includes(";126")) return ["N", "2.2.1"]; // ХХОАТ
      return ["N", "2.2.3"];
    }

    // Цалин / НДШ / татвар
    if (has(d, KW.tsalin)) return ["N", "2.1.1"];
    if (has(d, KW.noat)) return ["N", "2.2.3"];
    if (has(d, KW.ndsh)) return ["N", "2.2.4"];
    if (has(d, KW.tomilolt)) return ["N", "2.1.3"];
    if (has(d, KW.surgalt)) return ["N", "2.1.5"];
    if (has(d, KW.holboo)) return ["N", "2.1.6"];
    if (has(d, KW.bichig)) return ["N", "2.1.7"];
    if (has(d, KW.orchuulga)) return ["N", "2.1.8"];
    if (has(d, KW.baritsaa)) return ["N", "2.1.9"];

    // Түрээс — ЗӨВХӨН Гацуурт ХХК-д төлсөн түрээс л энд орно. Бусад "түрээс"
    // (машин/кран түрээс гэх мэт) нь тээврийн төлбөр тул доорх тээврийн дүрэмд
    // унаж 1.2.1/1.2.2 болно.
    if (has(d, KW.gatsuurt) || ctp.includes("гацуурт")) return ["N", "2.1.10"];

    // Техник хэрэгсэл / тавилга
    if (
      ["dell", "notebook", "laptop", "ноутбук", "компьютер", "computer", "komputer", "kompyuter", "16gb", "512 gb", "ssd"].some((x) =>
        d.includes(x),
      )
    ) {
      return ["N", "3.2.1"];
    }
    if (["сандал", "шкаф", "шүүгээ", "тавилга", "эд хогшил", "tavilga", "sandal"].some((x) => d.includes(x))) {
      return ["N", "3.2.2"];
    }

    // Тээврийн зардал (K2/K3/K7/K9 карго, УБ-ДА чиглэл)
    const isTransport =
      (d.includes("кран") && !ctp.includes("гацуурт")) ||
      ["k2", "k3", "k7", "k9", "уб-", "ub-"].some((x) => d.includes(x)) ||
      has(d, KW.kran) || has(d, KW.mashin);
    if (isTransport || d.includes("өмнөх сар") || d.includes("umnuh sar")) {
      if (d.includes("өмнөх сар") || d.includes("umnuh sar")) return ["N", "1.2.2"];
      if (month && allMonthsBefore(d, month)) return ["N", "1.2.2"];
      return ["N", "1.2.1"];
    }

    // Зээл
    if (has(d, KW.zeel)) {
      return has(d + ctp, KW.ajiltan) ? ["N", "5.2.3"] : ["N", "5.2.2"];
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
    if (ctp.includes("өнөрсайхан") || ctp.includes("onorsaihan")) return ["M", "5.1.3"];
    if (ctp.includes("түмэн тээх")) {
      return has(d, KW.tootsoo) ? ["M", "5.1.1"] : ["M", "5.1.2"];
    }

    if (has(d, KW.tootsoo) || has(d, KW.avlaga)) return ["M", "1.1.2"];
    if (has(d, KW.huu)) return ["M", "1.1.3"];
    if (has(d, KW.butsaalt)) return ["M", "1.1.4"];
    if (has(d, KW.zeel)) {
      return has(d + ctp, KW.ajiltan) ? ["M", "5.1.3"] : ["M", "5.1.2"];
    }

    return ["M", "1.1.1"];
  }

  if (expense > 0) {
    if (ctp.includes("өнөрсайхан") || ctp.includes("onorsaihan")) return ["N", "5.2.3"];
    if (ctp.includes("түмэн тээх")) {
      return has(d, KW.tootsoo) ? ["N", "5.2.1"] : ["N", "5.2.2"];
    }

    if (has(d + ctp, KW.shimtgel)) return ["N", "2.1.14"];
    if (has(d + ctp, KW.mostMoni)) return ["N", "2.2.2"];

    if (has(d, KW.tsalin)) return ["N", "2.1.1"];
    if (has(d, KW.noat)) return ["N", "2.2.3"];
    if (has(d, KW.ndsh)) return ["N", "2.2.4"];
    if (has(d, KW.tomilolt)) return ["N", "2.1.3"];
    if (has(d, KW.surgalt)) return ["N", "2.1.5"];
    if (has(d, KW.holboo)) return ["N", "2.1.6"];
    if (has(d, KW.bichig)) return ["N", "2.1.7"];
    if (has(d, KW.orchuulga)) return ["N", "2.1.8"];
    if (has(d, KW.baritsaa)) return ["N", "2.1.9"];
    // Түрээс — ЗӨВХӨН Гацуурт ХХК-д төлсөн (бусад түрээс → тээвэр).
    if (has(d, KW.gatsuurt) || ctp.includes("гацуурт")) return ["N", "2.1.10"];

    if (["dell", "notebook", "laptop", "ноутбук", "компьютер", "computer", "komputer", "kompyuter"].some((x) => d.includes(x))) {
      return ["N", "3.2.1"];
    }

    const isTransport =
      (d.includes("кран") && !ctp.includes("гацуурт")) ||
      ["k2", "k3", "k7", "k9", "уб-", "ub-"].some((x) => d.includes(x)) ||
      has(d, KW.kran) || has(d, KW.mashin);
    if (isTransport || d.includes("өмнөх сар") || d.includes("umnuh sar")) {
      if (d.includes("өмнөх сар") || d.includes("umnuh sar")) return ["N", "1.2.2"];
      if (month && allMonthsBefore(d, month)) return ["N", "1.2.2"];
      return ["N", "1.2.1"];
    }

    if (has(d, KW.zeel)) {
      return has(d + ctp, KW.ajiltan) ? ["N", "5.2.3"] : ["N", "5.2.2"];
    }

    return ["N", "1.2.1"];
  }

  return ["", ""];
}

// Гүйлгээний dict-д ангиллын кодыг нэмж буцаана.
// company: 'TT' | 'GM' | 'MB' | 'HJ' → code_tt, бусад (TR) → code_tr
// HJ (Хотгор Жинст Транс) нь ерөнхий түлхүүр үгийн дүрмийг (codeTt доторх
// generic хэсэг) ашиглана; ТТ-ийн тусгай харилцагчийн дүрэм хоргүй тул үлдээв.
export function applyCodes(txn: NormalizedTxn, company: string): NormalizedTxn {
  const desc = txn.description ?? "";
  const inc = txn.income ?? 0;
  const exp = txn.expense ?? 0;
  const month = txn.txn_date ? txn.txn_date.getMonth() + 1 : null;
  const ctpy = txn.counterparty ?? "";

  const [direction, code] =
    company === "TT" || company === "GM" || company === "MB" || company === "HJ"
      ? codeTt(desc, inc, exp, month, ctpy)
      : codeTr(desc, inc, exp, month, ctpy);

  return {
    ...txn,
    income_code: direction === "M" ? code : null,
    expense_code: direction === "N" ? code : null,
  };
}
