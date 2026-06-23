import { createClient } from "@/lib/supabase/server";
import { TransferClient, type ItemOpt, type LocOpt } from "./transfer-client";

export const metadata = { title: "Дотоод шилжүүлэг" };

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

export default async function TransferPage() {
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });

  const [items, locations] = await Promise.all([
    fetchAll<ItemOpt>((f, t) => supabase.from("inv_items").select("id, sku, name, unit").eq("is_active", true).order("name").range(f, t)),
    fetchAll<LocOpt>((f, t) => supabase.from("inv_locations").select("id, name").eq("is_active", true).order("name").range(f, t)),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">⇄ Дотоод шилжүүлэг</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Барааг нэг агуулах/байршлаас нөгөөд шилжүүлнэ. Нийт үлдэгдэл, өртөг хэвээр — зөвхөн байршил өөрчлөгдөнө (журнал үүсэхгүй).
      </p>
      <div className="mt-5">
        <TransferClient items={items} locations={locations} today={today} />
      </div>
    </div>
  );
}
