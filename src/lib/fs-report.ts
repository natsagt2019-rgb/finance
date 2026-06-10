// E-balance (СС №361) санхүүгийн тайлангийн бүтэц ба нэгтгэл.
//
// trial_balances дахь үлдэгдэл нь debit-positive (актив/зардал +, пассив/орлого −).
// accounts.fs_line-аар fs_line_balances view нэгтгэнэ.
//
// computeStatement нь мөр бүрийн "дотоод" утгыг (raw, debit-positive) бодож,
// дэд дүнг дотоод утгуудын ЦЭВЭР НИЙЛБЭРээр гаргана. Танилцуулгын утга нь
// дотоод × disp (мөрийн тэмдэгт). Энэ нь баланс (актив+/өр-өмч−) болон
// орлогын тайлан (орлого−/зардал+, ашиг−) хоёуланд зөв ажиллана.

export type FsBalance = { opening: number; closing: number };
export type FsBalanceMap = Map<string, FsBalance>; // fs_line -> {opening, closing}

export type FsRow =
  | { kind: "section"; label: string }
  | { kind: "subhead"; code?: string; label: string }
  | { kind: "line"; code: string; label: string; fs: string; disp: 1 | -1 }
  | { kind: "subtotal"; code: string; label: string; sumOf: string[]; disp: 1 | -1 }
  | { kind: "total"; code: string; label: string; sumOf: string[]; disp: 1 | -1 };

export type ComputedRow = FsRow & { opening: number; closing: number };

// Мөр бүрийг дотоод утгаар бодож, танилцуулгын дүнтэй болгоно.
export function computeStatement(
  rows: FsRow[],
  balances: FsBalanceMap,
): ComputedRow[] {
  const internal = new Map<string, FsBalance>(); // code -> raw (debit-positive)
  const out: ComputedRow[] = [];

  for (const row of rows) {
    let o = 0;
    let c = 0;

    if (row.kind === "line") {
      const b = balances.get(row.fs);
      o = b?.opening ?? 0;
      c = b?.closing ?? 0;
      internal.set(row.code, { opening: o, closing: c });
    } else if (row.kind === "subtotal" || row.kind === "total") {
      for (const k of row.sumOf) {
        const v = internal.get(k);
        if (v) {
          o += v.opening;
          c += v.closing;
        }
      }
      internal.set(row.code, { opening: o, closing: c });
    }

    const disp = "disp" in row ? row.disp : 1;
    out.push({ ...row, opening: o * disp, closing: c * disp });
  }

  return out;
}

// ── Санхүүгийн байдлын тайлан (баланс) ───────────────────────────────────
// disp: актив (1.x) = +1, өр/өмч (2.x) = −1 (debit-positive-ийг эерэг болгоно).
const A = 1 as const; // актив тал
const P = -1 as const; // пассив тал

