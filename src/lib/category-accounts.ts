// Гүйлгээний ангилал (income_code/expense_code) → журналын ХАРЬЦСАН ДАНС.
// playbook: bank_importer/ЖУРНАЛ-БИЧИЛТ-finance2.md.
// Гүйлгээ бүр: банк нь нэг тал, энэ данс нь нөгөө тал (харьцсан данс).
//   Орлого:  Дт банк / Кт [харьцсан данс]
//   Зарлага: Дт [харьцсан данс] / Кт банк

export type CatAccount = { code: string; name: string };

// Ангилал → харьцсан данс (итгэлтэй мэплэгдсэн).
export const CATEGORY_ACCOUNT: Record<string, CatAccount> = {
  // ── Орлого (банкны орлого = авлага хаах; орлого нь нэхэмжлэхээс) ──
  "1.1.1": { code: "120101", name: "Дансны авлага" },
  "1.1.2": { code: "120101", name: "Дансны авлага" },
  "1.1.3": { code: "840201", name: "Хүүний орлого" },
  "5.1.1": { code: "120105", name: "Хоорондын тооцоо" },
  "5.1.3": { code: "120601", name: "Ажиллагчдаас авах авлага" },
  // ── Зарлага ──
  // Жолоочийн/дэд тээврийн төлбөр = ӨГЛӨГ хаах (өртөг биш — өртөг нь Өглөгийн
  // дэвтрээс аккруалаар: Дт 711701 / Кт 310101).
  "1.2.1": { code: "310101", name: "Дансны өглөг (жолоочийн төлбөр)" },
  "1.2.2": { code: "310101", name: "Дансны өглөг (жолоочийн төлбөр)" },
  "2.1.1": { code: "700101", name: "Ажилчдын цалингийн зардал" },
  "2.1.3": { code: "700401", name: "Томилолтын зардал" },
  "2.1.5": { code: "700801", name: "Сургалтын зардал" },
  "2.1.10": { code: "701401", name: "Түрээсийн зардал" },
  "2.1.14": { code: "702701", name: "Банкны шимтгэлийн зардал" },
  "2.2.1": { code: "700101", name: "Ажилчдын цалингийн зардал (ХХОАТ)" },
  "2.2.4": { code: "700201", name: "ААН-ээс төлсөн НДШ-ийн зардал" },
  "3.2.1": { code: "200601", name: "Компьютер, бусад хэрэгсэл" },
  "3.2.2": { code: "200501", name: "Тавилга эд хогшил" },
  "5.2.1": { code: "120105", name: "Хоорондын тооцоо" },
  "5.2.2": { code: "120105", name: "Хоорондын тооцоо" },
  "5.2.3": { code: "120601", name: "Ажиллагчдаас авах авлага" },
};

// ЭРГЭЛЗЭЭТЭЙ — журналд буулгахгүй (гараар хянана).
export const DOUBTFUL_CATEGORY: Record<string, string> = {
  "1.1.4": "Буцаалтын орлого (юуны буцаалт тодорхойгүй)",
  "5.1.2": "Охин компани зээл орлого (чиглэл эргэлзээтэй)",
  "2.2.2": "Мост Мони (зориулалт тодорхойгүй)",
  "2.2.3": "НӨАТ / ААН татвар (НӨАТ хуримтлал дутуу)",
};

export type Counterpart =
  | { kind: "ok"; acc: CatAccount }
  | { kind: "doubtful"; label: string }
  | { kind: "none" };

// Гүйлгээний харьцсан данс. code = income_code ?? expense_code.
export function counterpartAccount(
  incomeCode: string | null,
  expenseCode: string | null,
): Counterpart {
  const code = incomeCode ?? expenseCode;
  if (!code) return { kind: "none" };
  if (DOUBTFUL_CATEGORY[code])
    return { kind: "doubtful", label: DOUBTFUL_CATEGORY[code] };
  const acc = CATEGORY_ACCOUNT[code];
  if (!acc) return { kind: "none" };
  return { kind: "ok", acc };
}
