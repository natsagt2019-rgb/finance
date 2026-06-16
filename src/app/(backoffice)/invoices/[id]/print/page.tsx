import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { COMPANY, VAT_RATE } from "@/lib/company";
import { INVOICE_SELECT, type InvoiceRow } from "../../types";
import { PrintActions } from "./print-actions";

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtDate(d: string | null): string {
  return d ? d.replaceAll("-", "/") : "—"; // YYYY/MM/DD
}

type PartnerInfo = {
  name: string;
  register: string | null;
  address: string | null;
  phone: string | null;
};

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("id", Number(id))
    .single();

  if (error || !data) notFound();
  const inv = data as unknown as InvoiceRow;

  // Харилцагчийн дэлгэрэнгүй (хүлээн авагч)
  let partner: PartnerInfo | null = null;
  if (inv.partner_id) {
    const { data: p } = await supabase
      .from("partners")
      .select("name, register, address, phone")
      .eq("id", inv.partner_id)
      .single();
    if (p) partner = p as PartnerInfo;
  }
  const recipientName = partner?.name || inv.partner_name || "—";

  // inv.amount = НӨАТ-тай нийт дүн (форм "Нийт дүн"; төлөв нь paid_amount-ийг
  // үүнтэй харьцуулдаг). НӨАТ-ыг нийт дүнгээс ЗАДЛАН гаргана — дээр нь нэмэхгүй.
  const grand = Number(inv.amount) || 0;
  const net = Math.round(grand / (1 + VAT_RATE));
  const noat = grand - net;
  const remaining = grand - (Number(inv.paid_amount) || 0);

  const isPaid = inv.status === "paid";
  const stamp = isPaid
    ? { text: "ТӨЛӨГДСӨН", color: "#27ae60", opacity: 0.25 }
    : { text: "ХҮЛЭЭГДЭЖ БУЙ", color: "#e74c3c", opacity: 0.18 };

  const noteText = isPaid
    ? "✓ Нэхэмжлэх бүрэн төлөгдсөн."
    : inv.status === "partial"
      ? `Хэсэгчлэн төлөгдсөн. Үлдэгдэл: ${fmtMoney(remaining)}₮`
      : "Таны анхааралд! Төлбөрийн хугацаа дуусахаас өмнө шилжүүлнэ үү.";

  const labelCls =
    "text-xs font-bold uppercase tracking-wide text-zinc-800";

  return (
    <div className="bg-[#f0f0f0] py-6 print:bg-white print:py-0">
      <PrintActions />

      {/* A4 хуудас */}
      <div
        className="relative mx-auto bg-white px-10 py-10 text-[13px] text-zinc-700 shadow-[0_2px_20px_rgba(0,0,0,.15)] print:shadow-none"
        style={{ width: "210mm", maxWidth: "100%", minHeight: "297mm" }}
      >
        {/* Төлвийн тэмдэг */}
        <div
          className="pointer-events-none absolute right-14 top-48 -rotate-[18deg] rounded-md border-4 px-5 py-2 text-3xl font-black tracking-widest"
          style={{ borderColor: stamp.color, color: stamp.color, opacity: stamp.opacity }}
        >
          {stamp.text}
        </div>

        {/* Компанийн нэр */}
        <div className="text-[26px] font-bold text-[#5b6fa0]">
          {COMPANY.name}
        </div>
        <div className="mt-1 text-xs leading-7 text-zinc-500">
          {COMPANY.address}
          <br />
          Утас: {COMPANY.phone} &nbsp;|&nbsp; {COMPANY.email} &nbsp;|&nbsp;{" "}
          {COMPANY.web}
          <br />
          ТТД: {COMPANY.register} &nbsp;|&nbsp; НӨАТ: {COMPANY.taxId}
        </div>

        {/* Гарчиг */}
        <div className="mt-7 text-[44px] font-black leading-none tracking-tight text-[#1a2a5e]">
          Нэхэмжлэх
        </div>
        <div className="mb-7 mt-1 text-sm font-bold text-[#e74c3c]">
          Огноо: {fmtDate(inv.inv_date)}
        </div>

        {/* Мэдээллийн grid */}
        <div className="grid grid-cols-[2fr_1.5fr_1.5fr] gap-0">
          <div className="pb-4">
            <div className={labelCls}>Нэхэмжлэх хүлээн авагч</div>
            <div className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-600">
              <strong className="text-zinc-800">{recipientName}</strong>
              <br />
              {partner?.register ? (
                <>
                  ТТД: {partner.register}
                  <br />
                </>
              ) : null}
              {partner?.address ? (
                <>
                  {partner.address}
                  <br />
                </>
              ) : null}
              {partner?.phone ? <>Утас: {partner.phone}</> : null}
            </div>
          </div>

          <div className="pb-4">
            <div className={labelCls}>Төлбөр хүлээн авагч</div>
            <div className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-600">
              <strong className="text-zinc-800">{COMPANY.nameUpper}</strong>
              <br />
              {COMPANY.bankName}
              <br />
              Данс: {COMPANY.bankAccount} (MNT)
              <br />
              IBAN: {COMPANY.bankIban}
              <br />
              {inv.responsible ? (
                <>Хариуцагч: {inv.responsible}</>
              ) : null}
            </div>
          </div>

          <div className="pb-4">
            <div className={labelCls}>Нэхэмжлэх №</div>
            <div className="mt-1.5 text-[15px] font-bold text-zinc-800">
              {inv.invoice_no || `#${inv.id}`}
            </div>
            <div className={`mt-4 ${labelCls}`}>Төлбөрийн хугацаа</div>
            <div className="mt-1.5 text-[12.5px] font-bold text-zinc-700">
              {inv.due_date ? fmtDate(inv.due_date) : <span className="text-zinc-400">—</span>}
            </div>
          </div>
        </div>

        {inv.description ? (
          <div className="mb-3">
            <span className={labelCls}>Үйлчилгээний тодорхойлолт:&nbsp;</span>
            <span className="text-zinc-600">{inv.description}</span>
          </div>
        ) : null}

        <hr className="my-4 border-t-[1.5px] border-zinc-300" />

        {/* Барааны хүснэгт */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-[45%] border-b-[1.5px] border-zinc-300 px-2.5 py-2 text-left text-xs font-bold text-[#3d5a9e]">
                Тодорхойлолт
              </th>
              <th className="w-[12%] border-b-[1.5px] border-zinc-300 px-2.5 py-2 text-right text-xs font-bold text-[#3d5a9e]">
                Тоо
              </th>
              <th className="w-[20%] border-b-[1.5px] border-zinc-300 px-2.5 py-2 text-right text-xs font-bold text-[#3d5a9e]">
                Нэгжийн үнэ
              </th>
              <th className="w-[23%] border-b-[1.5px] border-zinc-300 px-2.5 py-2 text-right text-xs font-bold text-[#3d5a9e]">
                Нийт үнэ
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-100">
              <td className="px-2.5 py-2.5 text-zinc-700">
                {inv.description || "Тээврийн үйлчилгээ"}
              </td>
              <td className="px-2.5 py-2.5 text-center text-zinc-700">1</td>
              <td className="px-2.5 py-2.5 text-right text-zinc-700">
                {fmtMoney(net)}₮
              </td>
              <td className="px-2.5 py-2.5 text-right text-zinc-700">
                {fmtMoney(net)}₮
              </td>
            </tr>
            {[0, 1].map((i) => (
              <tr key={i} className="bg-[#f8f9fb]">
                <td className="px-2.5 py-2 text-transparent">—</td>
                <td className="px-2.5 py-2 text-center text-transparent">—</td>
                <td className="px-2.5 py-2 text-right text-transparent">—</td>
                <td className="px-2.5 py-2 text-right text-transparent">—</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Нийт дүн */}
        <div className="mt-5 flex items-start justify-between">
          <div className="flex-1 pr-8">
            <div className="text-xs text-zinc-400">Тэмдэглэл:</div>
            <div className="mt-1.5 min-h-[60px] border-t-[1.5px] border-zinc-300 pt-2 text-[12.5px] leading-relaxed text-zinc-600">
              {noteText}
            </div>
          </div>

          <div className="min-w-[240px]">
            <div className="flex justify-between border-b border-zinc-100 py-1.5 text-[13px]">
              <span className="text-[11px] text-zinc-400">Дүн (НӨАТ-гүй)</span>
              <span className="font-semibold text-zinc-400">
                {fmtMoney(net)}₮
              </span>
            </div>
            <div className="flex justify-between border-b border-zinc-100 py-1.5 text-[13px]">
              <span className="text-[11px] text-zinc-400">НӨАТ (10%)</span>
              <span className="font-semibold text-zinc-400">
                {fmtMoney(noat)}₮
              </span>
            </div>
            <div className="flex justify-between border-b border-zinc-100 py-1.5 text-[13px]">
              <span className="font-medium text-[#3d5a9e]">НӨАТ-тай нийт</span>
              <span className="font-semibold">{fmtMoney(grand)}₮</span>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3.5">
              <span className="text-sm text-zinc-500">НИЙТ ДҮН</span>
              <span className="text-[28px] font-black text-[#e0008b]">
                {fmtMoney(grand)}₮
              </span>
            </div>
          </div>
        </div>

        {/* Гарын үсэг */}
        <div className="mt-12 flex justify-between border-t border-zinc-200 pt-5 text-[11.5px] text-zinc-400">
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-zinc-200 text-[10px] text-zinc-300">
              Тамга
            </div>
          </div>
          <div className="self-end text-center text-[11px] text-zinc-300">
            {inv.invoice_no || `#${inv.id}`} &nbsp;|&nbsp; {inv.inv_date}
            <br />
            {COMPANY.name}
          </div>
          <div className="flex min-w-[200px] flex-col gap-4">
            <div className="flex flex-col items-center gap-1">
              <span>Захирал: {COMPANY.director}</span>
              <div className="mt-7 w-36 border-t border-zinc-400" />
              <span className="text-[10px] text-zinc-400">Гарын үсэг</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span>Нягтлан: {COMPANY.accountant}</span>
              <div className="mt-7 w-36 border-t border-zinc-400" />
              <span className="text-[10px] text-zinc-400">Гарын үсэг</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
