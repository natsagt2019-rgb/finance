import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { MOVEMENT_SELECT, LOCATION_SELECT, type MovementRow, type LocationRow } from "../../assets/types";

export const metadata = { title: "Үндсэн хөрөнгө — хөдөлгөөний тайлан" };

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const PAGE = 1000; const rows: T[] = [];
  for (let off = 0; off < 200000; off += PAGE) {
    const { data, error } = await build(off, off + PAGE - 1);
    if (error) break;
    const page = (data as T[] | null) ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

type MovWithAsset = MovementRow & { assets?: { name: string; code: string | null } | null };

export default async function AssetsMovementsReport() {
  const supabase = await createClient();
  const [moves, locs] = await Promise.all([
    fetchAll<MovWithAsset>((f, t) =>
      supabase.from("asset_movements").select(`${MOVEMENT_SELECT}, assets(name, code)`).order("moved_date", { ascending: false }).order("id", { ascending: false }).range(f, t),
    ),
    fetchAll<LocationRow>((f, t) => supabase.from("asset_locations").select(LOCATION_SELECT).range(f, t)),
  ]);
  const locName = new Map(locs.map((l) => [l.id, l.name]));
  const loc = (id: number | null) => (id != null ? locName.get(id) ?? `#${id}` : "—");

  const custody = moves.filter((m) => m.move_type === "custody").length;
  const internal = moves.filter((m) => m.move_type === "internal").length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">🔀 Үндсэн хөрөнгө — хөдөлгөөний тайлан</h1>
          <p className="mt-1 text-sm text-zinc-500">Эзэмшил шилжүүлэх ба дотоод хөдөлгөөний түүх. Нийт {moves.length} (эзэмшил {custody}, дотоод {internal}).</p>
        </div>
        <PrintButton />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Огноо</th>
              <th className="px-3 py-2 text-left">Хөрөнгө</th>
              <th className="px-3 py-2 text-left">Төрөл</th>
              <th className="px-3 py-2 text-left">Эд хариуцагч</th>
              <th className="px-3 py-2 text-left">Байршил</th>
              <th className="px-3 py-2 text-left">Тэмдэглэл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {moves.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-zinc-400">Хөдөлгөөн бүртгэгдээгүй байна.</td></tr>
            ) : moves.map((m) => (
              <tr key={m.id} className="hover:bg-zinc-50">
                <td className="px-3 py-2 tabular-nums text-zinc-600">{m.moved_date}</td>
                <td className="px-3 py-2 text-zinc-700">{m.assets?.name ?? `#${m.asset_id}`}{m.assets?.code && <span className="ml-1 font-mono text-xs text-zinc-400">{m.assets.code}</span>}</td>
                <td className="px-3 py-2 text-zinc-500">{m.move_type === "custody" ? "Эзэмшил" : "Дотоод"}</td>
                <td className="px-3 py-2 text-zinc-700">{(m.from_responsible || "—") + " → " + (m.to_responsible || "—")}</td>
                <td className="px-3 py-2 text-zinc-700">{loc(m.from_location_id) + " → " + loc(m.to_location_id)}</td>
                <td className="px-3 py-2 text-zinc-400">{m.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
