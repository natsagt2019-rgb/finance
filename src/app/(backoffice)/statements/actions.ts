"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadRegistry } from "@/lib/bank-registry";
import { companyCode } from "@/lib/bank-importer/config";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

// Гүйлгээний харьцсан данс (Дт/Кт код) гараар засах.
export async function updateTxnAccounts(
  id: number,
  debitCode: string | null,
  creditCode: string | null,
): Promise<ActionResult> {
  const supabase = await requireAuth();
  const norm = (s: string | null) => {
    const v = (s ?? "").trim();
    return v === "" ? null : v;
  };
  const { error } = await supabase
    .from("transactions")
    .update({ debit_code: norm(debitCode), credit_code: norm(creditCode) })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/statements");
  return { ok: true };
}

// Гүйлгээ устгах.
export async function deleteTxn(id: number): Promise<ActionResult> {
  const supabase = await requireAuth();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/statements");
  return { ok: true };
}

// ── Автомат холболт: нөгөө тал GL дансыг автоматаар оноох ────────────────────
// Хоёр эх сурвалжтай зураглал ашиглана:
//   1) СУРСАН дүрэм — одоо байгаа кодлогдсон гүйлгээнээс (ангилал→данс).
//   2) СУУРЬ зураглал — category_gl_map хүснэгтээс (компани бүрээр), эхний
//      өдрөөс ажиллуулна. Сурсан дүрэм давамгайлж, байхгүй үед суурьд шилжинэ.
// Дараа нь кодгүй (дутуу) гүйлгээнд хэрэглэнэ. Зөвхөн хоосон талыг бөглөнө —
// гараар тавьсныг дарахгүй.
//   Орлого: Кт = ангиллын данс (Дт=банк авто).  Зарлага: Дт = ангиллын данс (Кт=банк авто).
export async function autoLinkAccounts(): Promise<{
  linked: number;
  skipped: number;
  rules: number;
  seeded: number;
}> {
  const supabase = await requireAuth();

  type Row = {
    id: number;
    account_id: string;
    income: number | null;
    expense: number | null;
    income_code: string | null;
    expense_code: string | null;
    debit_code: string | null;
    credit_code: string | null;
  };

  const PAGE = 1000;
  const all: Row[] = [];
  for (let offset = 0; offset < 500000; offset += PAGE) {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id, account_id, income, expense, income_code, expense_code, debit_code, credit_code",
      )
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data as Row[] | null) ?? [];
    all.push(...page);
    if (page.length < PAGE) break;
  }

  const empty = (s: string | null) => !s || !s.trim();
  // Банкны бүртгэл (нэг удаа) — GL код ба account_id → компани бүлгийн зураглал.
  const registry = await loadRegistry(supabase);
  // Банкны талын GL кодууд (харилцах данс). Offset (нөгөө тал) сурахдаа эдгээрийг
  // хасна (банкны тал тогтмол, сурах зүйл биш).
  const bankCodes = new Set(
    registry.map((a) => a.glCode).filter((c): c is string => !!c),
  );
  // account_id (дансны дугаар) → компани бүлгийн код (TT/TR) — суурь зураглалд.
  const companyByAccount = new Map<string, "TT" | "TR" | "HJ">(
    registry.map((a) => [a.accountNo, companyCode(a.company)]),
  );

  // 1) Сурах: ангиллын код → нөгөө тал данс (давамгайлсан).
  const learnExp = new Map<string, Map<string, number>>(); // expense_code → debit_code
  const learnInc = new Map<string, Map<string, number>>(); // income_code → credit_code
  const bump = (m: Map<string, Map<string, number>>, k: string, code: string) => {
    let g = m.get(k);
    if (!g) {
      g = new Map();
      m.set(k, g);
    }
    g.set(code, (g.get(code) ?? 0) + 1);
  };
  for (const r of all) {
    if (
      Number(r.expense) > 0 &&
      r.expense_code &&
      !empty(r.debit_code) &&
      !bankCodes.has(r.debit_code!)
    )
      bump(learnExp, r.expense_code, r.debit_code!);
    if (
      Number(r.income) > 0 &&
      r.income_code &&
      !empty(r.credit_code) &&
      !bankCodes.has(r.credit_code!)
    )
      bump(learnInc, r.income_code, r.credit_code!);
  }
  const majority = (g: Map<string, number>): string | null => {
    let best: string | null = null;
    let bn = 0;
    for (const [code, n] of g)
      if (n > bn) {
        bn = n;
        best = code;
      }
    return best;
  };
  const expMap = new Map<string, string>();
  for (const [k, g] of learnExp) {
    const m = majority(g);
    if (m) expMap.set(k, m);
  }
  const incMap = new Map<string, string>();
  for (const [k, g] of learnInc) {
    const m = majority(g);
    if (m) incMap.set(k, m);
  }

  // 1b) Суурь зураглал: category_gl_map (компани → ангилал → данс).
  // Сурсан дүрэм байхгүй үед эндээс авна (шинэ импорт эхний өдрөөс кодлогдоно).
  type MapRow = { company: string; category_code: string; gl_code: string };
  // Хүснэгт хараахан үүсээгүй бол (category-gl-map-schema.sql ажиллуулаагүй)
  // алдаа шидэхгүй — суурь зураглалгүйгээр (зөвхөн сурсан дүрмээр) үргэлжилнэ.
  const { data: mapData } = await supabase
    .from("category_gl_map")
    .select("company, category_code, gl_code");
  const seed = new Map<string, Map<string, string>>(); // company → (category_code → gl_code)
  for (const m of (mapData as MapRow[] | null) ?? []) {
    let g = seed.get(m.company);
    if (!g) {
      g = new Map();
      seed.set(m.company, g);
    }
    g.set(m.category_code, m.gl_code);
  }
  // Гүйлгээний account_id-аар компани бүлгийг олж суурь дансыг авна.
  const seedCode = (accountId: string, category: string | null): string | undefined => {
    if (!category) return undefined;
    const company = companyByAccount.get(accountId);
    return company ? seed.get(company)?.get(category) : undefined;
  };

  // 2) Хэрэглэх: дутуу талтай гүйлгээнд сурсан/суурь дансыг оноох.
  // Offset (нөгөө тал) холболт нь банкнаас үл хамаарна — гадаад валют (TTU/TTE)
  // зэрэг бүх дансанд ажиллана. (Журналд бичих нь bank registry-ээр тусдаа шүүгдэнэ.)
  const creditUpd = new Map<string, number[]>();
  const debitUpd = new Map<string, number[]>();
  let skipped = 0;
  let seeded = 0; // суурь зураглалаар (сурсан дүрэмгүйгээр) холбогдсон тоо
  for (const r of all) {
    if (Number(r.income) > 0 && empty(r.credit_code)) {
      const learned = r.income_code ? incMap.get(r.income_code) : undefined;
      const code = learned ?? seedCode(r.account_id, r.income_code);
      if (code) {
        (creditUpd.get(code) ?? creditUpd.set(code, []).get(code)!).push(r.id);
        if (!learned) seeded++;
      } else skipped++;
    } else if (Number(r.expense) > 0 && empty(r.debit_code)) {
      const learned = r.expense_code ? expMap.get(r.expense_code) : undefined;
      const code = learned ?? seedCode(r.account_id, r.expense_code);
      if (code) {
        (debitUpd.get(code) ?? debitUpd.set(code, []).get(code)!).push(r.id);
        if (!learned) seeded++;
      } else skipped++;
    } else skipped++;
  }

  let linked = 0;
  const CHUNK = 500;
  for (const [code, ids] of creditUpd) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { error } = await supabase
        .from("transactions")
        .update({ credit_code: code })
        .in("id", ids.slice(i, i + CHUNK));
      if (error) throw new Error(error.message);
    }
    linked += ids.length;
  }
  for (const [code, ids] of debitUpd) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { error } = await supabase
        .from("transactions")
        .update({ debit_code: code })
        .in("id", ids.slice(i, i + CHUNK));
      if (error) throw new Error(error.message);
    }
    linked += ids.length;
  }

  revalidatePath("/statements");
  return { linked, skipped, rules: expMap.size + incMap.size, seeded };
}

// Сонгосон гүйлгээнүүдийн Дт (зардлын данс)-ыг олноор оноох.
// Харилцагчгүй банкны шимтгэл зэргийг хурдан зардалд бичихэд.
export async function bulkSetDebitCode(
  ids: number[],
  code: string,
): Promise<ActionResult> {
  const supabase = await requireAuth();
  const c = (code ?? "").trim();
  if (!c) return { ok: false, error: "Зардлын данс сонгоно уу." };
  if (ids.length === 0) return { ok: false, error: "Гүйлгээ сонгоогүй байна." };

  const CHUNK = 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error } = await supabase
      .from("transactions")
      .update({ debit_code: c })
      .in("id", ids.slice(i, i + CHUNK));
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/statements");
  return { ok: true };
}
