import { createClient } from "@/lib/supabase/server";
import {
  CATEGORY_CODES,
  INCOME_CODES,
  EXPENSE_CODES,
  COMPANIES,
} from "@/lib/bank-importer/config";
import { CategoryMapClient, type MapRow, type CatDef, type AccountOpt } from "./category-map-client";

export const metadata = { title: "Ангилал → данс зураглал — Тохиргоо" };

type SearchParams = { company?: string };

export default async function CategoryMapPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const company = COMPANIES.some((c) => c.code === sp.company)
    ? (sp.company as string)
    : "HJ";

  const supabase = await createClient();

  const [{ data: mapData }, { data: accData }] = await Promise.all([
    supabase
      .from("category_gl_map")
      .select("category_code, gl_code")
      .eq("company", company),
    supabase
      .from("accounts")
      .select("code, name")
      .eq("is_active", true)
      .order("code")
      .limit(5000),
  ]);

  const current = new Map<string, string>();
  for (const r of (mapData as { category_code: string; gl_code: string }[] | null) ?? []) {
    current.set(r.category_code, r.gl_code);
  }

  // Бүх ангиллыг (орлого → зарлага) дараалуулж, одоогийн дансыг хавсаргана.
  const defs: CatDef[] = [
    ...INCOME_CODES.map((c) => ({ code: c, side: "credit" as const })),
    ...EXPENSE_CODES.map((c) => ({ code: c, side: "debit" as const })),
  ].map((d) => ({
    ...d,
    label: CATEGORY_CODES[d.code] ?? d.code,
    glCode: current.get(d.code) ?? "",
  }));

  const rows: MapRow[] = defs;
  const accounts = (accData as AccountOpt[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Ангилал → данс зураглал
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          «Автомат холболт» энэ зураглалыг суурь дүрэм болгон ашиглана. AI
          ангилал гүйлгээнд ангиллын код (ж: 1.2.14) оноосны дараа, тухайн
          ангилалд харгалзах GL дансаар Дт/Кт талыг автоматаар бөглөнө. Гараар
          кодолсон жишээ байвал тэр давамгайлна. Компани бүрд тус тусдаа.
        </p>
      </div>

      <CategoryMapClient
        company={company}
        companies={COMPANIES}
        rows={rows}
        accounts={accounts}
      />
    </div>
  );
}
