"use client";

import { useState } from "react";
import Link from "next/link";

import type { AccountRow, AccountType } from "./types";
import { DeleteAccountButton } from "./delete-button";

const TYPE_BADGE: Record<AccountType, { label: string; cls: string }> = {
  asset: { label: "Хөрөнгө", cls: "bg-blue-100 text-blue-700" },
  liability: { label: "Өр төлбөр", cls: "bg-red-100 text-red-700" },
  equity: { label: "Өмч", cls: "bg-purple-100 text-purple-700" },
  income: { label: "Орлого", cls: "bg-green-100 text-green-700" },
  expense: { label: "Зардал", cls: "bg-orange-100 text-orange-700" },
};

// Хэсэг (кодын эхний орон).
const SECTION_LABELS: Record<string, string> = {
  "1": "1. Эргэлтийн хөрөнгө",
  "2": "2. Эргэлтийн бус хөрөнгө",
  "3": "3. Богино хугацаат өр төлбөр",
  "4": "4. Урт хугацаат өр төлбөр",
  "5": "5. Өмч",
  "6": "6. Орлого",
  "7": "7. Өртөг ба зардал",
  "8": "8. Бусад орлого / зардал",
  "9": "9. Татвар / хаалт",
};

// Бүлэг (кодын эхний 2 орон) — нийтлэг нэрс.
const GROUP_LABELS: Record<string, string> = {
  "10": "Касс",
  "11": "Банкны харилцах данс",
  "12": "Авлага",
  "13": "Дансны авлага",
  "14": "Урьдчилж төлсөн",
  "15": "Бараа материал",
  "16": "Үндсэн хөрөнгө",
  "18": "Бусад эргэлтийн хөрөнгө",
  "20": "Үндсэн хөрөнгө",
  "31": "Дансны өглөг",
  "32": "Урьдчилж орсон орлого / зээл",
  "33": "Татварын өр",
  "34": "Бусад богино хугацаат өр",
  "35": "Нөөц / өр төлбөр",
  "41": "Урт хугацаат өр төлбөр",
  "51": "Хувь нийлүүлсэн хөрөнгө",
  "52": "Нөөц ба дахин үнэлгээ",
  "53": "Хуримтлагдсан ашиг",
  "61": "Борлуулалтын орлого",
  "62": "Бусад үйл ажиллагааны орлого",
  "71": "Борлуулсан барааны өртөг",
  "72": "Үйл ажиллагааны зардал",
  "73": "Санхүүгийн зардал",
  "84": "Бусад орлого",
  "85": "Ханшийн олз",
  "87": "Санхүүгийн зардал",
  "88": "Ханшийн гарз",
  "91": "Орлогын татвар",
  "92": "Хаалтын данс",
};

type Group = { prefix: string; accounts: AccountRow[] };
type Section = { key: string; groups: Group[]; count: number };

function buildTree(accounts: AccountRow[]): Section[] {
  const sorted = [...accounts].sort((a, b) => a.code.localeCompare(b.code));
  const secMap = new Map<string, Map<string, AccountRow[]>>();
  for (const a of sorted) {
    const sec = a.code.slice(0, 1);
    const grp = a.code.slice(0, 2);
    if (!secMap.has(sec)) secMap.set(sec, new Map());
    const g = secMap.get(sec)!;
    if (!g.has(grp)) g.set(grp, []);
    g.get(grp)!.push(a);
  }
  return [...secMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, gmap]) => {
      const groups = [...gmap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([prefix, accs]) => ({ prefix, accounts: accs }));
      const count = groups.reduce((s, g) => s + g.accounts.length, 0);
      return { key, groups, count };
    });
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className={`inline-block text-zinc-400 transition-transform ${open ? "rotate-90" : ""}`}
    >
      ▸
    </span>
  );
}

