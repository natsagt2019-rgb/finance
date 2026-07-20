"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  DEFAULT_MONTH_HOURS_2026,
  DEFAULT_PIT_TIERS,
  VACATION_DAY_TIERS,
  SH_RATE,
  SH_CEILING,
  EMPLOYER_SH_RATE,
  PIT_RATE,
  ADVANCE_RATE,
  HOURS_PER_DAY,
} from "@/lib/salary-calc";
import { saveSettings } from "./actions";
import type { SalarySettings } from "./types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600";

const MONTH_NAMES = [
  "1-р",
  "2-р",
  "3-р",
  "4-р",
  "5-р",
  "6-р",
  "7-р",
  "8-р",
  "9-р",
  "10-р",
  "11-р",
  "12-р",
];

export function SettingsTab({
  settings,
  year,
}: {
  settings: SalarySettings | null;
  year: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const monthHours =
    settings?.month_hours?.length === 12
      ? settings.month_hours
      : DEFAULT_MONTH_HOURS_2026;
  const tiers = settings?.pit_tiers?.length ? settings.pit_tiers : DEFAULT_PIT_TIERS;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveSettings(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMsg("Тохиргоо хадгалагдлаа.");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-6"
    >
      <input type="hidden" name="year" value={year} />

      <div>
        <h2 className="text-sm font-semibold text-zinc-800">
          {year} оны сарын ажиллах цаг
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {MONTH_NAMES.map((m, i) => (
            <div key={i}>
              <label className={labelCls}>{m} сар</label>
              <input
                type="number"
                name={`mh_${i + 1}`}
                step="1"
                min="0"
                defaultValue={String(monthHours[i] ?? 0)}
                className={`${inputCls} text-right tabular-nums`}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-800">Хувь хэмжээ</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>ЭМНДШ хувь (0.115 = 11.5%)</label>
            <input
              type="number"
              name="sh_rate"
              step="0.001"
              min="0"
              defaultValue={String(settings?.sh_rate ?? SH_RATE)}
              className={`${inputCls} text-right tabular-nums`}
            />
          </div>
          <div>
            <label className={labelCls}>ЭМНДШ дээд хязгаар (₮)</label>
            <input
              type="number"
              name="sh_ceiling"
              step="1"
              min="0"
              defaultValue={String(settings?.sh_ceiling ?? SH_CEILING)}
              className={`${inputCls} text-right tabular-nums`}
            />
          </div>
          <div>
            <label className={labelCls}>Ажил олгогчийн ЭМНДШ хувь (0.145 = 14.5%)</label>
            <input
              type="number"
              name="employer_sh_rate"
              step="0.001"
              min="0"
              defaultValue={String(settings?.employer_sh_rate ?? EMPLOYER_SH_RATE)}
              className={`${inputCls} text-right tabular-nums`}
            />
          </div>
          <div>
            <label className={labelCls}>ХХОАТ хувь (0.10 = 10%)</label>
            <input
              type="number"
              name="pit_rate"
              step="0.001"
              min="0"
              defaultValue={String(settings?.pit_rate ?? PIT_RATE)}
              className={`${inputCls} text-right tabular-nums`}
            />
          </div>
          <div>
            <label className={labelCls}>Урьдчилгаа хувь (0.40 = 40%)</label>
            <input
              type="number"
              name="advance_rate"
              step="0.01"
              min="0"
              defaultValue={String(settings?.advance_rate ?? ADVANCE_RATE)}
              className={`${inputCls} text-right tabular-nums`}
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-800">
          ХХОАТ хасагдуулгын шатлал (Арт.23.1)
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Нийт орлогын шатлалаас хамаарах сарын хасагдуулга. (Уг хүснэгтийг seed-ээр
          тохируулсан — өөрчлөхийг хүсвэл хэлээрэй.)
        </p>
        <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-3 py-1.5">Нийт орлого хүртэл</th>
                <th className="px-3 py-1.5 text-right">Хасагдуулга/сар</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {tiers.map((t, i) => (
                <tr key={i}>
                  <td className="px-3 py-1.5 text-zinc-700">
                    {t.max === null
                      ? "> дээд шатлал"
                      : `≤ ${t.max.toLocaleString("en-US")}₮`}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-zinc-700">
                    {t.deduction.toLocaleString("en-US")}₮
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-800">
          Ээлжийн амралт (ЭА) — тооцооллын дүрэм
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          ЭА дүн = 1 өдрийн дундаж × ЭА хоног. 1 өдрийн дундаж = сүүлийн 11 сарын
          нийт цалин (ЭА ба урамшуулал хассан) ÷ ажилласан өдөр (цаг ÷ {HOURS_PER_DAY}).
          ЭА хоног нь туршлагаас хамаарна. «Цалин тооцоо» табын ЭА баганын ↻ товчоор
          автоматаар бодно.
        </p>
        <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-3 py-1.5">Туршлага</th>
                <th className="px-3 py-1.5 text-right">ЭА хоног</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {VACATION_DAY_TIERS.map((t, i) => {
                const prev = i === 0 ? 0 : VACATION_DAY_TIERS[i - 1].maxYears ?? 0;
                const label =
                  i === 0
                    ? `< ${t.maxYears} жил`
                    : t.maxYears === null
                      ? `${prev}+ жил`
                      : `${prev}–${t.maxYears - 1} жил`;
                return (
                  <tr key={i}>
                    <td className="px-3 py-1.5 text-zinc-700">{label}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-zinc-700">
                      {t.days} хоног
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-amber-600">
          ⚠ Урамшуулал ЭА-д ороходгүй. Өмнө авсан ЭА дүнг тооцооллоос автоматаар хасна.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {msg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {msg}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {isPending ? "Хадгалж байна…" : "Хадгалах"}
      </button>
    </form>
  );
}
