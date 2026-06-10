import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ItemForm } from "../../item-form";
import { ITEM_SELECT, type ItemRow } from "../../types";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("inv_items")
    .select(ITEM_SELECT)
    .eq("id", Number(id))
    .single();

  const item = data as ItemRow | null;
  if (!item) notFound();

  return (
    <div>
      <Link
        href="/inventory?tab=items"
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Бараа
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
        Бараа засах — {item.name}
      </h1>

      <div className="mt-6">
        <ItemForm mode="edit" item={item} />
      </div>
    </div>
  );
}
