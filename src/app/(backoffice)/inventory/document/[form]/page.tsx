import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { fmt, fmtQty, isInbound } from "@/lib/inventory-calc";
import {
  ITEM_SELECT,
  MOVE_SELECT,
  type ItemRow,
  type MoveRow,
} from "../../types";

// ── Анхан шатны баримт: Бараа материал (БМ-1..6) ─────────────────────────────
// Сангийн сайдын 2017 оны 347 дугаар тушаалын хавсралт маягтуудыг хөдөлгөөн
// (doc_no-гоор бүлэглэсэн) болон барааны бүртгэлд холбож хэвлэнэ.

type DocForm = "bm-1" | "bm-2" | "bm-3" | "bm-4" | "bm-6";
type FormKey = DocForm | "bm-5";

const FORMS: Record<FormKey, { code: string; title: string; kind: "in" | "out" | "card" }> = {
  "bm-1": { code: "БМ-1", title: "Бараа материал хүлээн авалтын баримт", kind: "in" },
  "bm-2": { code: "БМ-2", title: "Орлогын баримт", kind: "in" },
  "bm-3": { code: "БМ-3", title: "Зарлагын баримт", kind: "out" },
  "bm-4": { code: "БМ-4", title: "Бараа материалыг гаргах зөвшөөрөл", kind: "out" },
  "bm-5": { code: "БМ-5", title: "Агуулахын бүртгэл", kind: "card" },
  "bm-6": { code: "БМ-6", title: "Шаардах хуудас", kind: "out" },
};

// Тухайн баримтын төрлөөс сонгож болох ах дүү маягтууд (дээд талын сэлгэлт).
const SIBLINGS: Record<"in" | "out", DocForm[]> = {
  in: ["bm-2", "bm-1"],
  out: ["bm-3", "bm-6", "bm-4"],
};

const Dots = ({ w = "100%", v }: { w?: string; v?: string | null }) => (
  <span
    className="inline-block border-b border-dotted border-zinc-500 align-bottom"
    style={{ minWidth: w }}
  >
    <span className="px-1 font-medium text-zinc-900">{v || " "}</span>
  </span>
);

