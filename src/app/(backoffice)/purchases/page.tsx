import { createClient } from "@/lib/supabase/server";
import { PurchaseForm, type AccOpt } from "./purchase-form";
import { DeletePurchaseButton } from "./row-actions";

type PurRow = {
  id: number;
  pur_date: string;
  doc_no: string | null;
  partner_name: string | null;
  description: string | null;
  expense_code: string | null;
  net_amount: number;
  vat_amount: number;
  total_amount: number;
};

function fmt(n: number | null): string {
  if (!n) return "—";
  return Math.round(Number(n)).toLocaleString("en-US");
}

export default async function PurchasesPage() {
  const supabase = await createClient();

  // Дт-д тохирох данс: зардал/бараа/ҮХ (зарим хөрөнгө).
  const { data: accData } = await supabase
    .from("accounts")
    .select("code, name, type")
    .eq("is_active", true)
    .in("type", ["expense", "asset"])
    .order("code")
    .limit(5000);
  const accounts: AccOpt[] = ((accData as { code: string; name: string }[] | null) ?? []).map((a) => ({
    code: a.code,
    name: a.name,
  }));
  const accName = new Map(accounts.map((a) => [a.code, a.name]));

  const { data: purData } = await supabase
    .from("purchases")
    .select("id, pur_date, doc_no, partner_name, description, expense_code, net_amount, vat_amount, total_amount")
    .eq("is_active", true)
    .order("pur_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(500);
  const purchases = (purData as PurRow[] | null) ?? [];

  const totNet = purchases.reduce((s, p) => s + Number(p.net_amount), 0);
  const totVat = purchases.reduce((s, p) => s + Number(p.vat_amount), 0);
  const totAll = purchases.reduce((s, p) => s + Number(p.total_amount), 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Худалдан авалт</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Бараа/зардал худалдан авалт → НӨАТ суутгал → нийлүүлэгчийн өглөг. Журналд автомат бичигдэнэ.
      </p>

      <div className="mt-6">
        <PurchaseForm accounts={accounts} />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">Нийт (НӨАТ-гүй)</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{fmt(totNet)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">НӨАТ суутгал</div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-amber-700">{fmt(totVat)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">Нийт өглөг</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{fmt(totAll)}</div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left">Огноо</th>
              <th className="px-4 py-2 text-left">Баримт</th>
              <th className="px-4 py-2 text-left">Нийлүүлэгч</th>
              <th className="px-4 py-2 text-left">Данс</th>
              <th className="px-4 py-2 text-right">Цэвэр</th>
              <th className="px-4 py-2 text-right">НӨАТ</th>
              <th className="px-4 py-2 text-right">Нийт</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50">
                <td className="whitespace-nowrap px-4 py-1.5 text-zinc-600">{String(p.pur_date).slice(0, 10)}</td>
                <td className="px-4 py-1.5 text-zinc-500">{p.doc_no}</td>
                <td className="px-4 py-1.5 text-zinc-700">{p.partner_name}</td>
                <td className="px-4 py-1.5 text-zinc-600">
                  <span className="font-mono text-xs text-zinc-400">{p.expense_code}</span>{" "}
                  {accName.get(p.expense_code ?? "") ?? ""}
                </td>
                <td className="px-4 py-1.5 text-right tabular-nums">{fmt(p.net_amount)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums text-amber-700">{fmt(p.vat_amount)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums font-medium">{fmt(p.total_amount)}</td>
                <td className="px-4 py-1.5 text-right">
                  <DeletePurchaseButton id={p.id} />
                </td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-zinc-400">
                  Худалдан авалт бүртгээгүй байна. Дээрх формоор нэмнэ үү.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
