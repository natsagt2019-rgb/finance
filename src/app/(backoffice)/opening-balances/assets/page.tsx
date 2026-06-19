import { createClient } from "@/lib/supabase/server";
import { OpeningTabs } from "../opening-tabs";
import { SyncButton } from "../sync-button";
import {
  OPENING_SOURCES,
  OPENING_YEARS,
  fmtMoney,
  grandOpeningBalance,
  openDateFor,
  resolveYear,
} from "../shared";
import { syncAssetOpening } from "./actions";
import { AssetsImport } from "./assets-import";

type SearchParams = { year?: string };

export default async function OpeningAssetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const year = resolveYear(sp.year);
  const openDate = openDateFor(year);

  const [{ data: assetRows }, { data: catRows }, { count: syncedCount }, balance] =
    await Promise.all([
      supabase
        .from("assets")
        .select("name, category_id, cost, opening_accum_depreciation")
        .eq("is_active", true)
        .eq("status", "active")
        .limit(10000),
      supabase
        .from("asset_categories")
        .select("id, name, account_code, accum_account_code")
        .limit(2000),
      supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("is_opening", true)
        .eq("txn_date", openDate)
        .eq("source", OPENING_SOURCES.assets),
      grandOpeningBalance(openDate),
    ]);

  const cats =
    (catRows as
      | {
          id: number;
          name: string;
          account_code: string | null;
          accum_account_code: string | null;
        }[]
      | null) ?? [];
  const catById = new Map(cats.map((c) => [c.id, c]));

  type Group = { name: string; account: string; count: number; cost: number; accum: number };
  const groups = new Map<number, Group>();
  let totCost = 0;
  let totAccum = 0;
  for (const a of (assetRows as
    | { name: string; category_id: number | null; cost: number; opening_accum_depreciation: number }[]
    | null) ?? []) {
    const c = a.category_id != null ? catById.get(a.category_id) : undefined;
    const key = a.category_id ?? -1;
    const g =
      groups.get(key) ??
      ({
        name: c?.name ?? "Ангилалгүй",
        account: c?.account_code ?? "—",
        count: 0,
        cost: 0,
        accum: 0,
      } as Group);
    g.count += 1;
    g.cost += Number(a.cost) || 0;
    g.accum += Number(a.opening_accum_depreciation) || 0;
    groups.set(key, g);
    totCost += Number(a.cost) || 0;
    totAccum += Number(a.opening_accum_depreciation) || 0;
  }
  const groupList = [...groups.values()].sort((a, b) =>
    a.account.localeCompare(b.account),
  );
  const hasData = groupList.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">
        Үндсэн хөрөнгийн эхний үлдэгдэл
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        «Үндсэн хөрөнгө» модулийн хөрөнгийн картаас (анхны өртөг + хуримтлагдсан
        элэгдэл) нээлтийн үлдэгдлийг тооцож, журналд тусгана.
      </p>

      <div className="mt-5">
        <OpeningTabs year={year} years={OPENING_YEARS} balance={balance} />
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-3">
        <AssetsImport />
      </div>

      {!hasData ? (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          Идэвхтэй үндсэн хөрөнгө олдсонгүй. «Үндсэн хөрөнгө» цэсэд карт бүртгэх,
          эсвэл дээрх «Excel загвар татах»-аар бөөнөөр оруулна уу.
        </div>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Ангилал</th>
                  <th className="px-3 py-2">Данс</th>
                  <th className="px-3 py-2 text-right">Тоо</th>
                  <th className="px-3 py-2 text-right">Өртөг (Дт)</th>
                  <th className="px-3 py-2 text-right">Хур. элэгдэл (Кт)</th>
                  <th className="px-3 py-2 text-right">Үлдэгдэл өртөг</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {groupList.map((g) => (
                  <tr key={g.account + g.name}>
                    <td className="px-3 py-1.5 text-zinc-700">{g.name}</td>
                    <td className="px-3 py-1.5 font-mono text-xs text-zinc-500">{g.account}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-zinc-500">{g.count}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-zinc-700">{fmtMoney(g.cost)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-zinc-700">{fmtMoney(g.accum)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium text-zinc-800">{fmtMoney(g.cost - g.accum)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold text-zinc-800">
                  <td className="px-3 py-2" colSpan={3}>НИЙТ</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(totCost)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(totAccum)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(totCost - totAccum)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4">
            <SyncButton
              action={syncAssetOpening.bind(null, year)}
              label="Журналд тусгах"
            />
            <p className="mt-2 text-xs text-zinc-400">
              {syncedCount
                ? `Одоо ${openDate} огноогоор журналд тусгасан байна. Дахин дарвал шинэчилнэ.`
                : `${openDate} огноогоор хараахан тусгаагүй.`}{" "}
              Өртөгийг хөрөнгийн данс руу Дт, хуримтлагдсан элэгдлийг контр данс руу
              Кт болгож бичнэ.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
