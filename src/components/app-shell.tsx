"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/lib/nav";
import { LogoutButton } from "@/components/logout-button";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {navItems.map((item) => {
        const matches =
          pathname === item.href || pathname.startsWith(item.href + "/");
        // Илүү тодорхой (урт) тохирол байвал эх замыг идэвхгүй болгоно
        // (жишээ нь /cash/bank-summary дээр /cash-ийг тодруулахгүй).
        const active =
          matches &&
          !navItems.some(
            (o) =>
              o.href.length > item.href.length &&
              (pathname === o.href || pathname.startsWith(o.href + "/")),
          );
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            <span className="w-4 text-center">{item.icon}</span>
            {item.label}
          </Link>
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
