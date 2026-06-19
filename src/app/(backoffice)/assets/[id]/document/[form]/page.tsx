import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { computeAsset, resolveUsefulLife } from "@/lib/asset-calc";
import {
  ASSET_SELECT,
  CATEGORY_SELECT,
  type AssetRow,
  type CategoryRow,
} from "../../../types";

// ── Анхан шатны баримт: Үндсэн хөрөнгө (ҮХ-1..4) ─────────────────────────────
// Сангийн сайдын 2017 оны 347 дугаар тушаалын хавсралт маягтуудыг хөрөнгийн
// картын өгөгдөлд холбож хэвлэнэ.

type FormKey = "ux-1" | "ux-2" | "ux-3" | "ux-4";

const FORMS: Record<FormKey, { code: string; title: string }> = {
  "ux-1": { code: "ҮХ-1", title: "Үндсэн хөрөнгө хүлээн авах, шилжүүлэх баримт" },
  "ux-2": {
    code: "ҮХ-2",
    title: "Үндсэн хөрөнгийн өргөтгөл, сайжруулалт, их засварыг хүлээн авах баримт",
  },
  "ux-3": { code: "ҮХ-3", title: "Үндсэн хөрөнгө ашиглалтаас хасах баримт" },
  "ux-4": {
    code: "ҮХ-4",
    title: "Үндсэн хөрөнгийг дотоодод шилжүүлэх дагалдах хуудас",
  },
};

function fmt(n: number | null | undefined): string {
  return Math.round(Number(n) || 0).toLocaleString("en-US");
}

// Дэвсгэр зураастай талбар (утгатай бол утгаа, эс бөгөөс хоосон).
const Dots = ({ w = "100%", v }: { w?: string; v?: string | null }) => (
  <span
    className="inline-block border-b border-dotted border-zinc-500 align-bottom"
    style={{ minWidth: w }}
  >
    <span className="px-1 font-medium text-zinc-900">{v || " "}</span>
  </span>
);

// Дугаарласан мөр (1. Шошго ........ утга).
const NumberedField = ({
  n,
  label,
  value,
  w = "260px",
}: {
  n: number;
  label: string;
  value?: string | null;
  w?: string;
}) => (
  <div className="mt-2 flex items-end gap-2">
    <span className="shrink-0">
      {n}. {label}
    </span>
    <Dots w={w} v={value} />
  </div>
);

// Хоосон бичих хэдэн мөр (комиссын дүгнэлт зэрэгт).
const BlankLines = ({ count = 3 }: { count?: number }) => (
  <div className="mt-1 space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="border-b border-dotted border-zinc-400">
        &nbsp;
      </div>
    ))}
  </div>
);

const SignatureCell = ({ role }: { role: string }) => (
  <div className="text-center">
    <p className="border-b border-zinc-500 pb-1">&nbsp;</p>
    <p className="mt-1 text-[11px] text-zinc-500">{role}</p>
  </div>
);

