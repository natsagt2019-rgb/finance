import { createClient } from "@/lib/supabase/server";
import { RecipesClient, type ItemOpt, type RecipeLine } from "./recipes-client";

export const metadata = { title: "Хөрвүүлэлт (орц)" };

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

export default async function RecipesPage() {
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });

  const [items, recipes] = await Promise.all([
    fetchAll<ItemOpt>((f, t) => supabase.from("inv_items").select("id, sku, name, unit").eq("is_active", true).order("name").range(f, t)),
    fetchAll<RecipeLine>((f, t) => supabase.from("inv_recipes").select("id, product_item_id, component_item_id, qty").range(f, t)),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">⚗ Хөрвүүлэлт (орц)</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Бүтээгдэхүүний орц (BOM) тодорхойлж, түүхий эдээс бүтээгдэхүүн гаргана. Түүхий эд FIFO-оор зарлагдаж, бүтээгдэхүүн нийт өртгөөр орлогод авагдана.
      </p>
      <div className="mt-5">
        <RecipesClient items={items} recipes={recipes} today={today} />
      </div>
    </div>
  );
}
