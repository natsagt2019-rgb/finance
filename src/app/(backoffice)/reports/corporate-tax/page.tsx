import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { loadCompany } from "@/lib/company";
import { reportYears } from "@/lib/fs-from-journal";
import {
  buildTaxReport,
  loadTaxAdjustments,
  CIT_BRACKET,
  type TaxParams,
} from "@/lib/tax-report";
import { saveTempDiff, addManualLine, deleteAdjustment } from "./actions";

type SearchParams = {
  year?: string;
  from?: string;
  to?: string;
  small?: string;
  loss?: string;
  wht?: string;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function fmt(n: number): string {
  if (!n) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const TAX_CLASS_KIND: Record<string, string> = {
  non_deductible: "Байнгын",
  exempt_income: "Байнгын",
  temp_diff: "Түр",
};

// Албан ёсны маягтын толгой (тушаалын лавлагаа).
function FormHead() {
  return (
    <div className="text-right text-[11px] leading-4 text-zinc-500">
      Аж ахуйн нэгжийн орлогын
      <br />
      албан татварын тухай хууль (2019)
      <br />
      <span className="font-medium text-zinc-700">
        Сангийн сайдын 2020 оны А/144 тушаалын хавсралт
      </span>
    </div>
  );
}

function SignatureCell({ role, name }: { role: string; name: string }) {
  return (
    <div>
      <p>{role}:</p>
      <div className="mt-6 text-center">
        <p className="border-b border-zinc-500 pb-1">
          {name ? <span className="font-medium text-zinc-800">{name}</span> : <>&nbsp;</>}
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">/ гарын үсэг, тэмдэг /</p>
      </div>
    </div>
  );
}

export default async function CorporateTaxPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [years, company] = await Promise.all([
    reportYears(supabase),
    loadCompany(),
  ]);
  if (years.length === 0) years.push(new Date().getFullYear());
  const selYear =
    sp.year && years.includes(Number(sp.year)) ? Number(sp.year) : years[0];

  const from = sp.from && ISO.test(sp.from) ? sp.from : "";
  const to = sp.to && ISO.test(sp.to) ? sp.to : "";
  const rangeMode = !!(from && to);

  const pFrom = rangeMode ? from : `${selYear}-01-01`;
  const pTo = rangeMode ? to : `${selYear}-12-31`;

  const params: TaxParams = {
    smallBusiness: sp.small === "1",
    priorLoss: Math.max(0, Number(sp.loss) || 0),
    withholdingPaid: Math.max(0, Number(sp.wht) || 0),
  };

  const r = await buildTaxReport(supabase, pFrom, pTo, params);
  const periodText = rangeMode ? `${from} — ${to}` : `${selYear} он`;

  // Засварлах UI-д: түр зөрүүтэй дансны хадгалсан татварын тал (жилээр).
  const tempStored = new Map<string, number>();
  if (!rangeMode) {
    for (const adj of await loadTaxAdjustments(supabase, selYear)) {
      if (adj.kind === "temp_diff" && adj.accountCode)
        tempStored.set(adj.accountCode, adj.amount);
    }
  }
  const tempLines = r.lines.filter((l) => l.taxClass === "temp_diff");

  // Албан ёсны TT-02 маягтын мөрүүд (А + В хэсэг; Б тусгай хувь = 0).
  const t = r.tt02;
  type TtRow =
    | { section: string }
    | {
        no: string;
        label: string;
        value: number;
        strong?: boolean;
        indent?: boolean;
      };
  const ttRows: TtRow[] = [
    { section: "А. Нийтлэг хувь хэмжээгээр ногдуулах татварын тооцоолол" },
    { no: "1", label: "Нийт орлогын дүн (мөр 2+3+4+5)", value: t.row1, strong: true },
    { no: "2", label: "1.1. Татвараас чөлөөлөгдөх орлогын дүн", value: 0, indent: true },
    { no: "3", label: "1.2. Тусгай хувь хэмжээгээр татвар ногдох орлого", value: t.row51 ? t.row51 : 0, indent: true },
    { no: "4", label: "1.3. Бусад орлого (ГВ ханшийн бодит бус олз)", value: 0, indent: true },
    { no: "5", label: "1.4. Нийтлэг хувь хэмжээгээр татвар ногдох орлого (6+...+16)", value: t.row1, indent: true },
    { no: "6", label: "Бараа, ажил, үйлчилгээний борлуулалтын орлого", value: t.row6, indent: true },
    { no: "8", label: "Эд хөрөнгө ашиглуулсан, түрээслүүлсэн орлого", value: t.row8, indent: true },
    { no: "16", label: "Албан татвар ногдох бусад орлого", value: t.row16, indent: true },
    { no: "17", label: "Нийт зардлын дүн (18+19+20)", value: t.row17, strong: true },
    { no: "18", label: "2.1. Борлуулсан бүтээгдэхүүний өртөг", value: t.row18, indent: true },
    { no: "19", label: "2.2. Удирдлага, борлуулалтын үйл ажиллагааны зардал", value: t.row19, indent: true },
    { no: "20", label: "2.3. Үндсэн бус үйл ажиллагааны зардал", value: t.row20, indent: true },
    { no: "21", label: "Татвар төлөхийн өмнөх ашиг (+), алдагдал (−) (1−17)", value: t.row21, strong: true },
    { no: "22", label: "Татвар төлөхийн өмнөх ашгийг нэмэгдүүлэх дүн (СТ-30)", value: t.row22 },
    { no: "23", label: "Татвар төлөхийн өмнөх ашгийг бууруулах дүн (СТ-30)", value: t.row23 },
    { no: "24", label: "Татвар ногдуулах орлого (21+22−23)", value: t.row24, strong: true },
    { no: "27", label: "Өмнөх жилүүдээс шилжүүлсэн алдагдал (≤50%)", value: t.row27 },
    { no: "28", label: "Нийтлэг хувиар татвар ногдуулах орлого", value: t.row28, strong: true },
    { no: "29", label: `Ногдуулах төлбөл зохих татвар (×${r.smallBusiness ? "1%" : "10%/25%"})`, value: t.row29 },
    { no: "30", label: "Хөнгөлөгдөх татвар", value: t.row30 },
    { no: "31", label: "Нийтлэг хувиар ногдуулсан төлбөл зохих татвар (29−30)", value: t.row31, strong: true },
    { section: "Б. Тусгай хувь хэмжээгээр ногдуулах татварын тооцоолол" },
    { no: "51", label: "Тусгай хувиар ногдуулсан албан татвар (ногдол ашиг/хүү/эрхийн шимтгэл — гараар)", value: t.row51 },
    { section: "В. Албан татвар ногдуулах тооцоолол" },
    { no: "52", label: "Хуулийн дагуу суутгуулсан албан татвар", value: t.row52 },
    { no: "54", label: "Төлбөл зохих татварын дүн (31+51−52−53)", value: t.row54, strong: true },
    { no: "59", label: "НИЙТ ТӨЛБӨЛ ЗОХИХ ТАТВАРЫН ДҮН", value: t.row59, strong: true },
  ];

  // СТ-30 — Санхүү ↔ татвар зөрүүг зохицуулах тайлан (А/144 хавсралт).
  const st2 = r.permanentAdd + r.manualAdd; // мөр 2 — байнгын нэмэгдүүлэх
  const st5 = r.permanentLess + r.manualLess; // мөр 5 — байнгын бууруулах
  const st9 = round2(t.row21 + st2 - st5); // мөр 9 — байнгынгаар зохицуулсан
  const st13 = round2(st9 + r.tempDiff); // мөр 13 — түрээр зохицуулсан
  const st30Rows: TtRow[] = [
    { no: "1", label: "Санхүүгийн тайлангийн татвар төлөхийн өмнөх ашиг (TT-02 мөр 21)", value: t.row21, strong: true },
    { section: "А. Байнгын зөрүүгээр зохицуулагдах дүн" },
    { no: "2", label: "Байнгын зөрүүгийн нэмэгдүүлэх дүн (3+4)", value: round2(st2), strong: true },
    { no: "3", label: "Албан татвар ногдох орлогоос хасагдахгүй зардлын дүн", value: r.permanentAdd, indent: true },
    { no: "4", label: "Бусад байнгын зөрүүгийн нэмэгдүүлэх дүн", value: r.manualAdd, indent: true },
    { no: "5", label: "Байнгын зөрүүгийн бууруулах дүн (6+7+8)", value: round2(st5), strong: true },
    { no: "6", label: "Татвараас чөлөөлөгдөх орлогын дүн", value: r.permanentLess, indent: true },
    { no: "7", label: "Тусгай хувь хэмжээгээр татвар ногдох орлогын дүн", value: 0, indent: true },
    { no: "8", label: "Бусад байнгын зөрүүгийн бууруулах дүн", value: r.manualLess, indent: true },
    { no: "9", label: "Байнгын зөрүүгээр зохицуулагдсан (1+2−5)", value: st9, strong: true },
    { section: "Б. Түр зөрүүгээр зохицуулагдах дүн" },
    { no: "12", label: "Түр зөрүүгийн цэвэр нэмэгдүүлэх (бууруулах) дүн", value: r.tempDiff },
    { no: "13", label: "Түр зөрүүгээр зохицуулагдсан дүн (9+10+11+12)", value: st13, strong: true },
    { section: "В. Татварын тайлангаар гарсан алдагдлын тооцоолол" },
    { no: "16", label: "Тайлант хугацаанд өмнөх жилүүдийн алдагдлаас шилжүүлсэн", value: r.lossUsed },
    { section: "Г. Тайлант үеийн татварын зардлын тооцоолол" },
    { no: "19", label: "Байнгын болон түр зөрүүгээр зохицуулагдсан ашгийн дүн (13)", value: st13, strong: true },
    { no: "22", label: "Нийтлэг хувиар татвар ногдуулах орлого (19+20−21)", value: r.taxableIncome, strong: true },
    { no: "23", label: `Ногдуулсан татвар (22 × ${r.smallBusiness ? "1%" : "10%/25%"})`, value: r.taxGross },
    { no: "27", label: "Тайлант үеийн татварын зардал (23−24+25+26)", value: r.taxGross, strong: true },
  ];

  return (
    <div>
      {/* Удирдлагын мөр — хэвлэхэд харагдахгүй */}
      <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            ААНОАТ-ын тайлан — зөрүүгийн тулгалт
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Албан ёсны маягтын хэлбэр. Хэвлэх товчоор PDF/цаасаар гаргана.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {!rangeMode && (
            <form method="get" className="flex items-end gap-2">
              <select
                name="year"
                defaultValue={String(selYear)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} он
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-sm text-zinc-700">
                <input type="checkbox" name="small" value="1" defaultChecked={params.smallBusiness} className="h-4 w-4 rounded border-zinc-300" />
                Жижиг ААН (1%)
              </label>
              <div>
                <label className="block text-[11px] text-zinc-500">Өмнөх алдагдал</label>
                <input type="number" name="loss" step="0.01" min="0" defaultValue={params.priorLoss || ""} placeholder="0" className="w-36 rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500">Суутгасан татвар</label>
                <input type="number" name="wht" step="0.01" min="0" defaultValue={params.withholdingPaid || ""} placeholder="0" className="w-36 rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
              </div>
              <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                Тооцоолох
              </button>
            </form>
          )}
          <PrintButton />
        </div>
      </div>

      {/* ── Засварлах хэсэг (хэвлэхэд харагдахгүй) ── */}
      {!rangeMode && (
        <div className="no-print mb-4 grid gap-4 lg:grid-cols-2">
          {/* Түр зөрүү — татварын тал */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-900">
              Түр зөрүү — татварын талын дүн ({selYear})
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              НББ-ийн дүн санхүүгээс. Татварын дүнг (ж: татварын элэгдэл) оруулна.
            </p>
            {tempLines.length === 0 ? (
              <p className="mt-3 text-xs text-zinc-400">
                Түр зөрүүгээр тэмдэглэсэн данс алга. Дансны жагсаалтаас «Түр
                зөрүү» сонгоно.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {tempLines.map((l) => (
                  <form
                    key={l.code}
                    action={saveTempDiff}
                    className="flex items-end gap-2"
                  >
                    <input type="hidden" name="year" value={selYear} />
                    <input type="hidden" name="account_code" value={l.code} />
                    <input type="hidden" name="label" value={l.name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs text-zinc-600">
                        {l.code} — {l.name}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        НББ: {fmt(l.financial)}
                      </div>
                    </div>
                    <input
                      type="number"
                      name="amount"
                      step="0.01"
                      defaultValue={tempStored.get(l.code) ?? ""}
                      placeholder="Татварын дүн"
                      className="w-32 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                    >
                      Хадгалах
                    </button>
                  </form>
                ))}
              </div>
            )}
          </div>

          {/* Гар тохируулга */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-900">
              Гар тохируулга ({selYear})
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Дансанд үл хамаарах нэмэгдэл/хасагдал (тусгай тохиолдол).
            </p>
            {r.manualLines.length > 0 && (
              <div className="mt-3 space-y-1">
                {r.manualLines.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 text-xs text-zinc-700"
                  >
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${m.kind === "add" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                    >
                      {m.kind === "add" ? "Нэмэгдэл" : "Хасагдал"}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{m.label}</span>
                    <span className="tabular-nums">{fmt(m.amount)}</span>
                    <form action={deleteAdjustment}>
                      <input type="hidden" name="id" value={m.id} />
                      <button
                        type="submit"
                        className="text-red-500 hover:text-red-700"
                        title="Устгах"
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
            <form action={addManualLine} className="mt-3 flex items-end gap-2">
              <input type="hidden" name="year" value={selYear} />
              <select
                name="kind"
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="add">Нэмэгдэл</option>
                <option value="less">Хасагдал</option>
              </select>
              <input
                type="text"
                name="label"
                required
                placeholder="Тайлбар"
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                name="amount"
                step="0.01"
                placeholder="Дүн"
                className="w-28 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
              >
                Нэмэх
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Албан ёсны маягт ── */}
      <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-8 text-sm leading-6 text-zinc-800 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <FormHead />
        <h2 className="mt-2 text-center text-base font-bold uppercase text-zinc-900">
          Аж ахуйн нэгжийн орлогын албан татварын тайлан
        </h2>
        <p className="text-center text-xs text-zinc-500">
          /Санхүүгийн болон татварын тайлангийн үзүүлэлт хоорондын зөрүүг тулгасан тооцоо/
        </p>

        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-[13px]">
          <div>Татвар төлөгч: <b>{company.name || "—"}</b></div>
          <div>Тайлант үе: <b>{periodText}</b></div>
          <div>Татвар төлөгчийн дугаар (ТТД): <b>{company.register || "—"}</b></div>
          <div>Хэмжих нэгж: <b>төгрөг</b></div>
        </div>

        {/* TT-02 тооцооны хүснэгт */}
        <table className="mt-4 w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-zinc-100 text-center text-zinc-600">
              <th className="border border-zinc-300 px-2 py-1.5 text-left">Үзүүлэлт</th>
              <th className="w-12 border border-zinc-300 px-2 py-1.5">Мөр</th>
              <th className="w-44 border border-zinc-300 px-2 py-1.5 text-right">Дүн</th>
            </tr>
          </thead>
          <tbody>
            {ttRows.map((row, i) =>
              "section" in row ? (
                <tr key={i} className="bg-zinc-200/70">
                  <td colSpan={3} className="border border-zinc-300 px-2 py-1.5 font-semibold text-zinc-800">
                    {row.section}
                  </td>
                </tr>
              ) : (
                <tr key={i} className={row.strong ? "bg-zinc-50 font-semibold" : ""}>
                  <td className={`border border-zinc-300 px-2 py-1.5 ${row.indent ? "pl-6 text-zinc-600" : ""}`}>
                    {row.label}
                  </td>
                  <td className="border border-zinc-300 px-2 py-1.5 text-center text-zinc-500">{row.no}</td>
                  <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(row.value)}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>

        {r.taxableIncome > CIT_BRACKET && !r.smallBusiness && (
          <p className="mt-1 text-[11px] text-zinc-500">
            * Татвар ногдох орлого 6.0 тэрбум төгрөгөөс давсан тул түүнээс дээш дүнд 25 хувиар татвар ногдуулав.
          </p>
        )}

        {/* СТ-30 — Санхүү ↔ татвар зөрүүг зохицуулах тайлан (А/144 хавсралт) */}
        <h3 className="mt-8 text-center text-[13px] font-bold uppercase text-zinc-900">
          Маягт СТ-30 — Санхүүгийн болон татварын тайлангийн зөрүүг зохицуулах тайлан
        </h3>
        <p className="text-center text-[11px] text-zinc-500">
          /TT-02 мөр 21-ийн дэлгэрэнгүй тооцоолол/
        </p>
        <table className="mt-2 w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-zinc-100 text-center text-zinc-600">
              <th className="border border-zinc-300 px-2 py-1.5 text-left">Үзүүлэлт</th>
              <th className="w-12 border border-zinc-300 px-2 py-1.5">Мөр</th>
              <th className="w-44 border border-zinc-300 px-2 py-1.5 text-right">Дүн</th>
            </tr>
          </thead>
          <tbody>
            {st30Rows.map((row, i) =>
              "section" in row ? (
                <tr key={i} className="bg-zinc-200/70">
                  <td colSpan={3} className="border border-zinc-300 px-2 py-1.5 font-semibold text-zinc-800">
                    {row.section}
                  </td>
                </tr>
              ) : (
                <tr key={i} className={row.strong ? "bg-zinc-50 font-semibold" : ""}>
                  <td className={`border border-zinc-300 px-2 py-1.5 ${row.indent ? "pl-6 text-zinc-600" : ""}`}>
                    {row.label}
                  </td>
                  <td className="border border-zinc-300 px-2 py-1.5 text-center text-zinc-500">{row.no}</td>
                  <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(row.value)}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>

        {/* СТ-30 дансны задаргаа (мөр 3/6/12-ын эх) */}
        {r.lines.length > 0 && (
          <>
            <h4 className="mt-4 text-[12px] font-semibold text-zinc-700">
              Зөрүүний дансны задаргаа
            </h4>
            <table className="mt-1 w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-zinc-100 text-center text-zinc-600">
                  <th className="w-8 border border-zinc-300 px-2 py-1.5">№</th>
                  <th className="border border-zinc-300 px-2 py-1.5 text-left">Данс</th>
                  <th className="w-28 border border-zinc-300 px-2 py-1.5 text-right">Санхүүгийн дүн</th>
                  <th className="w-28 border border-zinc-300 px-2 py-1.5 text-right">Татварын дүн</th>
                  <th className="w-24 border border-zinc-300 px-2 py-1.5 text-right">Зөрүү</th>
                  <th className="w-20 border border-zinc-300 px-2 py-1.5">Төрөл</th>
                </tr>
              </thead>
              <tbody>
                {r.lines.map((l, i) => (
                  <tr key={l.code} className="text-center">
                    <td className="border border-zinc-300 px-2 py-1 text-zinc-500">{i + 1}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-left">{l.code} — {l.name}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(l.financial)}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(l.tax)}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums font-medium">{fmt(l.diff)}</td>
                    <td className="border border-zinc-300 px-2 py-1">{TAX_CLASS_KIND[l.taxClass]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Гарын үсэг */}
        <div className="mt-10 grid grid-cols-2 gap-12">
          <SignatureCell role="Захирал" name={company.director} />
          <SignatureCell role="Ерөнхий нягтлан бодогч" name={company.accountant} />
        </div>
      </div>
    </div>
  );
}