export function AccountTree({ accounts }: { accounts: AccountRow[] }) {
  const tree = buildTree(accounts);
  const allSec = tree.map((s) => s.key);
  const allGrp = tree.flatMap((s) => s.groups.map((g) => g.prefix));

  // Анхдагчаар БҮГД нээлттэй — данснууд шууд харагдана.
  const [openSec, setOpenSec] = useState<Set<string>>(() => new Set(allSec));
  const [openGrp, setOpenGrp] = useState<Set<string>>(() => new Set(allGrp));

  // Чеклээд сонгосон хэсэг/бүлэг/данс (нээх/хаах үйлдэлд).
  const [selSec, setSelSec] = useState<Set<string>>(() => new Set());
  const [selGrp, setSelGrp] = useState<Set<string>>(() => new Set());
  const [selAcc, setSelAcc] = useState<Set<string>>(() => new Set());
  const selCount = selSec.size + selGrp.size + selAcc.size;

  const toggle = (set: Set<string>, k: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(k) ? next.delete(k) : next.add(k);
    setter(next);
  };

  const expandAll = () => {
    setOpenSec(new Set(allSec));
    setOpenGrp(new Set(allGrp));
  };
  const collapseAll = () => {
    setOpenSec(new Set());
    setOpenGrp(new Set());
  };

  // Сонгосныг нээх — чеклэсэн хэсэг/бүлэг/дансыг дэлгэж харагдуулна
  // (данс/бүлгийн эх хэсэг, бүлгийг автоматаар нээнэ).
  const openSelected = () => {
    const ns = new Set(openSec);
    const ng = new Set(openGrp);
    for (const s of selSec) ns.add(s);
    for (const g of selGrp) {
      ng.add(g);
      ns.add(g.slice(0, 1)); // эх хэсгийг нээнэ — бүлэг харагдахын тулд
    }
    for (const code of selAcc) {
      ns.add(code.slice(0, 1)); // эх хэсэг
      ng.add(code.slice(0, 2)); // эх бүлэг — данс харагдахын тулд
    }
    setOpenSec(ns);
    setOpenGrp(ng);
  };
  // Сонгосныг хаах — чеклэсэн хэсэг/бүлэг (болон сонгосон дансны бүлэг)-ийг хумина.
  const closeSelected = () => {
    const ns = new Set(openSec);
    const ng = new Set(openGrp);
    for (const s of selSec) ns.delete(s);
    for (const g of selGrp) ng.delete(g);
    for (const code of selAcc) ng.delete(code.slice(0, 2));
    setOpenSec(ns);
    setOpenGrp(ng);
  };
  const clearSel = () => {
    setSelSec(new Set());
    setSelGrp(new Set());
    setSelAcc(new Set());
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
        {selCount > 0 && (
          <>
            <span className="mr-auto text-xs text-zinc-500">
              Сонгосон: <span className="font-medium text-zinc-700">{selCount}</span>
            </span>
            <button
              type="button"
              onClick={openSelected}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
            >
              Сонгосныг нээх
            </button>
            <button
              type="button"
              onClick={closeSelected}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Сонгосныг хаах
            </button>
            <button
              type="button"
              onClick={clearSel}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50"
            >
              Цэвэрлэх
            </button>
            <span className="mx-1 h-4 w-px bg-zinc-200" />
          </>
        )}
        <button
          type="button"
          onClick={expandAll}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Бүгд нээх
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Бүгд хаах
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      {tree.map((sec) => {
        const secOpen = openSec.has(sec.key);
        return (
          <div key={sec.key} className="border-b border-zinc-100 last:border-0">
            {/* Хэсэг */}
            <div className="flex w-full items-center bg-zinc-100/70 hover:bg-zinc-100">
              <input
                type="checkbox"
                aria-label={`${SECTION_LABELS[sec.key] ?? sec.key} сонгох`}
                checked={selSec.has(sec.key)}
                onChange={() => toggle(selSec, sec.key, setSelSec)}
                className="ml-4 h-4 w-4 cursor-pointer accent-zinc-900"
              />
              <button
                type="button"
                onClick={() => toggle(openSec, sec.key, setOpenSec)}
                className="flex flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm font-bold text-zinc-900"
              >
                <Chevron open={secOpen} />
                {SECTION_LABELS[sec.key] ?? `${sec.key}xxxxx`}
                <span className="ml-auto rounded-lg bg-white px-2 py-0.5 text-xs font-medium text-zinc-500">
                  {sec.count}
                </span>
              </button>
            </div>

            {secOpen &&
              sec.groups.map((grp) => {
                const grpOpen = openGrp.has(grp.prefix);
                return (
                  <div key={grp.prefix}>
                    {/* Бүлэг */}
                    <div className="flex w-full items-center border-t border-zinc-100 bg-zinc-50/60 hover:bg-zinc-50">
                      <input
                        type="checkbox"
                        aria-label={`${GROUP_LABELS[grp.prefix] ?? grp.prefix} сонгох`}
                        checked={selGrp.has(grp.prefix)}
                        onChange={() => toggle(selGrp, grp.prefix, setSelGrp)}
                        className="ml-8 h-4 w-4 cursor-pointer accent-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={() => toggle(openGrp, grp.prefix, setOpenGrp)}
                        className="flex flex-1 items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-zinc-700"
                      >
                        <Chevron open={grpOpen} />
                        <span className="font-mono text-xs text-zinc-400">
                          {grp.prefix}
                        </span>
                        {GROUP_LABELS[grp.prefix] ?? "—"}
                        <span className="ml-auto rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                          {grp.accounts.length}
                        </span>
                      </button>
                    </div>

                    {grpOpen && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                        <tbody className="divide-y divide-zinc-100">
                          {grp.accounts.map((a) => {
                            const badge = TYPE_BADGE[a.type];
                            return (
                              <tr key={a.id} className="hover:bg-zinc-50">
                                <td className="whitespace-nowrap py-1.5 pl-10 pr-3">
                                  <span className="inline-flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      aria-label={`${a.code} сонгох`}
                                      checked={selAcc.has(a.code)}
                                      onChange={() => toggle(selAcc, a.code, setSelAcc)}
                                      className="h-3.5 w-3.5 cursor-pointer accent-zinc-900"
                                    />
                                    <span className="font-mono text-xs text-rose-600">
                                      {a.code}
                                    </span>
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 text-zinc-800">
                                  {a.name}
                                  {a.is_cogs && (
                                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                      ББӨ
                                    </span>
                                  )}
                                  {a.name_en && (
                                    <span className="ml-2 text-xs text-zinc-400">
                                      {a.name_en}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-1.5">
                                  <span
                                    className={`rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                                  >
                                    {badge.label}
                                  </span>
                                  <span
                                    className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                      (a.currency ?? "MNT") === "MNT"
                                        ? "bg-zinc-100 text-zinc-500"
                                        : "bg-emerald-100 text-emerald-700"
                                    }`}
                                  >
                                    {a.currency ?? "MNT"}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-1.5 text-right">
                                  <Link
                                    href={`/accounts/${a.id}/edit`}
                                    className="mr-1 rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                                  >
                                    Засах
                                  </Link>
                                  <DeleteAccountButton id={a.id} name={a.name} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        );
      })}
      </div>
    </div>
  );
}
