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
  { href: "/reports/trial-balance", label: "Гүйлгээ баланс (импорт)", icon: "↥" },
  { href: "/reports/balance-sheet", label: "Санхүүгийн байдлын тайлан", icon: "⚖" },
  { href: "/reports/income-statement", label: "Орлогын дэлгэрэнгүй тайлан", icon: "📈" },
  { href: "/reports/equity-changes", label: "Өмчийн өөрчлөлтийн тайлан", icon: "🔄" },
  { href: "/reports/cash-flow", label: "Мөнгөн гүйлгээний тайлан", icon: "💵" },
  { href: "/cash/bank-summary", label: "Мөнгөн хөрөнгийн нэгтгэл", icon: "🏦" },
  { href: "/partners", label: "Харилцагчид", icon: "👥" },
  { href: "/invoices", label: "Нэхэмжлэх", icon: "📑" },
  { href: "/vat", label: "НӨАТ бүртгэл", icon: "🧾" },
  { href: "/journals", label: "Журнал", icon: "📒" },
  { href: "/users", label: "Хэрэглэгчид", icon: "👤" },
  // Жишээ нь дараа нэмэх модулиуд:
  // { href: "/settings", label: "Тохиргоо", icon: "⚙" },
];
