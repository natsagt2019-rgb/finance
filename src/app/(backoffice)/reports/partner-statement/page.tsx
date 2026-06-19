import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { isPayableAccount, isReceivableAccount, normalizePartner } from "@/lib/receivables-calc";
import { EntryEditButton } from "./entry-edit";

// Тооцооны үлдэгдлийн тайлан — нэг харилцагчийн авлага/өглөгийн данс бүрээр
// гүйлгээ тус бүрийн гүйлгээт үлдэгдэл (эхний/дебет/кредит/эцсийн).
// Эх сурвалж: journal_entries. Сонгосон харилцагч + огнооны муж.

const ENTRY_LIMIT = 100000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function f2(n: number): string {
  if (Math.abs(n) < 0.005) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type AccRow = { code: string; name: string; type: string | null; fs_line: string | null; currency: string | null };
type Entry = {
  id: number;
  txn_date: string;
  description: string | null;
  amount: number;
  debit_code: string | null;
  credit_code: string | null;
  partner_name: string | null;
};

type Line = { id: number; date: string; desc: string; debit: number; credit: number; balance: number };
type AcctSection = {
  code: string;
  name: string;
  currency: string;
  isRecv: boolean;
  opening: number;
  lines: Line[];
  totalDebit: number;
  totalCredit: number;
  closing: number;
};

export default async function PartnerStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ partner?: string; from?: string; to?: string; account?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const partnerInput = (sp.partner ?? "").trim();
  const acctFilter = (sp.account ?? "").trim();
  const from = sp.from && ISO.test(sp.from) ? sp.from : "2026-01-01";
  const to = sp.to && ISO.test(sp.to) ? sp.to : "2026-12-31";

  // Харилцагчийн нэрсийн санал (datalist).
  const { data: pData } = await supabase
    .from("partners")
    .select("name")
    .eq("is_active", true)
    .order("name")
    .limit(2000);
  const partnerNames = ((pData as { name: string }[] | null) ?? []).map((p) => p.name);

  // Авлага/өглөгийн данс.
  const { data: accData } = await supabase
    .from("accounts")
    .select("code, name, type, fs_line, currency")
    .eq("is_active", true)
    .limit(5000);
  const accs = (accData as AccRow[] | null) ?? [];
  const recvSet = new Set<string>();
  const paySet = new Set<string>();
  const accInfo = new Map<string, { name: string; currency: string }>();
  for (const a of accs) {
    if (isReceivableAccount(a.name, a.type, a.fs_line)) recvSet.add(a.code);
    else if (isPayableAccount(a.name, a.type, a.fs_line)) paySet.add(a.code);
    accInfo.set(a.code, { name: a.name, currency: a.currency || "MNT" });
  }
  const allCodes = [...recvSet, ...paySet];

  const pKey = normalizePartner(partnerInput);
  // Коарс шүүлт: үг хооронд '%' тавьж том/жижиг үсэг, илүү зайг тэвчинэ
  // (жнь "НЭГДЭЛ ХХК" → "%НЭГДЭЛ%ХХК%"). Дараа нь JS-д нормчлолоор яг тулгана.
  const likePattern =
    "%" + pKey.replace(/[%_\\]/g, "\\$&").replace(/ /g, "%") + "%";
  let sections: AcctSection[] = [];

  if (partnerInput && allCodes.length > 0) {
    // Тухайн харилцагчийн авлага/өглөгийн данс хөндсөн бичилт (≤ to).
    const seen = new Set<number>();
    const entries: Entry[] = [];
    const [{ data: dr }, { data: cr }] = await Promise.all([
      supabase
        .from("journal_entries")
        .select("id, txn_date, description, amount, debit_code, credit_code, partner_name")
        .in("debit_code", allCodes)
        .lte("txn_date", to)
        .ilike("partner_name", likePattern)
        .limit(ENTRY_LIMIT),
      supabase
        .from("journal_entries")
        .select("id, txn_date, description, amount, debit_code, credit_code, partner_name")
        .in("credit_code", allCodes)
        .lte("txn_date", to)
        .ilike("partner_name", likePattern)
        .limit(ENTRY_LIMIT),
    ]);
    for (const e of [...((dr as Entry[] | null) ?? []), ...((cr as Entry[] | null) ?? [])]) {
      if (seen.has(e.id)) continue;
      // Коарс шүүлтийн илүүг нормчлолоор яг тулгаж хасна.
      if (normalizePartner(e.partner_name) !== pKey) continue;
      seen.add(e.id);
      entries.push(e);
    }

    // Данс бүрээр бүлэглэнэ.
    const byAcct = new Map<string, Entry[]>();
    for (const e of entries) {
      for (const code of [e.debit_code, e.credit_code]) {
        if (code && (recvSet.has(code) || paySet.has(code))) {
          const arr = byAcct.get(code) ?? [];
          arr.push(e);
          byAcct.set(code, arr);
        }
      }
    }

    for (const [code, list] of byAcct) {
      if (acctFilter && code !== acctFilter) continue;
      const isRecv = recvSet.has(code);
      // delta нь дансны нормал чиглэлд (авлага: Дт−Кт, өглөг: Кт−Дт).
      const norm = (e: Entry) => {
        const dr = e.debit_code === code ? Number(e.amount) || 0 : 0;
        const ct = e.credit_code === code ? Number(e.amount) || 0 : 0;
        return { dr, ct, delta: isRecv ? dr - ct : ct - dr };
      };
      let opening = 0;
      const inRange: Entry[] = [];
      for (const e of list) {
        const date = (e.txn_date || "").slice(0, 10);
        if (date < from) opening += norm(e).delta;
        else inRange.push(e);
      }
      inRange.sort((a, b) => (a.txn_date < b.txn_date ? -1 : a.txn_date > b.txn_date ? 1 : a.id - b.id));
      let bal = opening;
      let tDr = 0;
      let tCt = 0;
      const lines: Line[] = [];
      for (const e of inRange) {
        const { dr, ct, delta } = norm(e);
        bal += delta;
        tDr += dr;
        tCt += ct;
        lines.push({ id: e.id, date: (e.txn_date || "").slice(0, 10), desc: e.description || "", debit: dr, credit: ct, balance: bal });
      }
      const info = accInfo.get(code);
      // Хоосон (бүх нь 0) дансыг алгасна.
      if (Math.abs(opening) < 0.5 && lines.length === 0) continue;
      sections.push({
        code,
        name: info?.name ?? code,
        currency: info?.currency ?? "MNT",
        isRecv,
        opening,
        lines,
        totalDebit: tDr,
        totalCredit: tCt,
        closing: bal,
      });
    }
    sections.sort((a, b) => a.code.localeCompare(b.code));
  }

  const recvBal = sections.filter((s) => s.isRecv).reduce((s, x) => s + x.closing, 0);
  const payBal = sections.filter((s) => !s.isRecv).reduce((s, x) => s + x.closing, 0);
  const partnerBal = recvBal - payBal;

  // ── eBarimt (НӨАТ) баримт — тухайн харилцагчийнх (мэдээллийн, ледгерээс тусдаа) ──
  // vat_active = толгой/хаалтын давхардал хассан. Харилцагчийг partner_id эсвэл
  // partner_register-ээр тулгана. Огнооны мужид.
  type VatLine = { id: number; date: string; ddtd: string | null; net: number; vat: number; total: number };
  const ebarimtSales: VatLine[] = [];
  const ebarimtPurch: VatLine[] = [];
  if (partnerInput) {
    const { data: pRow } = await supabase
      .from("partners")
      .select("id, register")
      .ilike("name", partnerInput)
      .limit(1)
      .maybeSingle();
    const pid = (pRow as { id: number; register: string | null } | null)?.id ?? null;
    const preg = (pRow as { id: number; register: string | null } | null)?.register ?? null;
    // eBarimt-ийн partner_id/register нь ихэвчлэн тулгагдаагүй (нэр зөрүүтэй) тул
    // нэрний цөмөөр (компанийн төрлийн дагаврыг хасаж) бас тулгана.
    // NB: JS-ийн \b кирилл үсэгт ажилладаггүй тул үгээр салгаж шүүнэ.
    const SUFFIX = new Set(["ХХК", "ХК", "ТӨХК", "ХЗХ", "ББСБ", "ТББ", "ХОРШОО", "CO", "LTD", "LLC"]);
    const nameCore = partnerInput
      .replace(/["'(),.]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !SUFFIX.has(w.toUpperCase()))
      .join(" ")
      .trim();
    const ors: string[] = [];
    if (pid != null) ors.push(`partner_id.eq.${pid}`);
    if (preg) ors.push(`partner_register.eq.${preg}`);
    if (nameCore.length >= 3) ors.push(`partner_name.ilike.*${nameCore}*`);
    if (ors.length > 0) {
      const { data: vat } = await supabase
        .from("vat_active")
        .select("id, date, type, ddtd, amount, vat_amount, total_amount")
        .or(ors.join(","))
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: true })
        .limit(ENTRY_LIMIT);
      for (const v of (vat as {
        id: number; date: string; type: string; ddtd: string | null;
        amount: number; vat_amount: number; total_amount: number;
      }[] | null) ?? []) {
        const line: VatLine = {
          id: v.id,
          date: (v.date || "").slice(0, 10),
          ddtd: v.ddtd,
          net: Number(v.amount) || 0,
          vat: Number(v.vat_amount) || 0,
          total: Number(v.total_amount) || 0,
        };
        if (v.type === "out") ebarimtSales.push(line);
        else ebarimtPurch.push(line);
      }
    }
  }
  const salesTotal = ebarimtSales.reduce((s, l) => s + l.total, 0);
  const purchTotal = ebarimtPurch.reduce((s, l) => s + l.total, 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Тооцооны үлдэгдлийн тайлан</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Харилцагчийн авлага/өглөгийн данс бүрээр гүйлгээ тус бүрийн гүйлгээт үлдэгдэл.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Харилцагч
              <input
                type="text"
                name="partner"
                defaultValue={partnerInput}
                list="pstmt-partners"
                placeholder="нэр сонгох…"
                className="w-56 rounded-lg border border-zinc-300 px-2 py-2 text-sm"
              />
              <datalist id="pstmt-partners">
                {partnerNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Данс
              <input type="text" name="account" defaultValue={acctFilter} placeholder="бүгд" className="w-20 rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Эхлэх
              <input type="date" name="from" defaultValue={from} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Дуусах
              <input type="date" name="to" defaultValue={to} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            </label>
            <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
              Харах
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      {!partnerInput ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          Харилцагч сонгоно уу — дээрх талбарт нэрээ оруулаад “Харах” дарна.
        </div>
      ) : sections.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">
          “{partnerInput}” харилцагчийн {from} – {to} хооронд авлага/өглөгийн гүйлгээ олдсонгүй.
        </div>
      ) : (
        <>
          <div className="mt-4 text-center print:mt-0">
            <h2 className="text-lg font-bold text-zinc-900">{partnerInput}</h2>
            <p className="text-sm text-zinc-500">Тайлант хугацаа: {from} — {to}</p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 text-xs font-medium text-zinc-600">
                <tr>
                  <th className="w-10 px-3 py-2 text-left">№</th>
                  <th className="px-3 py-2 text-left">Огноо</th>
                  <th className="px-3 py-2 text-left">Гүйлгээний утга</th>
                  <th className="px-3 py-2 text-right">Эхний үлдэгдэл</th>
                  <th className="px-3 py-2 text-right">Дебет</th>
                  <th className="px-3 py-2 text-right">Кредит</th>
                  <th className="px-3 py-2 text-right">Эцсийн үлдэгдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sections.map((s) => (
                  <AccountSection
                    key={s.code}
                    s={s}
                    partner={partnerInput}
                    partnerNames={partnerNames}
                  />
                ))}
              </tbody>
              <tfoot className="text-sm">
                <tr className="border-t-2 border-zinc-400 bg-zinc-50 font-semibold">
                  <td colSpan={6} className="px-3 py-1.5 text-right text-blue-700">Авлагын үлдэгдэл:</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-blue-700">{f2(recvBal)}</td>
                </tr>
                <tr className="bg-zinc-50 font-semibold">
                  <td colSpan={6} className="px-3 py-1.5 text-right text-amber-700">Өглөгийн үлдэгдэл:</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-amber-700">{f2(payBal)}</td>
                </tr>
                <tr className="border-t border-zinc-300 bg-zinc-100 font-bold">
                  <td colSpan={6} className="px-3 py-2 text-right">
                    Харилцагчийн үлдэгдэл ({partnerBal >= 0 ? "авлага" : "өглөг"}):
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${partnerBal >= 0 ? "text-blue-800" : "text-amber-800"}`}>
                    {f2(Math.abs(partnerBal))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {(ebarimtSales.length > 0 || ebarimtPurch.length > 0) && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-700">
                eBarimt баримт{" "}
                <span className="font-normal text-zinc-400">
                  (мэдээллийн — дээрх ледгерийн үлдэгдэлд ороогүй)
                </span>
              </h3>
              <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <EbarimtPanel
                  title="Борлуулалт (out)"
                  badgeCls="bg-blue-100 text-blue-700"
                  lines={ebarimtSales}
                  total={salesTotal}
                />
                <EbarimtPanel
                  title="Худалдан авалт (in)"
                  badgeCls="bg-amber-100 text-amber-700"
                  lines={ebarimtPurch}
                  total={purchTotal}
                />
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-between gap-6 text-sm text-zinc-700 print:mt-12">
            <div>Тайлан гаргасан: __________________</div>
            <div>Ерөнхий нягтлан: __________________</div>
            <div>Захирал: __________________</div>
          </div>
        </>
      )}
    </div>
  );
}

function AccountSection({
  s,
  partner,
  partnerNames,
}: {
  s: AcctSection;
  partner: string;
  partnerNames: string[];
}) {
  const f = (n: number) => (Math.abs(n) < 0.005 ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  return (
    <>
      <tr className="bg-zinc-50">
        <td colSpan={3} className="px-3 py-1.5 text-sm font-semibold text-zinc-800">
          <span className="font-mono text-xs text-zinc-500">{s.code}</span> {s.name}
          <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-600">
            {s.isRecv ? "Авлага" : "Өглөг"}
          </span>
        </td>
        <td className="px-3 py-1.5 text-right tabular-nums text-zinc-500">{f(s.opening)}</td>
        <td colSpan={2} />
        <td className="px-3 py-1.5 text-right tabular-nums font-medium text-zinc-700">{f(s.closing)}</td>
      </tr>
      {s.lines.map((l, i) => (
        <tr key={i} className="hover:bg-zinc-50">
          <td className="px-3 py-1 text-zinc-400">{i + 1}</td>
          <td className="whitespace-nowrap px-3 py-1 text-zinc-500">{l.date}</td>
          <td className="max-w-[28rem] px-3 py-1 text-zinc-700">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate" title={l.desc}>{l.desc || "—"}</span>
              <EntryEditButton id={l.id} partnerName={partner} amount={l.debit || l.credit} partnerNames={partnerNames} />
            </div>
          </td>
          <td className="px-3 py-1" />
          <td className="px-3 py-1 text-right tabular-nums text-zinc-700">{f(l.debit)}</td>
          <td className="px-3 py-1 text-right tabular-nums text-zinc-700">{f(l.credit)}</td>
          <td className="px-3 py-1 text-right tabular-nums text-zinc-600">{f(l.balance)}</td>
        </tr>
      ))}
      <tr className="border-t border-zinc-200 bg-white font-semibold">
        <td colSpan={3} className="px-3 py-1.5 text-right text-zinc-500">Дансны дүн:</td>
        <td className="px-3 py-1.5 text-right tabular-nums text-zinc-400">{f(s.opening)}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{f(s.totalDebit)}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{f(s.totalCredit)}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{f(s.closing)}</td>
      </tr>
    </>
  );
}

// eBarimt баримтын панел (борлуулалт / худалдан авалт).
function EbarimtPanel({
  title,
  badgeCls,
  lines,
  total,
}: {
  title: string;
  badgeCls: string;
  lines: { id: number; date: string; ddtd: string | null; net: number; vat: number; total: number }[];
  total: number;
}) {
  const f = (n: number) => (Math.abs(n) < 0.005 ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 0 }));
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${badgeCls}`}>{title}</span>
        <span className="text-xs text-zinc-500">{lines.length} баримт</span>
      </div>
      {lines.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-zinc-400">Баримт алга.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-3 py-1.5 text-left">Огноо</th>
                <th className="px-3 py-1.5 text-left">ДДТД</th>
                <th className="px-3 py-1.5 text-right">НӨАТ-гүй</th>
                <th className="px-3 py-1.5 text-right">НӨАТ</th>
                <th className="px-3 py-1.5 text-right">Нийт</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {lines.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-50">
                  <td className="whitespace-nowrap px-3 py-1 text-zinc-500">{l.date}</td>
                  <td className="max-w-[10rem] truncate px-3 py-1 font-mono text-xs text-zinc-400" title={l.ddtd ?? ""}>
                    {l.ddtd ?? "—"}
                  </td>
                  <td className="px-3 py-1 text-right tabular-nums text-zinc-600">{f(l.net)}</td>
                  <td className="px-3 py-1 text-right tabular-nums text-blue-600">{f(l.vat)}</td>
                  <td className="px-3 py-1 text-right tabular-nums font-medium text-zinc-700">{f(l.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-zinc-200 bg-zinc-50 font-semibold">
              <tr>
                <td colSpan={4} className="px-3 py-1.5 text-right text-zinc-500">Нийт:</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{f(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
