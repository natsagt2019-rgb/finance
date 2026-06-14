// Бакоффисын хажуугийн цэс. Шинэ модуль нэмэхдээ энд нэг мөр нэмнэ.
export type NavItem = {
  href: string;
  label: string;
  icon: string; // emoji эсвэл богино тэмдэг
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Хяналтын самбар", icon: "▦" },
  { href: "/accounts", label: "Дансны жагсаалт", icon: "🗂" },
  { href: "/import", label: "Дансны хуулга цэгцлэгч", icon: "↧" },
  { href: "/categorize", label: "AI ангилал", icon: "✨" },
  { href: "/statements", label: "Дансны хуулга", icon: "₮" },
  { href: "/reports/cashflow", label: "Мөнгөн урсгал", icon: "≈" },
  { href: "/opening-balances", label: "Эхний үлдэгдэл", icon: "◔" },
  { href: "/reports/trial-balance", label: "Гүйлгээ баланс (импорт)", icon: "↥" },
  { href: "/reports/trial-balance-by-type", label: "Гүйлгээ баланс (дансны төрлөөр)", icon: "Σ" },
  { href: "/reports/balance-sheet", label: "Санхүүгийн байдлын тайлан", icon: "⚖" },
  { href: "/reports/income-statement", label: "Орлогын дэлгэрэнгүй тайлан", icon: "📈" },
  { href: "/reports/income-monthly", label: "Орлого — сараар (удирдлага)", icon: "📊" },
  { href: "/reports/equity-changes", label: "Өмчийн өөрчлөлтийн тайлан", icon: "🔄" },
  { href: "/reports/notes", label: "Санхүүгийн тодруулга", icon: "📝" },
  { href: "/reports/cash-flow", label: "Мөнгөн гүйлгээний тайлан", icon: "💵" },
  { href: "/reports/fx-revaluation", label: "Ханшийн тэгшитгэл", icon: "💱" },
  { href: "/cash", label: "Касс", icon: "🪙" },
  { href: "/cash/bank-summary", label: "Мөнгөн хөрөнгийн нэгтгэл", icon: "🏦" },
  { href: "/cash/bank-transactions", label: "Харилцахын гүйлгээний тайлан", icon: "🧾" },
  { href: "/partners", label: "Харилцагчид", icon: "👥" },
  { href: "/purchases", label: "Худалдан авалт", icon: "🛒" },
  { href: "/sales", label: "Борлуулалт", icon: "🏷" },
  { href: "/invoices", label: "Нэхэмжлэх", icon: "📑" },
  { href: "/receivables", label: "Авлагын насжилт", icon: "📥" },
  { href: "/payables", label: "Өглөгийн насжилт", icon: "📤" },
  { href: "/reports/partner-balances", label: "Харилцагчийн тооцоо", icon: "🤝" },
  { href: "/reports/by-manager", label: "Менежерийн тайлан", icon: "🧑‍💼" },
  { href: "/salary", label: "Цалин", icon: "💰" },
  { href: "/assets", label: "Үндсэн хөрөнгө", icon: "🏗" },
  { href: "/inventory", label: "Бараа материал", icon: "📦" },
  { href: "/vat", label: "НӨАТ бүртгэл", icon: "🧾" },
  { href: "/reports/vat-settlement", label: "НӨАТ тооцооны тайлан", icon: "🧮" },
  { href: "/journals", label: "Журнал", icon: "📒" },
  { href: "/users", label: "Хэрэглэгчид", icon: "👤" },
  // Жишээ нь дараа нэмэх модулиуд:
  // { href: "/settings", label: "Тохиргоо", icon: "⚙" },
];
