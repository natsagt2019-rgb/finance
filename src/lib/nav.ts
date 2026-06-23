// Бакоффисын хажуугийн цэс. Цэсний мөр нь дан цэс (NavItem) эсвэл бүлэг
// (NavGroup) байж болно. Бүлэг дотор дэд цэс (children) орж 3 түвшин болно.
// Шинэ модуль нэмэхдээ тохирох бүлгийн `items`-д, эсвэл дангаар нэг мөр нэмнэ.
export type NavItem = {
  href: string;
  label: string;
  icon: string; // emoji эсвэл богино тэмдэг
  children?: NavItem[];
};

export type NavGroup = {
  title: string;
  icon: string;
  items: NavItem[];
};

// Цэсний нэг мөр нь бүлэг (NavGroup) эсвэл дан цэс (NavItem) байж болно.
export type NavEntry = NavItem | NavGroup;

export function isGroup(e: NavEntry): e is NavGroup {
  return (e as NavGroup).items !== undefined;
}

export const navEntries: NavEntry[] = [
  // Дашбоард — дангаар, дээр тогтмол.
  { href: "/dashboard", label: "Хяналтын самбар", icon: "▦" },

  {
    title: "Үндсэн бүртгэл",
    icon: "📚",
    items: [
      { href: "/accounts", label: "Дансны жагсаалт", icon: "🗂" },
      {
        href: "/opening-balances",
        label: "Эхний үлдэгдэл",
        icon: "◔",
        children: [
          { href: "/opening-balances/financial-statement", label: "Санхүүгийн тайлангийн", icon: "⚖" },
          { href: "/opening-balances/accounts", label: "Дансны", icon: "🗂" },
          { href: "/opening-balances/partners", label: "Харилцагчийн", icon: "👥" },
          { href: "/opening-balances/assets", label: "Үндсэн хөрөнгийн", icon: "🏗" },
          { href: "/opening-balances/inventory", label: "Барааны / хангамж", icon: "📦" },
        ],
      },
      { href: "/journals", label: "Журнал", icon: "📒" },
    ],
  },
  {
    title: "Банк / Касс",
    icon: "🏦",
    items: [
      { href: "/import", label: "Дансны хуулга цэгцлэгч", icon: "↧" },
      { href: "/categorize", label: "AI ангилал", icon: "✨" },
      { href: "/statements", label: "Дансны хуулга", icon: "₮" },
      { href: "/reports/cashflow", label: "Мөнгөн урсгал", icon: "≈" },
      { href: "/cash", label: "Касс", icon: "🪙" },
      { href: "/cash/bank-summary", label: "Мөнгөн хөрөнгийн нэгтгэл", icon: "🏦" },
      { href: "/cash/bank-transactions", label: "Харилцахын гүйлгээний тайлан", icon: "🧾" },
      { href: "/cash/bank-journal", label: "Мөнгөн хөрөнгийн журнал", icon: "📓" },
      { href: "/cash/cash-transactions", label: "Кассын гүйлгээний тайлан", icon: "🧾" },
    ],
  },
  {
    title: "Худалдан авалт / Борлуулалт",
    icon: "🛒",
    items: [
      { href: "/purchases", label: "Худалдан авалт", icon: "🛒" },
      {
        href: "/sales",
        label: "Борлуулалт",
        icon: "🏷",
        children: [
          { href: "/invoices", label: "Нэхэмжлэх", icon: "📑" },
          { href: "/reports/sales-by-customer", label: "Борлуулалтын тайлан (харилцагчаар)", icon: "🧾" },
        ],
      },
    ],
  },
  {
    title: "Харилцагч / Тооцоо",
    icon: "🤝",
    items: [
      { href: "/partners", label: "Харилцагчид", icon: "👥" },
      { href: "/partners/merge", label: "Харилцагчийн нэр нэгтгэх", icon: "🔗" },
      { href: "/receivables", label: "Авлагын насжилт", icon: "📥" },
      { href: "/payables", label: "Өглөгийн насжилт", icon: "📤" },
      { href: "/reports/partner-balances", label: "Харилцагчийн тооцоо", icon: "🤝" },
      { href: "/reports/partner-balance-detail", label: "Харилцагчийн үлдэгдлийн тайлан", icon: "📋" },
      { href: "/reports/partner-statement", label: "Тооцооны үлдэгдлийн тайлан", icon: "📃" },
      { href: "/reports/balance-turnover?kind=recv", label: "Авлагын товчоо тайлан", icon: "📈" },
      { href: "/reports/balance-turnover?kind=pay", label: "Өглөгийн товчоо тайлан", icon: "📉" },
    ],
  },

  // Цалин, Үндсэн хөрөнгө, Бараа — тус тусдаа дангаар.
  { href: "/salary", label: "Цалин", icon: "💰" },
  { href: "/assets", label: "Үндсэн хөрөнгө", icon: "🏗" },
  {
    href: "/inventory",
    label: "Бараа материал",
    icon: "📦",
    children: [
      { href: "/inventory/prices", label: "Барааны үнэ", icon: "💲" },
      { href: "/inventory/locations", label: "Байршил (агуулах)", icon: "📍" },
      { href: "/inventory/recipes", label: "Хөрвүүлэлт (орц)", icon: "⚗" },
      { href: "/inventory/transfer", label: "Дотоод шилжүүлэг", icon: "⇄" },
    ],
  },

  {
    title: "НӨАТ",
    icon: "🧾",
    items: [
      { href: "/vat", label: "НӨАТ бүртгэл", icon: "🧾" },
      { href: "/reports/vat-settlement", label: "НӨАТ тооцооны тайлан", icon: "🧮" },
    ],
  },
  {
    title: "Санхүүгийн тайлан",
    icon: "📊",
    items: [
      { href: "/reports/trial-balance", label: "Гүйлгээ баланс (импорт)", icon: "↥" },
      { href: "/reports/trial-balance-by-type", label: "Гүйлгээ баланс (дансны төрлөөр)", icon: "Σ" },
      { href: "/reports/general-ledger", label: "Ерөнхий данс (харьцсан дансаар)", icon: "📚" },
      { href: "/reports/balance-sheet", label: "Санхүүгийн байдлын тайлан", icon: "⚖" },
      { href: "/reports/income-statement", label: "Орлогын дэлгэрэнгүй тайлан", icon: "📈" },
      { href: "/reports/income-monthly", label: "Орлого — сараар (удирдлага)", icon: "📊" },
      { href: "/reports/equity-changes", label: "Өмчийн өөрчлөлтийн тайлан", icon: "🔄" },
      { href: "/reports/notes", label: "Санхүүгийн тодруулга", icon: "📝" },
      { href: "/reports/cash-flow", label: "Мөнгөн гүйлгээний тайлан", icon: "💵" },
      { href: "/reports/inventory-summary", label: "Бараа материалын товчоо тайлан", icon: "📦" },
      { href: "/reports/inventory", label: "Бараа материалын тайлан", icon: "📦" },
      { href: "/reports/inventory-moves", label: "Бараа материалын хөдөлгөөний журнал", icon: "📋" },
      { href: "/reports/inventory-count", label: "Тооллогын тооцооны хуудас", icon: "📋" },
      { href: "/reports/inventory-cost", label: "Барааны өртгийн тайлан", icon: "📦" },
      { href: "/reports/inventory-aging", label: "Бараа материалын насжилтын тайлан", icon: "📦" },
      { href: "/reports/inventory-trade", label: "Худалдан авалт, борлуулалтын тайлан", icon: "🛒" },
      { href: "/reports/inventory-prices", label: "Барааны үнийн тайлан", icon: "💲" },
      { href: "/reports/inventory-by-location", label: "Үлдэгдэл байршлаар", icon: "📍" },
      { href: "/reports/inventory-conversions", label: "Хөрвүүлэлтийн товчоо тайлан", icon: "⚗" },
      { href: "/reports/inventory-expiry", label: "Дуусах хугацааны тайлан", icon: "⏳" },
      { href: "/reports/fx-revaluation", label: "Ханшийн тэгшитгэл", icon: "💱" },
      { href: "/reports/worksheet", label: "Ажлын хүснэгт", icon: "🧮" },
    ],
  },
  {
    title: "Тохиргоо",
    icon: "⚙",
    items: [
      { href: "/settings/company", label: "Байгууллага", icon: "🏢" },
      { href: "/settings/bank-accounts", label: "Банкны данс", icon: "🏦" },
      { href: "/settings/category-map", label: "Ангилал → данс зураглал", icon: "🔗" },
      { href: "/users", label: "Хэрэглэгчид", icon: "👤" },
    ],
  },
];

// Бүх замыг (дан цэс + бүлгийн цэс + дэд цэс) хавтгайруулсан жагсаалт —
// идэвхтэй цэсийг "хамгийн урт тохирол"-оор тодорхойлоход ашиглана.
export const allHrefs: string[] = navEntries.flatMap((e) =>
  isGroup(e)
    ? e.items.flatMap((i) => [i.href, ...(i.children?.map((c) => c.href) ?? [])])
    : [e.href, ...(e.children?.map((c) => c.href) ?? [])],
);
