"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadRegistry } from "@/lib/bank-registry";
import { companyCode } from "@/lib/bank-importer/config";
import { postJournal } from "@/lib/post-journal";
import type { LineInput } from "@/app/(backoffice)/journals/types";

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

// Гүйлгээний харьцсан данс (Дт/Кт код) ба харилцагчийн нэрийг гараар засах.
// counterparty дамжуулаагүй (undefined) бол харилцагчийг хэвээр үлдээнэ.
export async function updateTxnAccounts(
  id: number,
  debitCode: string | null,
  creditCode: string | null,
  counterparty?: string | null,
): Promise<ActionResult> {
  const supabase = await requireAuth();
  const norm = (s: string | null) => {
    const v = (s ?? "").trim();
    return v === "" ? null : v;
  };
  const patch: Record<string, string | null> = {
    debit_code: norm(debitCode),
    credit_code: norm(creditCode),
  };
  if (counterparty !== undefined) patch.counterparty = norm(counterparty);
  const { error } = await supabase
    .from("transactions")
    .update(patch)
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

// ── Нэг гүйлгээг олон мөрт (split) журнал болгох + и-баримт холбох ────────────
// Нэг банкны гүйлгээг олон харьцах данст (зардал + НӨАТ г.м.) задалж жинхэнэ
// журнал (journals + journal_lines + journal_entries толь) үүсгэнэ. transactions.
// journal_id-г тэмдэглэх тул postBankJournal (journal_id-тайг алгасдаг) давхар
// бичихгүй. Reference-т ДДТД тавибал и-баримт «холбогдсон» болно.
export type SplitLineInput = { code: string; amount: number; description?: string };

export async function createTxnSplitJournal(input: {
  txnId: number;
  lines: SplitLineInput[];
  reference?: string | null;
  partnerId?: number | null;
  description?: string | null;
}): Promise<
  { ok: true; journalId: number; number: string } | { ok: false; error: string }
> {
  const supabase = await requireAuth();
  const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

  const { data: txn } = await supabase
    .from("transactions")
    .select(
      "id, account_id, txn_date, description, counterparty, income, expense, exchange_rate, journal_id",
    )
    .eq("id", input.txnId)
    .single();
  if (!txn) return { ok: false, error: "Гүйлгээ олдсонгүй." };
  if ((txn as { journal_id: number | null }).journal_id != null)
    return { ok: false, error: "Энэ гүйлгээ аль хэдийн журналдсан байна." };

  const rate = Number(txn.exchange_rate) || 1;
  const income = Number(txn.income) || 0;
  const expense = Number(txn.expense) || 0;
  const dir: "in" | "out" = income > 0 ? "in" : "out";
  const total = r2((income || expense) * rate);
  if (total <= 0) return { ok: false, error: "Гүйлгээний дүн 0 байна." };

  const lines = input.lines
    .map((l) => ({
      code: (l.code || "").trim(),
      amount: r2(l.amount),
      description: (l.description ?? "").trim() || null,
    }))
    .filter((l) => l.code && l.amount > 0);
  if (lines.length === 0)
    return { ok: false, error: "Дор хаяж нэг мөр (данс + дүн) оруулна уу." };
  const linesSum = r2(lines.reduce((s, l) => s + l.amount, 0));
  if (Math.abs(linesSum - total) > 0.5)
    return {
      ok: false,
      error: `Мөрүүдийн нийлбэр (${linesSum.toLocaleString()}) гүйлгээний дүн (${total.toLocaleString()})-тэй тэнцэхгүй.`,
    };

  // Банкны GL данс — гүйлгээний account_id (дансны дугаар)-аар.
  const { data: ba } = await supabase
    .from("bank_accounts")
    .select("gl_code")
    .eq("account_no", txn.account_id)
    .maybeSingle();
  const bankGl = (ba as { gl_code: string | null } | null)?.gl_code;
  if (!bankGl)
    return { ok: false, error: "Энэ дансны банкны GL код тодорхойлогдсонгүй." };

  // Код → id.
  const codes = [...new Set([bankGl, ...lines.map((l) => l.code)])];
  const { data: accs } = await supabase
    .from("accounts")
    .select("id, code")
    .in("code", codes);
  const idOf = new Map(
    ((accs as { id: number; code: string }[] | null) ?? []).map((a) => [a.code, a.id]),
  );
  const bankId = idOf.get(bankGl);
  if (!bankId) return { ok: false, error: `Банкны данс ${bankGl} бүртгэлд алга.` };
  for (const l of lines)
    if (!idOf.get(l.code))
      return { ok: false, error: `Данс ${l.code} бүртгэлд алга.` };

  // Журналын мөрүүд: зарлага → харьцах тал Дт / банк Кт; орлого → эсрэгээр.
  const jl: LineInput[] = lines.map((l) => ({
    account_id: idOf.get(l.code)!,
    debit: dir === "out" ? l.amount : 0,
    credit: dir === "in" ? l.amount : 0,
    description: l.description ?? "",
  }));
  jl.push({
    account_id: bankId,
    debit: dir === "in" ? total : 0,
    credit: dir === "out" ? total : 0,
    description: "Банк",
  });

  // Харилцагч: өгсөн, эс бөгөөс counterparty нэрээр тааруулна.
  let partnerId = input.partnerId ?? null;
  if (partnerId == null && txn.counterparty) {
    const { data: p } = await supabase
      .from("partners")
      .select("id")
      .ilike("name", String(txn.counterparty).trim())
      .limit(1);
    partnerId = ((p as { id: number }[] | null) ?? [])[0]?.id ?? null;
  }

  const res = await postJournal(supabase, {
    date: String(txn.txn_date || "").slice(0, 10),
    description:
      (input.description ?? "").trim() ||
      (txn.description as string | null) ||
      "Банкны гүйлгээ (задаргаа)",
    reference: (input.reference ?? "").trim() || null,
    partner_id: partnerId,
    source: "manual",
    lines: jl,
  });
  if (!res.ok) return { ok: false, error: res.error };

  const { error: ue } = await supabase
    .from("transactions")
    .update({ journal_id: res.id })
    .eq("id", input.txnId);
  if (ue) {
    // journal_id тэмдэглэж чадаагүй бол шинэ журналыг буцаан устгана (давхардлаас сэргийлнэ).
    await supabase.from("journal_entries").delete().eq("journal_id", res.id);
    await supabase.from("journal_lines").delete().eq("journal_id", res.id);
    await supabase.from("journals").delete().eq("id", res.id);
    return { ok: false, error: `journal_id тэмдэглэхэд алдаа: ${ue.message}` };
  }

  revalidatePath("/statements");
  return { ok: true, journalId: res.id, number: res.number };
}
