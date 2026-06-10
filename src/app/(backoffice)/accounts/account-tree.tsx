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
  "2": "2. Үндсэн хөрөнгө",
  "3": "3. Өр төлбөр",
  "4": "4. Эзэмшигчийн өмч",
  "5": "5. Орлого",
  "6": "6. Борлуулалтын өртөг",
  "7": "7. Зардал",
  "8": "8. Бусад орлого / зардал",
  "9": "9. Татвар / хаалт",
};

// Бүлэг (кодын эхний 2 орон) — нийтлэг нэрс.
const GROUP_LABELS: Record<string, string> = {
  "10": "Касс",
  "11": "Банкны харилцах данс",
  "12": "Авлага",
  "13": "Бараа материал",
  "14": "Дуусаагүй үйлдвэрлэл",
  "15": "Бараа материал",
  "18": "Урьдчилж төлсөн",
  "20": "Үндсэн хөрөнгө",
  "31": "Дансны өглөг",
  "32": "Урьдчилж орсон орлого / зээл",
  "33": "Татварын өр",
  "34": "Бусад урт хугацаат өр",
  "41": "Өмч (дүрмийн сан)",
  "42": "Эздийн өмчийн бусад",
  "43": "Хуримтлагдсан ашиг",
  "51": "Борлуулалтын орлого",
  "52": "Хөнгөлөлт, буцаалт",
  "61": "Борлуулалтын өртөг",
  "70": "Удирдлагын зардал",
  "71": "Шууд зардал",
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

  return (
    <div>
      <div className="mb-2 flex justify-end gap-2">
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
            <button
              type="button"
              onClick={() => toggle(openSec, sec.key, setOpenSec)}
              className="flex w-full items-center gap-2 bg-zinc-100/70 px-4 py-2.5 text-left text-sm font-bold text-zinc-900 hover:bg-zinc-100"
            >
              <Chevron open={secOpen} />
              {SECTION_LABELS[sec.key] ?? `${sec.key}xxxxx`}
              <span className="ml-auto rounded-lg bg-white px-2 py-0.5 text-xs font-medium text-zinc-500">
                {sec.count}
              </span>
            </button>

            {secOpen &&
              sec.groups.map((grp) => {
                const grpOpen = openGrp.has(grp.prefix);
                return (
                  <div key={grp.prefix}>
                    {/* Бүлэг */}
                    <button
                      type="button"
                      onClick={() => toggle(openGrp, grp.prefix, setOpenGrp)}
                      className="flex w-full items-center gap-2 border-t border-zinc-100 bg-zinc-50/60 px-4 py-2 pl-8 text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
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

                    {grpOpen && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                        <tbody className="divide-y divide-zinc-100">
                          {grp.accounts.map((a) => {
                            const badge = TYPE_BADGE[a.type];
                            return (
                              <tr key={a.id} className="hover:bg-zinc-50">
                                <td className="whitespace-nowrap py-1.5 pl-14 pr-3 font-mono text-xs text-rose-600">
                                  {a.code}
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