const BlankLines = ({ count = 2 }: { count?: number }) => (
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

type Search = { doc?: string; move?: string; item?: string };

export default async function InventoryDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ form: string }>;
  searchParams: Promise<Search>;
}) {
  const { form } = await params;
  const sp = await searchParams;
  const meta = FORMS[form as FormKey];
  if (!meta) notFound();

  const supabase = await createClient();

  // ── БМ-5: Агуулахын бүртгэл (нэг барааны бүх хөдөлгөөн) ─────────────────────
  if (form === "bm-5") {
    const itemId = Number(sp.item);
    if (!itemId) notFound();
    const [{ data: itemData }, { data: moveData }] = await Promise.all([
      supabase.from("inv_items").select(ITEM_SELECT).eq("id", itemId).maybeSingle(),
      supabase
        .from("inv_moves")
        .select(MOVE_SELECT)
        .eq("item_id", itemId)
        .order("date", { ascending: true })
        .order("id", { ascending: true })
        .limit(20000),
    ]);
    const item = itemData as ItemRow | null;
    if (!item) notFound();
    const moves = (moveData as MoveRow[] | null) ?? [];

    let bal = 0;
    const rows = moves.map((m) => {
      const qty = Number(m.qty) || 0;
      const inbound = isInbound(m.type);
      bal += inbound ? qty : -qty;
      return { m, inQty: inbound ? qty : 0, outQty: inbound ? 0 : qty, bal };
    });

    return (
      <div>
        <div className="no-print mb-4 flex items-center justify-between">
          <Link href="/inventory?tab=items" className="text-sm text-zinc-500 hover:text-zinc-800">
            ← Бараа материал
          </Link>
          <PrintButton />
        </div>

        <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-8 text-sm leading-7 text-zinc-800 print:max-w-none print:rounded-none print:border-0 print:p-0">
          <div className="text-right text-[11px] leading-4 text-zinc-500">
            Сангийн сайдын 2017 оны
            <br />
            347 дугаар тушаалын хавсралт
            <br />
            <span className="font-medium text-zinc-700">НХ Маягт БМ-5</span>
          </div>
          <h2 className="mt-2 text-center text-base font-bold uppercase text-zinc-900">
            Агуулахын бүртгэл
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1">
            <div>Бараа материалын нэр: <Dots w="200px" v={item.name} /></div>
            <div>Код / SKU: <Dots w="160px" v={item.sku || item.category_code} /></div>
            <div>Хэмжих нэгж: <Dots w="120px" v={item.unit} /></div>
            <div>Захиалгын цэг: <Dots w="120px" v={String(item.reorder_point)} /></div>
            <div>Байгууллага: <Dots w="200px" v={item.company} /></div>
            <div>Нөөцийн норм: <Dots w="120px" /></div>
          </div>

          <table className="mt-4 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-100 text-center text-zinc-600">
                <th className="border border-zinc-300 px-2 py-1.5">Сар, өдөр</th>
                <th className="border border-zinc-300 px-2 py-1.5">Баримтын дугаар</th>
                <th className="border border-zinc-300 px-2 py-1.5">Гүйлгээний утга</th>
                <th className="border border-zinc-300 px-2 py-1.5">Орлого</th>
                <th className="border border-zinc-300 px-2 py-1.5">Зарлага</th>
                <th className="border border-zinc-300 px-2 py-1.5">Үлдэгдэл</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-zinc-300 px-2 py-4 text-center text-zinc-400">
                    Хөдөлгөөн алга.
                  </td>
                </tr>
              ) : (
                rows.map(({ m, inQty, outQty, bal }) => (
                  <tr key={m.id} className="text-center">
                    <td className="border border-zinc-300 px-2 py-1">{m.date}</td>
                    <td className="border border-zinc-300 px-2 py-1">{m.doc_no || "—"}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-left">
                      {isInbound(m.type) ? "Орлого" : "Зарлага"}
                      {m.note ? ` — ${m.note}` : ""}
                    </td>
                    <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{inQty ? fmtQty(inQty) : ""}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{outQty ? fmtQty(outQty) : ""}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums font-medium">{fmtQty(bal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-8 grid grid-cols-2 gap-10">
            <div><p>Эд хариуцагч:</p><div className="mt-6"><SignatureCell role="(гарын үсэг)" /></div></div>
            <div><p>Нягтлан бодогч:</p><div className="mt-6"><SignatureCell role="(гарын үсэг)" /></div></div>
          </div>
        </div>
      </div>
    );
  }

  // ── БМ-1/2/3/4/6: doc_no-гоор бүлэглэсэн баримт ─────────────────────────────
  // Холбоос нь doc_no (нэг баримтын олон мөр) эсвэл move id (ганц мөр) дамжуулна.
  let moves: MoveRow[] = [];
  if (sp.doc) {
    const { data } = await supabase
      .from("inv_moves")
      .select(MOVE_SELECT)
      .eq("doc_no", sp.doc)
      .order("id", { ascending: true })
      .limit(2000);
    moves = (data as MoveRow[] | null) ?? [];
  } else if (sp.move) {
    const { data: one } = await supabase
      .from("inv_moves")
      .select(MOVE_SELECT)
      .eq("id", Number(sp.move))
      .maybeSingle();
    const m = one as MoveRow | null;
    if (m) {
      if (m.doc_no) {
        const { data } = await supabase
          .from("inv_moves")
          .select(MOVE_SELECT)
          .eq("doc_no", m.doc_no)
          .order("id", { ascending: true })
          .limit(2000);
        moves = (data as MoveRow[] | null) ?? [m];
      } else {
        moves = [m];
      }
    }
  }
  if (moves.length === 0) notFound();

  const head = moves[0];
  const itemIds = [...new Set(moves.map((m) => m.item_id))];
  const [{ data: itemData }, { data: partnerData }] = await Promise.all([
    supabase.from("inv_items").select(ITEM_SELECT).in("id", itemIds),
    head.partner_id
      ? supabase.from("partners").select("name").eq("id", head.partner_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const itemById = new Map(
    ((itemData as ItemRow[] | null) ?? []).map((i) => [i.id, i]),
  );
  const partnerName = (partnerData as { name: string } | null)?.name ?? "";

  const lines = moves.map((m, i) => {
    const it = itemById.get(m.item_id);
    return {
      n: i + 1,
      name: it?.name ?? `#${m.item_id}`,
      code: it?.sku || it?.category_code || "",
      unit: it?.unit ?? "",
      qty: Number(m.qty) || 0,
      unitCost: Number(m.unit_cost) || 0,
      total: Number(m.total_cost) || 0,
    };
  });
  const totalSum = lines.reduce((s, l) => s + l.total, 0);
  const docNo = head.doc_no || (sp.move ? `#${head.id}` : "____");
  const date = head.date;
  const isIn = meta.kind === "in";

  const Head = (
    <div className="text-right text-[11px] leading-4 text-zinc-500">
      Сангийн сайдын 2017 оны
      <br />
      347 дугаар тушаалын хавсралт
      <br />
      <span className="font-medium text-zinc-700">НХ Маягт {meta.code}</span>
    </div>
  );

  const Switch = (
    <div className="no-print mt-2 flex flex-wrap gap-2">
      {SIBLINGS[isIn ? "in" : "out"].map((f) => {
        const q = sp.doc
          ? `doc=${encodeURIComponent(sp.doc)}`
          : `move=${encodeURIComponent(sp.move ?? "")}`;
        const active = f === form;
        return (
          <Link
            key={f}
            href={`/inventory/document/${f}?${q}`}
            className={`rounded-lg px-3 py-1 text-xs font-medium ${
              active
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {FORMS[f].code}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="no-print mb-2 flex items-center justify-between">
        <Link href="/inventory?tab=moves" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Хөдөлгөөн
        </Link>
        <PrintButton />
      </div>
      {Switch}

      <div className="mx-auto mt-4 max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 text-sm leading-7 text-zinc-800 print:max-w-none print:rounded-none print:border-0 print:p-0">
        {Head}
        <h2 className="mt-2 text-center text-base font-bold uppercase text-zinc-900">
          {meta.title} №{docNo}
        </h2>

        <div className="mt-4 flex items-end justify-between">
          <span>Байгууллага: <Dots w="220px" v={head.company} /></span>
          <span>{date} </span>
        </div>
        <div className="mt-2">
          {isIn ? "Нийлүүлэгч" : "Хүлээн авагч"}: <Dots w="300px" v={partnerName} />
        </div>

        {/* БМ-4: зөвшөөрлийн зорилго */}
        {form === "bm-4" && (
          <div className="mt-2">
            Зориулалт: <Dots w="380px" v={head.note} />
          </div>
        )}

        <table className="mt-4 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-100 text-center text-zinc-600">
              <th className="border border-zinc-300 px-2 py-1.5">№</th>
              <th className="border border-zinc-300 px-2 py-1.5">Барааны нэр, зэрэг</th>
              <th className="border border-zinc-300 px-2 py-1.5">Код</th>
              <th className="border border-zinc-300 px-2 py-1.5">Хэмжих нэгж</th>
              <th className="border border-zinc-300 px-2 py-1.5">Тоо хэмжээ</th>
              {form !== "bm-4" && (
                <>
                  <th className="border border-zinc-300 px-2 py-1.5">Нэгж үнэ</th>
                  <th className="border border-zinc-300 px-2 py-1.5">Нийт дүн</th>
                </>
              )}
              {form === "bm-1" && (
                <>
                  <th className="border border-zinc-300 px-2 py-1.5">Дутуу</th>
                  <th className="border border-zinc-300 px-2 py-1.5">Илүү</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.n} className="text-center">
                <td className="border border-zinc-300 px-2 py-1">{l.n}</td>
                <td className="border border-zinc-300 px-2 py-1 text-left">{l.name}</td>
                <td className="border border-zinc-300 px-2 py-1">{l.code}</td>
                <td className="border border-zinc-300 px-2 py-1">{l.unit}</td>
                <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmtQty(l.qty)}</td>
                {form !== "bm-4" && (
                  <>
                    <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(l.unitCost)}</td>
                    <td className="border border-zinc-300 px-2 py-1 text-right tabular-nums">{fmt(l.total)}</td>
                  </>
                )}
                {form === "bm-1" && (
                  <>
                    <td className="border border-zinc-300 px-2 py-1"> </td>
                    <td className="border border-zinc-300 px-2 py-1"> </td>
                  </>
                )}
              </tr>
            ))}
            {form !== "bm-4" && (
              <tr className="bg-zinc-50 text-center font-semibold">
                <td className="border border-zinc-300 px-2 py-1.5 text-right" colSpan={6}>
                  Дүн:
                </td>
                <td className="border border-zinc-300 px-2 py-1.5 text-right tabular-nums">{fmt(totalSum)}</td>
                {form === "bm-1" && <td className="border border-zinc-300" colSpan={2} />}
              </tr>
            )}
          </tbody>
        </table>

        {/* БМ-1: илүү/дутуу/гологдлын тэмдэглэл */}
        {form === "bm-1" && (
          <>
            <p className="mt-3">Илүү, дутуу, гологдол, гэмтлийн талаар:</p>
            <BlankLines count={2} />
          </>
        )}

        {/* Гарын үсэг — маягтаас хамаарна */}
        <div className="mt-8 grid grid-cols-2 gap-10">
          {form === "bm-2" && (
            <>
              <div><p>Хүлээн авсан:</p><div className="mt-6"><SignatureCell role="(албан тушаал, гарын үсэг)" /></div></div>
              <div><p>Хүлээлгэн өгсөн:</p><div className="mt-6"><SignatureCell role="(албан тушаал, гарын үсэг)" /></div></div>
            </>
          )}
          {form === "bm-3" && (
            <>
              <div><p>Хүлээлгэн өгсөн эд хариуцагч:</p><div className="mt-6"><SignatureCell role="(гарын үсэг)" /></div></div>
              <div><p>Хүлээн авагч:</p><div className="mt-6"><SignatureCell role="(гарын үсэг)" /></div></div>
            </>
          )}
          {form === "bm-1" && (
            <>
              <div><p>Комиссын гишүүд:</p><div className="mt-6"><SignatureCell role="(гарын үсэг)" /></div></div>
              <div><p>Зөвшөөрсөн тээвэрлэгч:</p><div className="mt-6"><SignatureCell role="(гарын үсэг)" /></div></div>
            </>
          )}
          {form === "bm-4" && (
            <>
              <div><p>Зөвшөөрсөн:</p><div className="mt-6"><SignatureCell role="(албан тушаал, гарын үсэг)" /></div></div>
              <div><p>Шалгасан:</p><div className="mt-6"><SignatureCell role="(гарын үсэг)" /></div></div>
            </>
          )}
          {form === "bm-6" && (
            <>
              <div><p>Зөвшөөрсөн дарга:</p><div className="mt-6"><SignatureCell role="(гарын үсэг)" /></div></div>
              <div><p>Нягтлан бодогч:</p><div className="mt-6"><SignatureCell role="(гарын үсэг)" /></div></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
