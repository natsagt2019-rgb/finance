// Бакоффисын хажуугийн цэс. Шинэ модуль нэмэхдээ энд нэг мөр нэмнэ.
export type NavItem = {
  href: string;
  label: string;
  icon: string; // emoji эсвэл богино тэмдэг
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Хяналтын самбар", icon: "▦" },
  // Жишээ нь дараа нэмэх модулиуд:
  // { href: "/transactions", label: "Гүйлгээ", icon: "₮" },
  // { href: "/import", label: "Хуулга импорт", icon: "↧" },
  // { href: "/settings", label: "Тохиргоо", icon: "⚙" },
];
