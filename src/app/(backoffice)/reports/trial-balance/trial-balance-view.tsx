import { PrintButton } from "@/components/print-button";
import {
  buildTrialBalanceView,
  type TbAccount,
} from "@/lib/trial-balance-view";

function fmt(n: number): string {
  if (!n) return "—";
  return Math.round(n).toLocaleString("en-US");
}

// Гурван бүлэг баганын (эхний/гүйлгээ/эцсийн) Дт-Кт нүднүүд.
function Cells({
  c,
  strong,
}: {
  c: {
    obDt: number;
    obKt: number;
    tnDt: number;
    tnKt: number;
    clDt: number;
    clKt: number;
  };
  strong?: boolean;
}) {
  const cls = `whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${
    strong ? "font-semibold text-zinc-900" : "text-zinc-600"
  }`;
  const ktCls = `whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${
    strong ? "font-semibold text-rose-700" : "text-rose-600"
  }`;
  return (
    <>
      <td className={cls}>{fmt(c.obDt)}</td>
      <td className={ktCls}>{fmt(c.obKt)}</td>
      <td className={cls}>{fmt(c.tnDt)}</td>
      <td className={ktCls}>{fmt(c.tnKt)}</td>
      <td className={cls}>{fmt(c.clDt)}</td>
      <td className={ktCls}>{fmt(c.clKt)}</td>
    </>
  );
}

export function TrialBalanceView({
  year,
  accounts,
}: {
  year: number;
  accounts: TbAccount[];
}) {
  const view = buildTrialBalanceView(accounts);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h2 className="text-lg font-semibold text-zinc-900">
          Гүйлгээ баланс — {year} он
          <span className="ml-2 rounded-lg bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
            {view.accountCount} данс
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-lg px-3 py-1 text-sm font-medium ${
              view.balanced
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {view.balanced
              ? "✓ Тэнцэл бүрэн (Дт = Кт)"
              : `⚠ Зөрүү: ${fmt(view.grand.clDt - view.grand.clKt)}`}
          </span>
          <PrintButton />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th rowSpan={2} className="px-3 py-2 text-left align-bottom">
                Код
              </th>
              <th rowSpan={2} className="px-3 py-2 text-left align-bottom">
                Дансны нэр
              </th>
              <th colSpan={2} className="border-l border-zinc-200 px-3 py-1 text-center">
                Эхний үлдэгдэл
              </th>
              <th colSpan={2} className="border-l border-zinc-200 px-3 py-1 text-center">
                Гүйлгээ
              </th>
              <th colSpan={2} className="border-l border-zinc-200 px-3 py-1 text-center">
                Эцсийн үлдэгдэл
              </th>
            </tr>
            <tr>
              <th className="border-l border-zinc-200 px-3 py-1 text-right">Дт</th>
              <th className="px-3 py-1 text-right">Кт</th>
              <th className="border-l border-zinc-200 px-3 py-1 text-right">Дт</th>
              <th className="px-3 py-1 text-right">Кт</th>
              <th className="border-l border-zinc-200 px-3 py-1 text-right">Дт</th>
              <th className="px-3 py-1 text-right">Кт</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {view.rows.map((r, i) => {
              if (r.type === "header") {
                return (
                  <tr key={i} className="bg-zinc-100">
                    <td colSpan={8} className="px-3 py-1.5 text-xs font-semibold text-zinc-600">
                      {r.label}
                    </td>
                  </tr>
                );
              }
              if (r.type === "subtotal") {
                return (
                  <tr key={i} className="bg-zinc-50/70">
                    <td colSpan={2} className="px-3 py-1.5 text-right text-xs font-semibold italic text-zinc-500">
                      {r.label}
                    </td>
                    <Cells c={r} strong />
                  </tr>
                );
              }
              if (r.type === "section") {
                return (
                  <tr key={i} className="border-y-2 border-zinc-300 bg-zinc-100">
                    <td colSpan={2} className="px-3 py-1.5 text-right font-bold text-zinc-900">
                      {r.label}
                    </td>
                    <Cells c={r} strong />
                  </tr>
                );
              }
              if (r.type === "account") {
                return (
                  <tr key={i} className="hover:bg-zinc-50">
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-rose-600">
                      {r.code}
                    </td>
                    <td className="px-3 py-1.5 text-zinc-700">{r.name || "—"}</td>
                    <Cells c={r} />
                  </tr>
                );
              }
              return null;
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-400 bg-zinc-900 text-white">
              <td colSpan={2} className="px-3 py-2 font-bold">
                НИЙТ ДҮН
              </td>
              <td className="px-3 py-2 text-right font-bold tabular-nums">{fmt(view.grand.obDt)}</td>
              <td className="px-3 py-2 text-right font-bold tabular-nums">{fmt(view.grand.obKt)}</td>
              <td className="px-3 py-2 text-right font-bold tabular-nums">{fmt(view.grand.tnDt)}</td>
              <td className="px-3 py-2 text-right font-bold tabular-nums">{fmt(view.grand.tnKt)}</td>
              <td className="px-3 py-2 text-right font-bold tabular-nums">{fmt(view.grand.clDt)}</td>
              <td className="px-3 py-2 text-right font-bold tabular-nums">{fmt(view.grand.clKt)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
