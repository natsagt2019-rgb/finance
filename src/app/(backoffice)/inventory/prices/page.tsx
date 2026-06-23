import { createClient } from "@/lib/supabase/server";
import { PricesClient, type ItemOpt, type PartnerOpt, type PriceRow } from "./prices-client";

export const metadata = { title: "Барааны үнэ" };

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const PAGE = 1000;
  const rows: T[] = [];
  for (let offset = 0; offset < 500000; offset += PAGE) {
    const { data, error } = await build(offset, offset + PAGE - 1);
    if (error) break;
    const page = (data as T[] | null) ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

type RawPrice = {
  id: number; item_id: number; partner_id: number | null;
  sale_price: number; cost_price: number; valid_from: string;
};

export default async function PricesPage() {
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });

  const [items, partners, prices] = await Promise.all([
    fetchAll<ItemOpt>((f, t) => supabase.from("inv_items").select("id, sku, name, unit").eq("is_active", true).order("name").range(f, t)),
    fetchAll<PartnerOpt>((f, t) => supabase.from("partners").select("id, name").eq("is_active", true).order("name").range(f, t)),
    fetchAll<RawPrice>((f, t) => supabase.from("inv_prices").select("id, item_id, partner_id, sale_price, cost_price, valid_from").order("valid_from", { ascending: false }).order("id", { ascending: false }).range(f, t)),
  ]);

  const itemOf = new Map(items.map((i) => [i.id, i]));
  const partOf = new Map(partners.map((p) => [p.id, p.name]));
  const priceRows: PriceRow[] = prices.map((p) => ({
    ...p,
    item_name: (() => { const it = itemOf.get(p.item_id); return it ? `${it.sku ? it.sku + " " : ""}${it.name}` : `#${p.item_id}`; })(),
    partner_name: p.partner_id != null ? partOf.get(p.partner_id) ?? null : null,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">💲 Барааны үнэ</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Бараа бүрийн зарах/өртгийн үнэ. Харилцагч сонгвол тухайн харилцагчийн тусгай үнэ болно. Огноогоор түүх хадгалагдана.
      </p>
      <div className="mt-5">
        <PricesClient items={items} partners={partners} prices={priceRows} today={today} />
      </div>
    </div>
  );
}
