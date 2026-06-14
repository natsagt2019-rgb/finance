import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";

// НХМаягт ТМ-3 — Тооцооны үлдэгдлийн баталгаа (хуучин reconcile_act.html).
// Дебит = нэхэмжлэл (авлага үүсэх), Кредит = банкны орлого (төлбөр).
// Цэвэр = Дебит − Кредит: + авлага, − өглөг.

// Өөрийн (нэхэмжлэгч) байгууллагын мэдээлэл. Шаардвал засна.
const COMPANY = {
  name: "ТҮМЭН ТЭЭХ ХХК",
  register: "",
  address: "",
  phone: "",
  email: "",
  bank_name: "",
  bank_account: "",
  accountant: "",
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const NUM_LIMIT = 5000;

function f2(n: number): string {
  return (Number(n) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Row = { date: string; ref: string; desc: string; debit: number; credit: number };

export default async function ReconcileActPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date_from?: string; date_to?: string; act_no?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const pid = Number(id);
  const from = sp.date_from && ISO.test(sp.date_from) ? sp.date_from : "";
  const to = sp.date_to && ISO.test(sp.date_to) ? sp.date_to : "";
  const actNo = (sp.act_no ?? "").trim();

  const { data: pData } = await supabase
    .from("partners")
    .select("id, code, name, register, phone, email, address, aliases")
    .eq("id", pid)
    .single();
  if (!pData) notFound();
  const partner = pData as {
    id: number;
    code: string | null;
    name: string;
    register: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    aliases: string[] | null;
  };
  const aliases = Array.isArray(partner.aliases) ? partner.aliases : [];

  // Дебит — нэхэмжлэл.
  let invQ = supabase
    .from("invoices")
    .select("invoice_no, inv_date, description, amount")
    .eq("partner_id", pid)
    .eq("is_active", true);
  if (from) invQ = invQ.gte("inv_date", from);
  if (to) invQ = invQ.lte("inv_date", to);
  const { data: invData } = await invQ.limit(NUM_LIMIT);

  // Кредит — банкны орлого (регистр/нэр/код-оор, дэлгэрэнгүй хуудастай адил).
  type TxnLite = { id: number; txn_date: string; description: string | null; income: number | null };
  const txnById = new Map<number, TxnLite>();
  const runTxn = async (col: string, value: string, exact: boolean) => {
    let tq = supabase
      .from("transactions")
      .select("id, txn_date, description, income")
      .not("income", "is", null);
    tq = exact ? tq.eq(col, value) : tq.ilike(col, `%${value}%`);
    if (from) tq = tq.gte("txn_date", from);
    if (to) tq = tq.lte("txn_date", `${to}T23:59:59+08:00`);
    const { data } = await tq.limit(NUM_LIMIT);
    for (const t of (data as TxnLite[] | null) ?? []) txnById.set(t.id, t);
  };
  if (partner.code) await runTxn("master_code", partner.code, true);
  if (partner.register) {
    await runTxn("description", partner.register, false);
    await runTxn("counterparty", partner.register, false);
  }
  for (const nm of [partner.name, ...aliases].filter(Boolean)) {
    await runTxn("counterparty", nm, false);
    await runTxn("master_name", nm, false);
  }

  const rows: Row[] = [];
  for (const v of (invData as { invoice_no: string | null; inv_date: string; description: string | null; amount: number }[] | null) ?? []) {
    rows.push({
      date: v.inv_date,
      ref: v.invoice_no || "",
      desc: v.description || `Нэхэмжлэл — ${partner.name}`,
      debit: Number(v.amount) || 0,
      credit: 0,
    });
  }
  for (const t of txnById.values()) {
    rows.push({
      date: (t.txn_date || "").slice(0, 10),
      ref: "",
      desc: t.description || `Төлбөр — ${partner.name}`,
      debit: 0,
      credit: Number(t.income) || 0,
    });
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const net = totalDebit - totalCredit;
  const arBalance = Math.max(0, net);
  const apBalance = Math.max(0, -net);

  const field = (v: string | null | undefined) => v || "—";

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href={`/partners/${pid}`} className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Харилцагч руу буцах
        </Link>
        <PrintButton />
      </div>

      {/* A4 баримт */}
      <div className="mx-auto max-w-[800px] bg-white p-8 text-[11pt] text-black print:p-0 [font-family:'Times_New_Roman',serif]">
        <div className="text-right text-[9pt] leading-snug">
          Сангийн сайдын 2017 оны 12 дугаар сарын 05 өдрийн
          <br />
          347 тоот тушаалын хавсралт
        </div>
        <div className="mt-1 text-[10pt] font-bold">НХМаягт ТМ-3</div>

        <div className="my-3 text-center">
          <h1 className="text-[14pt] font-bold uppercase tracking-wide">
            Тооцооны үлдэгдлийн баталгаа
            {actNo && <span className="ml-2">№ {actNo}</span>}
          </h1>
        </div>

        {/* Хоёр тал */}
        <div className="mb-3 flex gap-4">
          <div className="flex-1 border border-black p-2 text-[10pt] leading-relaxed">
            <div className="mb-1 border-b border-black pb-1 font-bold">Нэхэмжлэгч:</div>
            <div>Байгууллагын нэр:</div>
            <div className="text-[11pt] font-bold">{COMPANY.name}</div>
            <div>Хаяг: {field(COMPANY.address)}</div>
            <div>РД: {field(COMPANY.register)}</div>
            <div>Утас: {field(COMPANY.phone)}</div>
            <div>Э-Шуудан: {field(COMPANY.email)}</div>
            <div>Банк: {field(COMPANY.bank_name)}</div>
            <div>Дансны дугаар: {field(COMPANY.bank_account)}</div>
          </div>
          <div className="flex-1 border border-black p-2 text-[10pt] leading-relaxed">
            <div className="mb-1 border-b border-black pb-1 font-bold">Төлөгч:</div>
            <div>Байгууллагын нэр:</div>
            <div className="text-[11pt] font-bold">{partner.name}</div>
            <div>Хаяг: {field(partner.address)}</div>
            <div>РД: {field(partner.register)}</div>
            <div>Утас: {field(partner.phone)}</div>
            <div>Э-Шуудан: {field(partner.email)}</div>
            <div>Банк: &nbsp;</div>
            <div>Дансны дугаар: &nbsp;</div>
          </div>
        </div>

        {/* Биеийн текст */}
        <p className="mb-3 text-justify indent-6 text-[10pt] leading-relaxed">
          Хоёр байгууллагын хооронд{" "}
          <strong>
            {from || "____"} өдрөөс {to || "____"} өдрийг
          </strong>{" "}
          дуустал хугацаанд нягтлан бодох бүртгэлийн бичилтээр нэг бүрчлэн нийлж
          үзэхэд <strong>{partner.name}</strong>{" "}
          {arBalance > 0 ? (
            <>
              (<strong>{f2(arBalance)}₮</strong>)-ийн <strong>авлага</strong> үлдэгдэлтэй
            </>
          ) : apBalance > 0 ? (
            <>
              (<strong>{f2(apBalance)}₮</strong>)-ийн <strong>өглөг</strong> үлдэгдэлтэй
            </>
          ) : (
            <>тооцоо дүйцсэн</>
          )}{" "}
          гарсныг харилцан батлав.
        </p>

        {/* Гарын үсэг */}
        <div className="mb-4 flex gap-8 text-[10pt]">
          <div className="flex-1">
            <div className="font-bold">Нэхэмжлэгч байгууллагын нягтлан бодогч</div>
            <div className="mt-5 h-px w-48 border-b border-black" />
            <div>/{field(COMPANY.accountant)}/</div>
            <div className="text-[9.5pt] text-zinc-600">{COMPANY.name}</div>
          </div>
          <div className="flex-1">
            <div className="font-bold">Төлөгч байгууллагын нягтлан бодогч</div>
            <div className="mt-5 h-px w-48 border-b border-black" />
            <div>/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/</div>
            <div className="text-[9.5pt] text-zinc-600">{partner.name}</div>
          </div>
        </div>

        <div className="my-3 border-t-2 border-black" />

        {/* Гүйлгээний дэлгэрэнгүй */}
        <div className="mb-1 text-center text-[11pt] font-bold underline">
          Авлага өглөгийн дэлгэрэнгүй
        </div>
        <div className="mb-2 text-[10pt]">
          Харилцагч: <strong>{partner.name}</strong>
          {partner.register && (
            <>
              {" "}
              | РД: <strong>{partner.register}</strong>
            </>
          )}
          <br />
          Тайлант хугацаа: <strong>{from || "—"}</strong> — <strong>{to || "—"}</strong>
        </div>

        <table className="w-full border-collapse text-[9.5pt]">
          <thead>
            <tr>
              {["Огноо", "Лавлагаа №", "Гүйлгээний утга", "Дебит", "Кредит"].map((h) => (
                <th key={h} className="border border-black bg-[#1a1a2e] px-1.5 py-1 text-center font-bold text-white">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="border border-zinc-500 px-2 py-3 text-center text-zinc-500">
                  Гүйлгээ байхгүй
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className={i % 2 ? "bg-zinc-50" : ""}>
                  <td className="border border-zinc-500 px-1.5 py-1 text-center">{r.date}</td>
                  <td className="border border-zinc-500 px-1.5 py-1 text-center text-[8.5pt] text-zinc-500">{r.ref}</td>
                  <td className="border border-zinc-500 px-1.5 py-1">{r.desc}</td>
                  <td className="border border-zinc-500 px-1.5 py-1 text-right tabular-nums">
                    {r.debit ? f2(r.debit) : "—"}
                  </td>
                  <td className="border border-zinc-500 px-1.5 py-1 text-right tabular-nums">
                    {r.credit ? f2(r.credit) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-200 font-bold">
              <td colSpan={3} className="border border-black px-1.5 py-1 text-right">
                Нийт
              </td>
              <td className="border border-black px-1.5 py-1 text-right tabular-nums">{f2(totalDebit)}</td>
              <td className="border border-black px-1.5 py-1 text-right tabular-nums">{f2(totalCredit)}</td>
            </tr>
            <tr className="bg-zinc-200 font-bold">
              <td colSpan={3} className="border border-black px-1.5 py-1 text-right">
                Эцсийн үлдэгдэл
              </td>
              <td colSpan={2} className={`border border-black px-1.5 py-1 text-right tabular-nums ${net > 0 ? "text-red-700" : "text-green-700"}`}>
                {f2(Math.abs(net))} {net > 0 ? "(авлага)" : net < 0 ? "(өглөг)" : ""}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Хураангуй */}
        <div className="mt-3 border border-black p-3 text-[10pt]">
          <div className="flex justify-between border-b border-dotted border-zinc-300 py-0.5">
            <span>Авлагын үлдэгдэл</span>
            <span className={`font-bold ${arBalance > 0 ? "text-red-700" : ""}`}>{f2(arBalance)}₮</span>
          </div>
          <div className="flex justify-between border-b border-dotted border-zinc-300 py-0.5">
            <span>Өглөгийн үлдэгдэл</span>
            <span className={`font-bold ${apBalance > 0 ? "text-green-700" : ""}`}>{f2(apBalance)}₮</span>
          </div>
          <div className="flex justify-between py-0.5 text-[11pt] font-bold">
            <span>Харилцагчийн нийт үлдэгдэл</span>
            <span className={net > 0 ? "text-red-700" : net < 0 ? "text-green-700" : ""}>
              {f2(Math.abs(net))}₮ {net > 0 ? "(авлага)" : net < 0 ? "(өглөг)" : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
