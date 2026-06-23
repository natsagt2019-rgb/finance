import { createClient } from "@/lib/supabase/server";
import { ToAssetClient, type ItemOpt, type CatOpt } from "./to-asset-client";

export const metadata = { title: "Үндсэн хөрөнгө рүү шилжүүлэх" };

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

export default async function ToAssetPage() {
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });

  const [items, cats] = await Promise.all([
    fetchAll<ItemOpt>((f, t) => supabase.from("inv_items").select("id, sku, name, unit").eq("is_active", true).order("name").range(f, t)),
    fetchAll<CatOpt>((f, t) => supabase.from("asset_categories").select("id, name").eq("is_active", true).order("name").range(f, t)),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">🏗 Үндсэн хөрөнгө рүү шилжүүлэх</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Бараа материалыг үндсэн хөрөнгө болгоно. БМ FIFO өртгөөр зарлагдаж, тэр өртгөөр үндсэн хөрөнгийн карт үүснэ (Дт ҮХ данс / Кт БМ данс).
      </p>
      <div className="mt-5">
        <ToAssetClient items={items} categories={cats} today={today} />
      </div>
    </div>
  );
}