export default async function AssetDocumentPage({
  params,
}: {
  params: Promise<{ id: string; form: string }>;
}) {
  const { id, form } = await params;
  const meta = FORMS[form as FormKey];
  if (!meta) notFound();

  const supabase = await createClient();
  const [{ data: assetData }, { data: catData }] = await Promise.all([
    supabase.from("assets").select(ASSET_SELECT).eq("id", Number(id)).maybeSingle(),
    supabase.from("asset_categories").select(CATEGORY_SELECT).limit(500),
  ]);
  const asset = assetData as AssetRow | null;
  if (!asset) notFound();
  const categories = (catData as CategoryRow[] | null) ?? [];
  const cat = asset.category_id
    ? categories.find((c) => c.id === asset.category_id) ?? null
    : null;

  // Элэгдлийг тухайн огноогоор тооцно (ҮХ-3 бол ашиглалтаас хассан огноогоор).
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });
  const refDate =
    form === "ux-3" && asset.disposed_date ? asset.disposed_date : today;
  const [ry, rm, rd] = refDate.split("-");
  const life = resolveUsefulLife(asset.useful_life_years, cat?.useful_life_years);
  const calc = computeAsset(
    {
      cost: Number(asset.cost) || 0,
      salvageValue: Number(asset.salvage_value) || 0,
      usefulLifeYears: life,
      acquiredDate: asset.acquired_date,
      openingDate: asset.opening_date,
      openingAccumDepreciation: Number(asset.opening_accum_depreciation) || 0,
    },
    Number(ry),
    Number(rm),
  );

  const nameTypeCode = [asset.name, cat?.name, asset.code]
    .filter(Boolean)
    .join(", ");

  // Маягтын толгой (баруун дээд булан): тушаалын мэдээлэл + маягтын код.
  const Head = (
    <div className="text-right text-[11px] leading-4 text-zinc-500">
      Сангийн сайдын 2017 оны
      <br />
      347 дугаар тушаалын хавсралт
      <br />
      <span className="font-medium text-zinc-700">НХ Маягт {meta.code}</span>
    </div>
  );

  const OrgDate = (
    <div className="mt-4 flex items-end justify-between">
      <span>
        Байгууллага: <Dots w="220px" v={asset.company} />
      </span>
      <span>
        <Dots w="40px" v={ry} /> он <Dots w="28px" v={String(Number(rm))} /> сар{" "}
        <Dots w="28px" v={String(Number(rd))} /> өдөр
      </span>
    </div>
  );

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between">
        <Link
          href={`/assets/${asset.id}`}
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          ← Хөрөнгийн карт
        </Link>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 text-sm leading-7 text-zinc-800 print:max-w-none print:rounded-none print:border-0 print:p-0">
        {Head}
        <h2 className="mt-2 text-center text-base font-bold uppercase text-zinc-900">
          {meta.title} №{asset.code || "____"}
        </h2>
        {OrgDate}

        {/* ── ҮХ-1: Хүлээн авах / шилжүүлэх ───────────────────────────── */}
        {form === "ux-1" && (
          <>
            <NumberedField n={1} label="Цех, тасаг, хэсгийн нэр" value={asset.location} />
            <NumberedField n={2} label="Хөрөнгийн нэр, төрөл, код" value={nameTypeCode} w="320px" />
            <NumberedField n={3} label="Бүртгэлийн дугаар" value={asset.code} />
            <NumberedField n={4} label="Анхны өртөг (төгрөг)" value={fmt(asset.cost)} />
            <NumberedField n={5} label="Элэгдлийн дүн (төгрөг)" value={fmt(calc.accumulatedDepreciation)} />

            <table className="mt-4 w-full border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-100 text-center text-zinc-600">
                  <th className="border border-zinc-300 px-2 py-1.5">Үйлдвэрлэсэн улс (байгууллага)</th>
                  <th className="border border-zinc-300 px-2 py-1.5">Ашиглалтад орсон он, сар, өдөр</th>
                  <th className="border border-zinc-300 px-2 py-1.5">Хувийн хэргийн дугаар</th>
                  <th className="border border-zinc-300 px-2 py-1.5">Элэгдэл тооцсон сүүлчийн огноо</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-center">
                  <td className="h-8 border border-zinc-300 px-2"> </td>
                  <td className="h-8 border border-zinc-300 px-2">{asset.acquired_date || ""}</td>
                  <td className="h-8 border border-zinc-300 px-2">{asset.code || ""}</td>
                  <td className="h-8 border border-zinc-300 px-2">{refDate}</td>
                </tr>
              </tbody>
            </table>

            <p className="mt-4">6. Хөрөнгийн шинж чанар, техникийн үзүүлэлт:</p>
            <BlankLines count={3} />
            <p className="mt-3">7. Комиссын эцсийн дүгнэлт, шийдвэр:</p>
            <BlankLines count={3} />
            <p className="mt-3">8. Хавсралт (хөрөнгийн дагалдах баримт бичиг):</p>
            <BlankLines count={2} />

            <p className="mt-6">Комиссын гишүүд:</p>
            <div className="mt-6 grid grid-cols-3 gap-6">
              <SignatureCell role="(албан тушаал)" />
              <SignatureCell role="(овог нэр)" />
              <SignatureCell role="(гарын үсэг)" />
            </div>
          </>
        )}

        {/* ── ҮХ-2: Өргөтгөл, сайжруулалт, их засвар ──────────────────── */}
        {form === "ux-2" && (
          <>
            <NumberedField n={1} label="Цех, тасаг, нэгжийн нэр" value={asset.location} />
            <NumberedField n={2} label="Их засвар хийсэн хөрөнгийн нэр" value={nameTypeCode} w="300px" />
            <NumberedField n={3} label="Их засвар хийсэн хөрөнгийн бүртгэлийн дугаар" value={asset.code} />
            <NumberedField n={4} label="Анхны өртөг (төгрөг)" value={fmt(asset.cost)} />

            <p className="mt-3">5. Энэ ажлыг хийсэн тухай тэмдэглэл:</p>
            <BlankLines count={3} />

            <table className="mt-4 w-full border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-100 text-center text-zinc-600">
                  <th className="border border-zinc-300 px-2 py-1.5" rowSpan={2}>Гүйцэтгэсэн ажил</th>
                  <th className="border border-zinc-300 px-2 py-1.5" colSpan={3}>
                    Капиталчлагдах зардлын дүн (төгрөг)
                  </th>
                </tr>
                <tr className="bg-zinc-100 text-center text-zinc-600">
                  <th className="border border-zinc-300 px-2 py-1.5">өргөтгөл</th>
                  <th className="border border-zinc-300 px-2 py-1.5">сайжруулалт</th>
                  <th className="border border-zinc-300 px-2 py-1.5">их засвар</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-center">
                  <td className="h-8 border border-zinc-300 px-2 text-left">төлөвлөгөө</td>
                  <td className="h-8 border border-zinc-300 px-2"> </td>
                  <td className="h-8 border border-zinc-300 px-2"> </td>
                  <td className="h-8 border border-zinc-300 px-2"> </td>
                </tr>
                <tr className="text-center">
                  <td className="h-8 border border-zinc-300 px-2 text-left">гүйцэтгэл</td>
                  <td className="h-8 border border-zinc-300 px-2"> </td>
                  <td className="h-8 border border-zinc-300 px-2"> </td>
                  <td className="h-8 border border-zinc-300 px-2"> </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-8 grid grid-cols-2 gap-10">
              <div>
                <p>Хүлээлгэн өгсөн:</p>
                <div className="mt-6">
                  <SignatureCell role="(албан тушаал, овог нэр, гарын үсэг)" />
                </div>
              </div>
              <div>
                <p>Хүлээн авсан:</p>
                <div className="mt-6">
                  <SignatureCell role="(албан тушаал, овог нэр, гарын үсэг)" />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── ҮХ-3: Ашиглалтаас хасах ─────────────────────────────────── */}
        {form === "ux-3" && (
          <>
            <p className="mt-3">
              1. {ry} оны {Number(rm)}-р сарын {Number(rd)}-ны өдрийн тушаалаар
              үзлэг хийж ашиглалтаас хасах хөрөнгө:
            </p>

            <table className="mt-3 w-full border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-100 text-center text-zinc-600">
                  <th className="border border-zinc-300 px-2 py-1.5" rowSpan={2}>Хөрөнгийн нэр, төрөл, код</th>
                  <th className="border border-zinc-300 px-2 py-1.5" rowSpan={2}>Үйлдвэрлэсэн улс (байгууллага), он</th>
                  <th className="border border-zinc-300 px-2 py-1.5" rowSpan={2}>Ашиглалтад орсон он, сар, өдөр</th>
                  <th className="border border-zinc-300 px-2 py-1.5" colSpan={2}>Дүн (төгрөг)</th>
                </tr>
                <tr className="bg-zinc-100 text-center text-zinc-600">
                  <th className="border border-zinc-300 px-2 py-1.5">Анхны өртөг</th>
                  <th className="border border-zinc-300 px-2 py-1.5">Хуримтлагдсан элэгдэл</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-center">
                  <td className="h-8 border border-zinc-300 px-2 text-left">{nameTypeCode}</td>
                  <td className="h-8 border border-zinc-300 px-2"> </td>
                  <td className="h-8 border border-zinc-300 px-2">{asset.acquired_date || ""}</td>
                  <td className="h-8 border border-zinc-300 px-2 text-right tabular-nums">{fmt(asset.cost)}</td>
                  <td className="h-8 border border-zinc-300 px-2 text-right tabular-nums">{fmt(calc.accumulatedDepreciation)}</td>
                </tr>
              </tbody>
            </table>

            <p className="mt-4">2. Техникийн байдал, ашиглалтаас хасах шалтгаан:</p>
            <div className="mt-1 border-b border-dotted border-zinc-400">
              <span className="font-medium text-zinc-900">{asset.disposal_note || " "}</span>
            </div>
            <BlankLines count={2} />

            <p className="mt-3">3. Хавсаргасан баримт бичгийн жагсаалт:</p>
            <BlankLines count={2} />

            <p className="mt-6">Комиссын гишүүд:</p>
            <div className="mt-6 grid grid-cols-3 gap-6">
              <SignatureCell role="(албан тушаал)" />
              <SignatureCell role="(овог нэр)" />
              <SignatureCell role="(гарын үсэг)" />
            </div>

            <p className="mt-6 text-zinc-600">
              Үндсэн хөрөнгийн бүртгэлд данснаас хасалт хийв: {ry} оны{" "}
              {Number(rm)} сарын {Number(rd)} өдөр.
            </p>
          </>
        )}

        {/* ── ҮХ-4: Дотоодод шилжүүлэх ────────────────────────────────── */}
        {form === "ux-4" && (
          <>
            <NumberedField n={1} label="Цех, тасаг, хэсгийн нэр" value={asset.location} />
            <NumberedField n={2} label="Хөрөнгийн нэр, төрөл, код" value={nameTypeCode} w="320px" />
            <NumberedField n={3} label="Бүртгэлийн дугаар" value={asset.code} />
            <NumberedField n={4} label="Анхны өртөг (төгрөг)" value={fmt(asset.cost)} />
            <NumberedField n={5} label="Элэгдлийн дүн (төгрөг)" value={fmt(calc.accumulatedDepreciation)} />

            <table className="mt-4 w-full border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-100 text-center text-zinc-600">
                  <th className="border border-zinc-300 px-2 py-1.5">Үйлдвэрлэсэн улс (байгууллага)</th>
                  <th className="border border-zinc-300 px-2 py-1.5">Ашиглалтад орсон он, сар, өдөр</th>
                  <th className="border border-zinc-300 px-2 py-1.5">Хөрөнгийн хувийн хэргийн дугаар</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-center">
                  <td className="h-8 border border-zinc-300 px-2"> </td>
                  <td className="h-8 border border-zinc-300 px-2">{asset.acquired_date || ""}</td>
                  <td className="h-8 border border-zinc-300 px-2">{asset.code || ""}</td>
                </tr>
              </tbody>
            </table>

            <p className="mt-4">6. Шилжүүлэх үндэслэл:</p>
            <BlankLines count={3} />
            <p className="mt-3">7. Хөрөнгийн байдлын тодорхойлолт:</p>
            <BlankLines count={3} />

            <div className="mt-8 grid grid-cols-2 gap-10">
              <div>
                <p>Хүлээлгэн өгсөн:</p>
                <div className="mt-6">
                  <SignatureCell role="(албан тушаал, овог нэр, гарын үсэг)" />
                </div>
              </div>
              <div>
                <p>Хүлээн авсан:</p>
                <div className="mt-6">
                  <SignatureCell role="(албан тушаал, овог нэр, гарын үсэг)" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
