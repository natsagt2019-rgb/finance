"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  navEntries,
  allHrefs,
  isGroup,
  type NavItem,
  type NavGroup,
} from "@/lib/nav";
import { LogoutButton } from "@/components/logout-button";

const OPEN_GROUPS_KEY = "nege:nav:open-groups";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    // Query string (?kind=…)-ийг хасаж зөвхөн замаар харьцуулна.
    const path = href.split("?")[0];
    const matches = pathname === path || pathname.startsWith(path + "/");
    if (!matches) return false;
    // Илүү тодорхой (урт) тохирол байвал эх замыг идэвхгүй болгоно
    // (жишээ нь /cash/bank-summary дээр /cash-ийг тодруулахгүй).
    return !allHrefs.some((o) => {
      const op = o.split("?")[0];
      return (
        op.length > path.length &&
        (pathname === op || pathname.startsWith(op + "/"))
      );
    });
  };

  // Бүлэгт идэвхтэй цэс байгаа эсэх (анхдагчаар нээлттэй байлгахад).
  const groupHasActive = (g: NavGroup) =>
    g.items.some(
      (i) => isActive(i.href) || i.children?.some((c) => isActive(c.href)),
    );

  // Идэвхтэй бүлэг анхнаасаа нээлттэй (SSR/CSR тогтвортой). localStorage-ийг
  // mount дээр нэмж уншиж нэгтгэнэ.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const s = new Set<string>();
    navEntries.forEach((e) => {
      if (isGroup(e) && groupHasActive(e)) s.add(e.title);
    });
    return s;
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPEN_GROUPS_KEY);
      if (raw) {
        const saved: string[] = JSON.parse(raw);
        setOpenGroups((prev) => {
          const next = new Set(prev);
          saved.forEach((t) => next.add(t));
          return next;
        });
      }
    } catch {
      /* localStorage байхгүй/эвдэрсэн бол алгасна */
    }
    // pathname солигдоход идэвхтэй бүлгийг нээж байх.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      try {
        localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify([...next]));
      } catch {
        /* алгасна */
      }
      return next;
    });
  };

  const renderLink = (item: NavItem, child = false) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onNavigate}
      className={`flex min-h-[40px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        child ? "ml-3 border-l border-zinc-200 pl-4" : ""
      } ${
        isActive(item.href)
          ? "bg-zinc-900 text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      <span className="w-4 shrink-0 text-center">{item.icon}</span>
      <span className="min-w-0 flex-1">{item.label}</span>
    </Link>
  );

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {navEntries.map((entry) => {
        // Дан цэс (дашбоард, Цалин, Хөрөнгө, Бараа…) — шууд линк.
        if (!isGroup(entry)) return renderLink(entry);

        const g: NavGroup = entry;
        const open = openGroups.has(g.title);
        return (
          <div key={g.title} className="pt-1">
            <button
              type="button"
              onClick={() => toggleGroup(g.title)}
              aria-expanded={open}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            >
              <span className="w-4 shrink-0 text-center text-sm">{g.icon}</span>
              <span className="min-w-0 flex-1 text-left normal-case">
                {g.title}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>

            {open && (
              <div className="mt-1 space-y-1">
                {g.items.map((item) =>
                  item.children?.length ? (
                    <div key={item.href} className="space-y-1">
                      {renderLink(item)}
                      {item.children.map((c) => renderLink(c, true))}
                    </div>
                  ) : (
                    renderLink(item)
                  ),
                )}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">💠</span>
      <span className="font-semibold text-zinc-900">Санхүү</span>
    </div>
  );
}

export function AppShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Маршрут солигдоход mobile drawer-ийг хаана.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Drawer нээлттэй үед хуудас гүйлгэхийг хязгаарлана.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <div className="flex h-screen bg-zinc-100">
      {/* Desktop sidebar (md+) */}
      <aside className="no-print hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="flex h-16 items-center border-b border-zinc-200 px-5">
          <Brand />
        </div>
        <NavList />
      </aside>

      {/* Mobile drawer + overlay */}
      {open && (
        <div className="no-print fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Цэс хаах"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-black/40"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4">
              <Brand />
              <button
                type="button"
                aria-label="Хаах"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-xl text-zinc-500 hover:bg-zinc-100"
              >
                ✕
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
            <div className="border-t border-zinc-200 p-3">
              <p className="mb-2 truncate px-1 text-xs text-zinc-500">
                {userEmail}
              </p>
              <LogoutButton />
            </div>
          </aside>
        </div>
      )}

      {/* Контент багана */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="no-print flex h-14 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white px-4 md:h-16 md:px-6">
          {/* Mobile: hamburger + brand */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              aria-label="Цэс нээх"
              onClick={() => setOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Brand />
          </div>

          {/* Desktop: зүүн талд хоосон зай (email/logout баруун талд) */}
          <div className="hidden md:block" />

          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden truncate text-sm text-zinc-500 sm:block">
              {userEmail}
            </span>
            {/* Logout: desktop header-д. Mobile дээр drawer-д байгаа. */}
            <div className="hidden md:block">
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