export const BALANCE_SHEET: FsRow[] = [
  { kind: "section", label: "1. ХӨРӨНГӨ" },
  { kind: "subhead", code: "1.1", label: "1.1 Эргэлтийн хөрөнгө" },
  { kind: "line", code: "1.1.1", label: "Мөнгө, түүнтэй адилтгах хөрөнгө", fs: "СБТ 1.1.1 Мөнгө, түүнтэй адилтгах хөрөнгө", disp: A },
  { kind: "line", code: "1.1.2", label: "Дансны авлага", fs: "СБТ 1.1.2 Дансны авлага", disp: A },
  { kind: "line", code: "1.1.3", label: "Татвар, НДШ-ийн авлага", fs: "СБТ 1.1.3 Татвар, НДШ-ийн авлага", disp: A },
  { kind: "line", code: "1.1.4", label: "Бусад авлага", fs: "СБТ 1.1.4 Бусад авлага", disp: A },
  { kind: "line", code: "1.1.5", label: "Бусад санхүүгийн хөрөнгө", fs: "СБТ 1.1.5 Бусад санхүүгийн хөрөнгө", disp: A },
  { kind: "line", code: "1.1.6", label: "Бараа материал", fs: "СБТ 1.1.6 Бараа материал", disp: A },
  { kind: "line", code: "1.1.7", label: "Урьдчилж төлсөн зардал/тооцоо", fs: "СБТ 1.1.7 Урьдчилж төлсөн зардал/тооцоо", disp: A },
  { kind: "line", code: "1.1.8", label: "Бусад эргэлтийн хөрөнгө", fs: "СБТ 1.1.8 Бусад эргэлтийн хөрөнгө", disp: A },
  { kind: "subtotal", code: "1.1.11", label: "Эргэлтийн хөрөнгийн дүн", sumOf: ["1.1.1", "1.1.2", "1.1.3", "1.1.4", "1.1.5", "1.1.6", "1.1.7", "1.1.8"], disp: A },
  { kind: "subhead", code: "1.2", label: "1.2 Эргэлтийн бус хөрөнгө" },
  { kind: "line", code: "1.2.1", label: "Үндсэн хөрөнгө", fs: "СБТ 1.2.1 Үндсэн хөрөнгө", disp: A },
  { kind: "line", code: "1.2.2", label: "Биет бус хөрөнгө", fs: "СБТ 1.2.2 Биет бус хөрөнгө", disp: A },
  { kind: "line", code: "1.2.4", label: "Урт хугацаат хөрөнгө оруулалт", fs: "СБТ 1.2.4 Урт хугацаат хөрөнгө оруулалт", disp: A },
  { kind: "line", code: "1.2.6", label: "Хойшлогдсон татварын хөрөнгө", fs: "СБТ 1.2.6 Хойшлогдсон татварын хөрөнгө", disp: A },
  { kind: "subtotal", code: "1.2.10", label: "Эргэлтийн бус хөрөнгийн дүн", sumOf: ["1.2.1", "1.2.2", "1.2.4", "1.2.6"], disp: A },
  { kind: "total", code: "1.3", label: "1.3 НИЙТ ХӨРӨНГИЙН ДҮН", sumOf: ["1.1.11", "1.2.10"], disp: A },

  { kind: "section", label: "2. ӨР ТӨЛБӨР БА ЭЗДИЙН ӨМЧ" },
  { kind: "subhead", code: "2.1.1", label: "2.1.1 Богино хугацаат өр төлбөр" },
  { kind: "line", code: "2.1.1.1", label: "Дансны өглөг", fs: "СБТ 2.1.1.1 Дансны өглөг", disp: P },
  { kind: "line", code: "2.1.1.2", label: "Цалингийн өглөг", fs: "СБТ 2.1.1.2 Цалингийн өглөг", disp: P },
  { kind: "line", code: "2.1.1.3", label: "Татварын өр", fs: "СБТ 2.1.1.3 Татварын өр", disp: P },
  { kind: "line", code: "2.1.1.4", label: "НДШ-ийн өглөг", fs: "СБТ 2.1.1.4 НДШ-ийн өглөг", disp: P },
  { kind: "line", code: "2.1.1.5", label: "Богино хугацаат зээл", fs: "СБТ 2.1.1.5 Богино хугацаат зээл", disp: P },
  { kind: "line", code: "2.1.1.6", label: "Хүүний өглөг", fs: "СБТ 2.1.1.6 Хүүний өглөг", disp: P },
  { kind: "line", code: "2.1.1.7", label: "Ногдол ашгийн өглөг", fs: "СБТ 2.1.1.7 Ногдол ашгийн өглөг", disp: P },
  { kind: "line", code: "2.1.1.8", label: "Урьдчилж орсон орлого", fs: "СБТ 2.1.1.8 Урьдчилж орсон орлого", disp: P },
  { kind: "line", code: "2.1.1.9", label: "Нөөц /өр төлбөр/", fs: "СБТ 2.1.1.9 Нөөц /өр төлбөр/", disp: P },
  { kind: "line", code: "2.1.1.10", label: "Бусад богино хугацаат өр төлбөр", fs: "СБТ 2.1.1.10 Бусад богино хугацаат өр төлбөр", disp: P },
  { kind: "subtotal", code: "2.1.1.13", label: "Богино хугацаат өр төлбөрийн дүн", sumOf: ["2.1.1.1", "2.1.1.2", "2.1.1.3", "2.1.1.4", "2.1.1.5", "2.1.1.6", "2.1.1.7", "2.1.1.8", "2.1.1.9", "2.1.1.10"], disp: P },
  { kind: "subhead", code: "2.1.2", label: "2.1.2 Урт хугацаат өр төлбөр" },
  { kind: "line", code: "2.1.2.1", label: "Урт хугацаат зээл", fs: "СБТ 2.1.2.1 Урт хугацаат зээл", disp: P },
  { kind: "line", code: "2.1.2.3", label: "Хойшлогдсон татварын өр", fs: "СБТ 2.1.2.3 Хойшлогдсон татварын өр", disp: P },
  { kind: "line", code: "2.1.2.4", label: "Бусад урт хугацаат өр төлбөр", fs: "СБТ 2.1.2.4 Бусад урт хугацаат өр төлбөр", disp: P },
  { kind: "subtotal", code: "2.1.2.6", label: "Урт хугацаат өр төлбөрийн дүн", sumOf: ["2.1.2.1", "2.1.2.3", "2.1.2.4"], disp: P },
  { kind: "total", code: "2.2", label: "2.2 Өр төлбөрийн нийт дүн", sumOf: ["2.1.1.13", "2.1.2.6"], disp: P },
  { kind: "subhead", code: "2.3", label: "2.3 Эздийн өмч" },
  { kind: "line", code: "2.3.1", label: "Өмч", fs: "СБТ 2.3.1 Өмч", disp: P },
  { kind: "line", code: "2.3.2", label: "Халаасны хувьцаа", fs: "СБТ 2.3.2 Халаасны хувьцаа", disp: P },
  { kind: "line", code: "2.3.3", label: "Нэмж төлөгдсөн капитал", fs: "СБТ 2.3.3 Нэмж төлөгдсөн капитал", disp: P },
  { kind: "line", code: "2.3.4", label: "Хөрөнгийн дахин үнэлгээний нэмэгдэл", fs: "СБТ 2.3.4 Хөрөнгийн дахин үнэлгээний нэмэгдэл", disp: P },
  { kind: "line", code: "2.3.5", label: "Гадаад валютын хөрвүүлэлтийн нөөц", fs: "СБТ 2.3.5 Гадаад валютын хөрвүүлэлтийн нөөц", disp: P },
  { kind: "line", code: "2.3.6", label: "Эздийн өмчийн бусад хэсэг", fs: "СБТ 2.3.6 Эздийн өмчийн бусад хэсэг", disp: P },
  { kind: "line", code: "2.3.7", label: "Хуримтлагдсан ашиг", fs: "СБТ 2.3.7 Хуримтлагдсан ашиг", disp: P },
  { kind: "subtotal", code: "2.3.9", label: "Эздийн өмчийн дүн", sumOf: ["2.3.1", "2.3.2", "2.3.3", "2.3.4", "2.3.5", "2.3.6", "2.3.7"], disp: P },
  { kind: "total", code: "2.4", label: "2.4 ӨР ТӨЛБӨР БА ЭЗДИЙН ӨМЧИЙН ДҮН", sumOf: ["2.2", "2.3.9"], disp: P },
];

