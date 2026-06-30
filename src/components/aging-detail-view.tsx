import {
  AGING_BUCKETS,
  AGING_LABEL,
  type AgingDetailSummary,
} from "@/lib/receivables-calc";
import { PrintButton } from "@/components/print-button";

// Авлага/өглөгийн насжилтын дэлгэрэнгүй харагдац — хоёр тайлан хуваалцана.
// `sum` нь buildAgingDetail-ийн үр дүн, `accent` нь өнгөний хэв (авлага=blue,
// өглөг=amber). minDays/q нь шүүлтийн талбарын одоогийн утга (GET форм).

type Accent = "blue" | "amber";

const ACCENT: Record<Accent, { card: string; text: string; sub: string; foot: string }> = {
  blue: {
    card: "border-blue-100 bg-blue-50",
    text: "text-blue-900",
    sub: "text-blue-600",
    foot: "text-blue-700",
  },
  amber: {
    card: "border-amber-100 bg-amber-50",
    text: "text-amber-900",
    sub: "text-amber-600",
    foot: "text-amber-700",
  },
};

function fmt(n: number): string {
  return n ? Math.round(n).toLocaleString("en-US") : "—";
}

export function AgingDetailView({
  title,
  subtitle,
  emoji,
  accent,
  sum,
  today,
  q,
  minDays,
  emptyText,
}: {
  title: string;
  subtitle: string;
  emoji: string;
  accent: Accent;
  sum: AgingDetailSummary;
  today: string;
  q: string;
  minDays: number;
  emptyText: string;
}) {
  const a = ACCENT[accent];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">
            {emoji} {title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Харилцагч
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="нэр…"
                className="w-48 rounded-lg border border-zinc-300 px-2 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Хэтэрсэн ≥ хоног
              <input
                type="number"
                name="minDays"
                min={0}
                defaultValue={minDays || ""}
                placeholder="0"
                className="w-28 rounded-lg border border-zinc-300 px-2 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Харах
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      {/* Нэгтгэлийн картууд — нийт + бүлэг бүр. */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className={`rounded-2xl border p-4 ${a.card}`}>
          <p className={`text-xs font-medium uppercase tracking-wide ${a.sub}`}>Нийт</p>
          <p className={`mt-1.5 text-xl font-bold tabular-nums ${a.text}`}>{fmt(sum.total)}₮</p>
          <p className={`mt-0.5 text-xs ${a.sub}`}>
            {sum.partnerCount} харилцагч · {sum.itemCount} зүйл
          </p>
        </div>
        {AGING_BUCKETS.map((b) => (
          <div
            key={b}
            className={`rounded-2xl border p-4 ${
              b === "90+" ? "border-rose-100 bg-rose-50" : "border-zinc-200 bg-white"
            }`}
          >
            <p
              className={`text-xs font-medium uppercase tracking-wide ${
                b === "90+" ? "text-rose-600" : "text-zinc-500"
              }`}
            >
              {AGING_LABEL[b]}
            </p>
            <p
              className={`mt-1.5 text-xl font-bold tabular-nums ${
                b === "90+" ? "text-rose-900" : "text-zinc-800"
              }`}
            >
              {fmt(sum.buckets[b])}₮
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              {sum.total > 0 ? `${((sum.buckets[b] / sum.total) * 100).toFixed(0)}%` : "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Хүснэгт — харилцагчаар бүлэглэсэн нээлттэй зүйл бүр. */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100 text-xs font-medium text-zinc-600">
            <tr>
              <th className="px-4 py-2 text-left">Огноо</th>
              <th className="px-4 py-2 text-left">Эх сурвалж</th>
              <th className="px-4 py-2 text-right">Хэтэрсэн (хоног)</th>
              <th className="px-4 py-2 text-center">Бүлэг</th>
              <th className="px-4 py-2 text-right">Дүн</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sum.partners.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-400">
                  {emptyText}
                </td>
              </tr>
            ) : (
              sum.partners.map((p) => (
                <PartnerBlock key={p.partnerKey || p.partnerName} p={p} accent={accent} />
              ))
            )}
          </tbody>
          {sum.partners.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-zinc-400 bg-zinc-100 font-bold text-zinc-900">
                <td colSpan={4} className="px-4 py-2">
                  Нийт ({sum.partnerCount} харилцагч · {sum.itemCount} зүйл)
                </td>
                <td className={`px-4 py-2 text-right tabular-nums ${a.foot}`}>{fmt(sum.total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        Насжилт нь гүйлгээний огноо (нэхэмжлэхэд төлөх хугацаа)-оос өнөөдрийг ({today}) хүртэлх
        хоногоор тооцов. Журналын зүйлс нь FIFO хаалтын дараах нээлттэй хэсэг. Хамгийн хэтэрсэн нь
        дээр.
      </p>
    </div>
  );
}

function PartnerBlock({
  p,
  accent,
}: {
  p: AgingDetailSummary["partners"][number];
  accent: Accent;
}) {
  const a = ACCENT[accent];
  return (
    <>
      <tr className="bg-zinc-50">
        <td colSpan={5} className="px-4 py-1.5 text-sm font-semibold text-zinc-800">
          {p.partnerName}
          <span className="ml-2 text-xs font-normal text-zinc-400">
            ({p.items.length} зүйл · {fmt(p.total)}₮)
          </span>
        </td>
      </tr>
      {p.items.map((it, i) => (
        <tr key={i} className="hover:bg-zinc-50">
          <td className="whitespace-nowrap px-4 py-1.5 text-zinc-600">
            {String(it.date).slice(0, 10)}
          </td>
          <td className="px-4 py-1.5 text-zinc-500">
            {it.source === "invoice" ? "Нэхэмжлэх" : "Журнал"}
          </td>
          <td
            className={`px-4 py-1.5 text-right tabular-nums ${
              it.bucket === "90+" ? "font-medium text-rose-700" : "text-zinc-600"
            }`}
          >
            {it.days}
          </td>
          <td className="px-4 py-1.5 text-center">
            <span
              className={`rounded px-1.5 py-0.5 text-xs ${
                it.bucket === "90+" ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {AGING_LABEL[it.bucket]}
            </span>
          </td>
          <td className="px-4 py-1.5 text-right tabular-nums text-zinc-800">{fmt(it.amount)}</td>
        </tr>
      ))}
      <tr className="border-t border-zinc-200 bg-white font-semibold">
        <td colSpan={4} className="px-4 py-1.5 text-right text-zinc-500">
          Харилцагчийн дүн:
        </td>
        <td className={`px-4 py-1.5 text-right tabular-nums ${a.foot}`}>{fmt(p.total)}</td>
      </tr>
    </>
  );
}
