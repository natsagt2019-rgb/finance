import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { loadCompany } from "@/lib/company";
import { PrintButton } from "@/components/print-button";
import { isReceivableAccount, isPayableAccount } from "@/lib/receivables-calc";

// НХМаягт ТМ-3 — Тооцооны үлдэгдлийн баталгаа (хуучин reconcile_act.html).
// Дебит = нэхэмжлэл (авлага үүсэх), Кредит = банкны орлого (төлбөр).
// Цэвэр = Дебит − Кредит: + авлага, − өглөг.

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
  const company = await loadCompany();
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

  // Тооцооны данс (авлага/өглөг) — /receivables, /payables тайлантай ижил дүрэм.
  const { data: accData } = await supabase
    .from("accounts")
    .select("code, name, type, fs_line")
    .eq("is_active", true)
    .limit(NUM_LIMIT);
  const settlement = new Set(
    (
      (accData as
        | { code: string; name: string | null; type: string | null; fs_line: string | null }[]
        | null) ?? []
    )
      .filter(
        (a) =>
          // НӨАТ (оролт/гарц) нь худалдааны бичилт дотор цэвэршдэг тул партнерийн
          // тооцооны данс биш — 130600/330100-ыг хасна (эс бөгөөс өглөг/авлага гажина).
          !`${a.name ?? ""}`.toLowerCase().includes("нөат") &&
          (isReceivableAccount(a.name, a.type, a.fs_line) ||
            isPayableAccount(a.name, a.type, a.fs_line)),
      )
      .map((a) => a.code),
  );

  // Гүйлгээ = нягтлан бодох бүртгэлийн бичилт (journal_entries) — харилцагчийн
  // нэр (+alias)-аар, тооцооны данс оролцсон бичилтүүд. Тооцооны данс Дт талд
  // бол авлага (дебит), Кт талд бол өглөг (кредит).
  const names = [partner.name, ...aliases].filter((n): n is string => !!n);
  type JE = {
    txn_date: string;
    description: string | null;
    amount: number;
    debit_code: string | null;
    credit_code: string | null;
  };
  const je: JE[] = [];
  if (names.length) {
    for (let offset = 0; ; offset += 1000) {
      let q = supabase
        .from("journal_entries")
        .select("txn_date, description, amount, debit_code, credit_code")
        .in("partner_name", names);
      if (from) q = q.gte("txn_date", from);
      if (to) q = q.lte("txn_date", to);
      const { data } = await q.range(offset, offset + 999);
      const page = (data as JE[] | null) ?? [];
      je.push(...page);
      if (page.length < 1000) break;
    }
  }

  const rows: Row[] = [];
  for (const e of je) {
    const amt = Number(e.amount) || 0;
    if (amt === 0) continue;
    const dr = !!e.debit_code && settlement.has(e.debit_code);
    const cr = !!e.credit_code && settlement.has(e.credit_code);
    if (!dr && !cr) continue; // тооцооны данс оролцоогүй бичилт — актад ордоггүй
    rows.push({
      date: (e.txn_date || "").slice(0, 10),
      ref: "",
      desc: e.description || `Бичилт — ${partner.name}`,
      debit: dr ? amt : 0,
      credit: dr ? 0 : amt,
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
            <div className="text-[11pt] font-bold">{company.name}</div>
            <div>Хаяг: {field(company.address)}</div>
            <div>РД: {field(company.register)}</div>
            <div>Утас: {field(company.phone)}</div>
            <div>Э-Шуудан: {field(company.email)}</div>
            <div>Банк: {field(company.bankName)}</div>
            <div>Дансны дугаар: {field(company.bankAccount)}</div>
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
            <div>/{field(company.accountant)}/</div>
            <div className="text-[9.5pt] text-zinc-600">{company.name}</div>
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