// ── Орлогын дэлгэрэнгүй тайлан ───────────────────────────────────────────
// disp: орлого/олз = −1 (кредит-raw-ийг эерэг), зардал = +1, ашиг(дэд дүн) = −1.
const INC = -1 as const; // орлого/олз/ашиг
const EXP = 1 as const; // зардал

export const INCOME_STATEMENT: FsRow[] = [
  { kind: "line", code: "1", label: "1. Борлуулалтын орлого (цэвэр)", fs: "ОДТ 1 Борлуулалтын орлого (цэвэр)", disp: INC },
  { kind: "line", code: "2", label: "2. Борлуулсан бүтээгдэхүүний өртөг", fs: "ОДТ 2 Борлуулсан бүтээгдэхүүний өртөг", disp: EXP },
  { kind: "subtotal", code: "3", label: "3. Нийт ашиг (алдагдал)", sumOf: ["1", "2"], disp: INC },
  { kind: "line", code: "4", label: "4. Түрээсийн орлого", fs: "ОДТ 4 Түрээсийн орлого", disp: INC },
  { kind: "line", code: "5", label: "5. Хүүний орлого", fs: "ОДТ 5 Хүүний орлого", disp: INC },
  { kind: "line", code: "6", label: "6. Ногдол ашгийн орлого", fs: "ОДТ 6 Ногдол ашгийн орлого", disp: INC },
  { kind: "line", code: "7", label: "7. Эрхийн шимтгэлийн орлого", fs: "ОДТ 7 Эрхийн шимтгэлийн орлого", disp: INC },
  { kind: "line", code: "8", label: "8. Бусад орлого", fs: "ОДТ 8 Бусад орлого", disp: INC },
  { kind: "line", code: "9", label: "9. Борлуулалт, маркетингийн зардал", fs: "ОДТ 9 Борлуулалт, маркетингийн зардал", disp: EXP },
  { kind: "line", code: "10", label: "10. Ерөнхий ба удирдлагын зардал", fs: "ОДТ 10 Ерөнхий ба удирдлагын зардал", disp: EXP },
  { kind: "line", code: "11", label: "11. Санхүүгийн зардал", fs: "ОДТ 11 Санхүүгийн зардал", disp: EXP },
  { kind: "line", code: "12", label: "12. Бусад зардал", fs: "ОДТ 12 Бусад зардал", disp: EXP },
  { kind: "line", code: "13", label: "13. Гадаад валютын ханшийн зөрүүний олз (гарз)", fs: "ОДТ 13 Гадаад валютын ханшийн зөрүүний олз (гарз)", disp: INC },
  { kind: "line", code: "14", label: "14. Үндсэн хөрөнгө данснаас хассаны олз (гарз)", fs: "ОДТ 14 Үндсэн хөрөнгө данснаас хассаны олз (гарз)", disp: INC },
  { kind: "line", code: "15", label: "15. Биет бус хөрөнгө данснаас хассаны олз (гарз)", fs: "ОДТ 15 Биет бус хөрөнгө данснаас хассаны олз (гарз)", disp: INC },
  { kind: "subtotal", code: "18", label: "18. Татвар төлөхийн өмнөх ашиг (алдагдал)", sumOf: ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"], disp: INC },
  { kind: "line", code: "19", label: "19. Орлогын татварын зардал", fs: "ОДТ 19 Орлогын татварын зардал", disp: EXP },
  { kind: "total", code: "22", label: "22. Тайлант үеийн цэвэр ашиг (алдагдал)", sumOf: ["18", "19"], disp: INC },
];

// ── Мөнгөн гүйлгээний тайлан (шууд арга) ─────────────────────────────────
// Эх өгөгдөл: cash_flow_lines (cf_code → дүн). Зарлагыг хуудас сөрөг болгож
// оруулна; орлого/зарлагын мөрийн disp нь танилцуулгыг эерэг болгоно.
const IN = 1 as const; // мөнгөн орлого
const OUT = -1 as const; // мөнгөн зарлага (раw сөрөг → эерэг харагдана)

export const CASH_FLOW: FsRow[] = [
  { kind: "section", label: "1. Үндсэн үйл ажиллагааны мөнгөн гүйлгээ" },
  { kind: "line", code: "1.1.1", label: "Бараа борлуулсан, үйлчилгээний орлого", fs: "1.1.1", disp: IN },
  { kind: "line", code: "1.1.2", label: "Эрхийн шимтгэл, хураамжийн орлого", fs: "1.1.2", disp: IN },
  { kind: "line", code: "1.1.3", label: "Даатгалын нөхвөрөөс хүлээн авсан", fs: "1.1.3", disp: IN },
  { kind: "line", code: "1.1.4", label: "Буцаан авсан албан татвар", fs: "1.1.4", disp: IN },
  { kind: "line", code: "1.1.5", label: "Татаас, санхүүжилтийн орлого", fs: "1.1.5", disp: IN },
  { kind: "line", code: "1.1.6", label: "Бусад мөнгөн орлого", fs: "1.1.6", disp: IN },
  { kind: "subtotal", code: "1.1", label: "1.1 Мөнгөн орлогын дүн", sumOf: ["1.1.1", "1.1.2", "1.1.3", "1.1.4", "1.1.5", "1.1.6"], disp: IN },
  { kind: "line", code: "1.2.1", label: "Ажиллагчдад төлсөн", fs: "1.2.1", disp: OUT },
  { kind: "line", code: "1.2.2", label: "Нийгмийн даатгалын байгууллагад төлсөн", fs: "1.2.2", disp: OUT },
  { kind: "line", code: "1.2.3", label: "Бараа материал худалдан авахад төлсөн", fs: "1.2.3", disp: OUT },
  { kind: "line", code: "1.2.4", label: "Ашиглалтын зардал төлсөн", fs: "1.2.4", disp: OUT },
  { kind: "line", code: "1.2.5", label: "Түлш, шатахуун, тээврийн хөлс, сэлбэг", fs: "1.2.5", disp: OUT },
  { kind: "line", code: "1.2.6", label: "Хүүний төлбөрт төлсөн", fs: "1.2.6", disp: OUT },
  { kind: "line", code: "1.2.7", label: "Татварын байгууллагад төлсөн", fs: "1.2.7", disp: OUT },
  { kind: "line", code: "1.2.8", label: "Даатгалын төлбөрт төлсөн", fs: "1.2.8", disp: OUT },
  { kind: "line", code: "1.2.9", label: "Бусад мөнгөн зарлага", fs: "1.2.9", disp: OUT },
  { kind: "subtotal", code: "1.2", label: "1.2 Мөнгөн зарлагын дүн", sumOf: ["1.2.1", "1.2.2", "1.2.3", "1.2.4", "1.2.5", "1.2.6", "1.2.7", "1.2.8", "1.2.9"], disp: OUT },
  { kind: "total", code: "1.3", label: "1.3 Үндсэн үйл ажиллагааны цэвэр мөнгөн гүйлгээ", sumOf: ["1.1", "1.2"], disp: IN },

  { kind: "section", label: "2. Хөрөнгө оруулалтын үйл ажиллагааны мөнгөн гүйлгээ" },
  { kind: "line", code: "2.1.1", label: "Үндсэн хөрөнгө борлуулсны орлого", fs: "2.1.1", disp: IN },
  { kind: "line", code: "2.1.2", label: "Биет бус хөрөнгө борлуулсны орлого", fs: "2.1.2", disp: IN },
  { kind: "line", code: "2.1.5", label: "Олгосон зээл, урьдчилгааны буцаан төлөлт", fs: "2.1.5", disp: IN },
  { kind: "line", code: "2.1.6", label: "Хүлээн авсан хүүний орлого", fs: "2.1.6", disp: IN },
  { kind: "line", code: "2.1.7", label: "Хүлээн авсан ногдол ашиг", fs: "2.1.7", disp: IN },
  { kind: "line", code: "2.1.8", label: "Бусад мөнгөн орлого", fs: "2.1.8", disp: IN },
  { kind: "subtotal", code: "2.1", label: "2.1 Мөнгөн орлогын дүн", sumOf: ["2.1.1", "2.1.2", "2.1.5", "2.1.6", "2.1.7", "2.1.8"], disp: IN },
  { kind: "line", code: "2.2.1", label: "Үндсэн хөрөнгө олж эзэмшихэд төлсөн", fs: "2.2.1", disp: OUT },
  { kind: "line", code: "2.2.2", label: "Биет бус хөрөнгө олж эзэмшихэд төлсөн", fs: "2.2.2", disp: OUT },
  { kind: "line", code: "2.2.5", label: "Бусдад олгосон зээл болон урьдчилгаа", fs: "2.2.5", disp: OUT },
  { kind: "line", code: "2.2.6", label: "Бусад мөнгөн зарлага", fs: "2.2.6", disp: OUT },
  { kind: "subtotal", code: "2.2", label: "2.2 Мөнгөн зарлагын дүн", sumOf: ["2.2.1", "2.2.2", "2.2.5", "2.2.6"], disp: OUT },
  { kind: "total", code: "2.3", label: "2.3 Хөрөнгө оруулалтын цэвэр мөнгөн гүйлгээ", sumOf: ["2.1", "2.2"], disp: IN },

  { kind: "section", label: "3. Санхүүгийн үйл ажиллагааны мөнгөн гүйлгээ" },
  { kind: "line", code: "3.1.1", label: "Зээл авсан, өрийн үнэт цаас гаргаснаас", fs: "3.1.1", disp: IN },
  { kind: "line", code: "3.1.2", label: "Хувьцаа гаргаснаас хүлээн авсан", fs: "3.1.2", disp: IN },
  { kind: "line", code: "3.1.3", label: "Төрөл бүрийн хандив", fs: "3.1.3", disp: IN },
  { kind: "subtotal", code: "3.1", label: "3.1 Мөнгөн орлогын дүн", sumOf: ["3.1.1", "3.1.2", "3.1.3"], disp: IN },
  { kind: "line", code: "3.2.1", label: "Зээл, өрийн үнэт цаасны төлбөрт төлсөн", fs: "3.2.1", disp: OUT },
  { kind: "line", code: "3.2.2", label: "Санхүүгийн түрээсийн өглөгт төлсөн", fs: "3.2.2", disp: OUT },
  { kind: "line", code: "3.2.4", label: "Төлсөн ногдол ашиг", fs: "3.2.4", disp: OUT },
  { kind: "subtotal", code: "3.2", label: "3.2 Мөнгөн зарлагын дүн", sumOf: ["3.2.1", "3.2.2", "3.2.4"], disp: OUT },
  { kind: "total", code: "3.3", label: "3.3 Санхүүгийн цэвэр мөнгөн гүйлгээ", sumOf: ["3.1", "3.2"], disp: IN },

  { kind: "total", code: "4.1", label: "4. Бүх цэвэр мөнгөн гүйлгээ", sumOf: ["1.3", "2.3", "3.3"], disp: IN },
];
