import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { computeFifo, type MoveLite } from "@/lib/inventory-calc";
import { MoveForm } from "../../move-form";
import {
  ITEM_SELECT,
  MOVE_TYPES,
  type AccountOption,
  type ItemRow,
  type MoveType,
  type PartnerOption,
} from "../../types";

export default async function NewMovePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const initialType: MoveType = (MOVE_TYPES as readonly string[]).includes(type ?? "")
    ? (type as MoveType)
    : "receipt";

  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  });

  const [{ data: itemData }, { data: accData }, { data: partData }, { data: moveData }, { data: locData }] =
    await Promise.all([
      supabase
        .from("inv_items")
        .select(ITEM_SELECT)
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(5000),
      supabase
        .from("accounts")
        .select("id, code, name")
        .eq("is_active", true)
        .order("code", { ascending: true })
        .limit(3000),
      supabase
        .from("partners")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(3000),
      supabase
        .from("inv_moves")
        .select("id, date, type, qty, unit_cost, item_id")
        .limit(20000),
      supabase
        .from("inv_locations")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(2000),
    ]);

  const items = (itemData as ItemRow[] | null) ?? [];
  const accounts = (accData as AccountOption[] | null) ?? [];
  const partners = (partData as PartnerOption[] | null) ?? [];
  const locations = (locData as { id: number; name: string }[] | null) ?? [];

  // Бараа бүрийн одоогийн үлдэгдэл (форм дээр харуулна).
  const byItem = new Map<number, MoveLite[]>();
  for (const m of (moveData as (MoveLite & { item_id: number })[] | null) ?? []) {
    const arr = byItem.get(m.item_id) ?? [];
    arr.push({ id: m.id, date: m.date, type: m.type, qty: m.qty, unit_cost: m.unit_cost });
    byItem.set(m.item_id, arr);
  }
  const stock: Record<number, number> = {};
  for (const it of items) {
    stock[it.id] = computeFifo(byItem.get(it.id) ?? []).qtyRemaining;
  }

  return (
    <div>
      <Link
        href="/inventory?tab=moves"
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Хөдөлгөөн
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Шинэ хөдөлгөөн</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Орлого/зарлага/буцаалт/устгал бүртгэж, журнал автоматаар үүсгэнэ.
      </p>

      <div className="mt-6">
        <MoveForm
          initialType={initialType}
          items={items}
          accounts={accounts}
          partners={partners}
          locations={locations}
          stock={stock}
          today={today}
        />
      </div>
    </div>
  );
}
