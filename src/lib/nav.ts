// Бакоффисын хажуугийн цэс. Шинэ модуль нэмэхдээ энд нэг мөр нэмнэ.
export type NavItem = {
  href: string;
  label: string;
  icon: string; // emoji эсвэл богино тэмдэг
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Хяналтын самбар", icon: "▦" },
  { href: "/import", label: "Дансны хуулга цэгцлэгч", icon: "↧" },
  { href: "/statements", label: "Дансны хуулга", icon: "₮" },
  { href: "/reports/cashflow", label: "Мөнгөн урсгал", icon: "≈" },
  { href: "/users", label: "Хэрэглэгчид", icon: "👤" },
  // Жишээ нь дараа нэмэх модулиуд:
  // { href: "/settings", label: "Тохиргоо", icon: "⚙" },
];
