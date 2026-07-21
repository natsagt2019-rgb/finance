"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { postJournal } from "@/lib/post-journal";
import { SETTINGS_SELECT, type InvSettings } from "../types";

export type LandedLineInput = {
  itemId: number;
  categoryCode: string;
  qty: number;
  landedUnit: number; // ₮ нэгж landed өртөг
  landed: number; // ₮ нийт landed (= qty × landedUnit)
};

export type LandedPostInput = {
  date: string;
  docNo: string;
  supplier: string | null;
  company: string | null;
  bankAccountId: number; // импортын НӨАТ + дугуйралт төлсөн данс (банк/касс)
  fobMnt: number; // FOB нийт (₮) → нийлүүлэгчийн өглөг
  importVat: number; // импортын НӨАТ (нөхөгдөх)
  // Нэмэлт зардал тус бүр + эх данс (банк/касс эсвэл УТЗ 140200 / УТТ 140300).
  duty: number;
  freight: number;
  storage: number;
  dutyAccountId: number | null;
  freightAccountId: number | null;
  storageAccountId: number | null;
  lines: LandedLineInput[];
};

export type LandedPostResult =
  | { ok: true; docNo: string; inserted: number; journalId: number }
  | { ok: false; error: string };

function r2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Гаалийн импортыг landed-cost-оор орлогод авна:
//   • Бараа бүрт receipt хөдөлгөөн (landed нэгж өртгөөр)
//   • Нэг гаалийн ваучер: Дт инв данс (ангиллаар) + Дт 130600 НӨАТ авлага /
//     Кт 310100 өглөг (FOB) + Кт банк (татвар+тээвэр+хадгалалт+импортын НӨАТ)
export async function postLandedImport(input: LandedPostInput): Promise<LandedPostResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нэвтрэх шаардлагатай." };

  if (!ISO.test(input.date)) return { ok: false, error: "Огноо буруу." };
  const lines = (input.lines ?? []).filter((l) => l.itemId > 0 && l.qty > 0 && l.landed > 0);
  if (lines.length === 0) return { ok: false, error: "Орлогод авах мөр алга." };
  if (!(input.bankAccountId > 0)) return { ok: false, error: "Төлбөрийн данс (банк/касс) сонгоно уу." };

  const docNo = input.docNo.trim() || `ГААЛЬ-${input.date.replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;

  // ── Тохиргоо: ангилал → инв данс id, нийлүүлэгчийн өглөг ──
  const { data: setData } = await supabase
    .from("inv_settings")
    .select(SETTINGS_SELECT)
    .eq("id", 1)
    .maybeSingle();
  const settings = (setData as InvSettings | null) ?? null;
  const rawCat = (settings?.category_accounts as Record<string, number | string | null>) ?? {};
  const catInv: Record<string, number | null> = {};
  for (const [code, v] of Object.entries(rawCat)) catInv[code] = v != null && v !== "" ? Number(v) : null;
  const apId = settings?.ap_account_id ?? null;
  if (apId == null) return { ok: false, error: "Нийлүүлэгчийн өглөгийн данс тохируулаагүй (БМ тохиргоо)." };

  // НӨАТ-ын авлагын данс (импортын НӨАТ) — кодоор.
  const { data: vatAcc } = await supabase
    .from("accounts")
    .select("id")
    .eq("code", "130600")
    .maybeSingle();
  const vatInId = (vatAcc as { id: number } | null)?.id ?? null;

  // ── Журналын мөрүүд ──
  const invByCat = new Map<string, number>();
  for (const l of lines) invByCat.set(l.categoryCode, r2((invByCat.get(l.categoryCode) ?? 0) + l.landed));
  const jLines: { account_id: number; debit: number; credit: number; description: string }[] = [];
  for (const [cat, val] of invByCat) {
    const invId = catInv[cat];
    if (invId == null)
      return { ok: false, error: `«${cat}» ангиллын бараа материалын данс тохируулаагүй (БМ тохиргоо).` };
    jLines.push({ account_id: invId, debit: val, credit: 0, description: `Гаалийн импорт — ${cat}` });
  }
  const landedTotal = r2(lines.reduce((s, l) => s + l.landed, 0));
  const importVat = r2(input.importVat);
  const fobMnt = r2(input.fobMnt);
  if (importVat > 0 && vatInId != null)
    jLines.push({ account_id: vatInId, debit: importVat, credit: 0, description: "Импортын НӨАТ (нөхөгдөх)" });
  jLines.push({ account_id: apId, debit: 0, credit: fobMnt, description: "Нийлүүлэгчийн өглөг (FOB)" });

  // Нэмэлт зардал бүрийг эх данс руу кредитлэнэ (банк/касс эсвэл УТЗ/УТТ).
  // Эх данс заагаагүй бол төлбөрийн данс (банк) руу буцаана.
  const duty = r2(input.duty);
  const freight = r2(input.freight);
  const storage = r2(input.storage);
  const acctOr = (id: number | null | undefined) => (id && id > 0 ? id : input.bankAccountId);
  if (duty > 0) jLines.push({ account_id: acctOr(input.dutyAccountId), debit: 0, credit: duty, description: "Гаалийн албан татвар" });
  if (freight > 0) jLines.push({ account_id: acctOr(input.freightAccountId), debit: 0, credit: freight, description: "Тээврийн зардал" });
  if (storage > 0) jLines.push({ account_id: acctOr(input.storageAccountId), debit: 0, credit: storage, description: "Хадгалалтын зардал" });

  // Импортын НӨАТ + landed дугуйралтын зөрүүг төлбөрийн данс (банк) шингээнэ.
  const residual = r2(landedTotal - r2(fobMnt + duty + freight + storage));
  const bankCredit = r2((vatInId != null ? importVat : 0) + residual);
  if (Math.abs(bankCredit) > 0.005)
    jLines.push({ account_id: input.bankAccountId, debit: 0, credit: bankCredit, description: "Импортын НӨАТ + дугуйралт" });

  const totDt = r2(jLines.reduce((s, l) => s + l.debit, 0));
  const totKt = r2(jLines.reduce((s, l) => s + l.credit, 0));
  if (Math.abs(totDt - totKt) > 0.5)
    return { ok: false, error: `Журнал балансжихгүй байна (Дт ${totDt} ≠ Кт ${totKt}).` };

  // ── 1) Receipt хөдөлгөөнүүд ──
  const moveIds: number[] = [];
  for (const l of lines) {
    const { data: mv, error } = await supabase
      .from("inv_moves")
      .insert({
        date: input.date,
        type: "receipt",
        item_id: l.itemId,
        qty: l.qty,
        unit_cost: r2(l.landedUnit),
        total_cost: r2(l.landed),
        vat_amount: 0,
        doc_no: docNo,
        company: input.company,
        note: input.supplier ? `Гаалийн импорт — ${input.supplier}` : "Гаалийн импорт",
      })
      .select("id")
      .single();
    if (error) {
      // Урьдын мөрүүдийг буцааж устгана (атомик байдал).
      if (moveIds.length) await supabase.from("inv_moves").delete().in("id", moveIds);
      return { ok: false, error: `Хадгалахад алдаа: ${error.message}` };
    }
    moveIds.push(mv.id as number);
  }

  // ── 2) Нэг гаалийн ваучер ──
  const posted = await postJournal(supabase, {
    date: input.date,
    description: `Гаалийн импорт landed-cost${input.supplier ? ` — ${input.supplier}` : ""}`,
    reference: docNo,
    partner_id: null,
    source: "inventory",
    lines: jLines,
  });
  if (!posted.ok) {
    await supabase.from("inv_moves").delete().in("id", moveIds);
    return { ok: false, error: `Журнал: ${posted.error}` };
  }
  await supabase.from("inv_moves").update({ journal_id: posted.id }).in("id", moveIds);

  revalidatePath("/inventory");
  revalidatePath("/journals");
  return { ok: true, docNo, inserted: moveIds.length, journalId: posted.id };
}

// ── Гаалийн импорт → ҮНДСЭН ХӨРӨНГӨ (landed-cost) ─────────────────────────
export type LandedAssetLineInput = {
  name: string; // хөрөнгийн нэр
  categoryId: number; // asset_categories.id
  qty: number; // ширхэг (тус бүрд тусдаа карт)
  landedUnit: number; // ₮ нэгж (ширхэг) landed өртөг
  landed: number; // ₮ нийт landed (= qty × landedUnit)
};

export type LandedAssetPostInput = Omit<LandedPostInput, "lines"> & {
  lines: LandedAssetLineInput[];
};

export type LandedAssetPostResult =
  | { ok: true; docNo: string; assets: number; journalId: number }
  | { ok: false; error: string };

// Импортоор худалдан авсан үндсэн хөрөнгийг landed-cost-оор орлогод авна:
//   • Ширхэг бүрт assets карт (landed нэгж өртгөөр)
//   • Нэг гаалийн ваучер: Дт хөрөнгийн данс (ангиллаар) + Дт 130600 НӨАТ /
//     Кт 310100 өглөг (FOB) + Кт банк/гааль (татвар+тээвэр+хадгалалт+импортын НӨАТ)
export async function postLandedAssetImport(
  input: LandedAssetPostInput,
): Promise<LandedAssetPostResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нэвтрэх шаардлагатай." };

  if (!ISO.test(input.date)) return { ok: false, error: "Огноо буруу." };
  const lines = (input.lines ?? []).filter(
    (l) => l.categoryId > 0 && l.qty > 0 && l.landed > 0 && (l.name ?? "").trim(),
  );
  if (lines.length === 0) return { ok: false, error: "Орлогод авах мөр алга (нэр/ангилал/тоо/өртөг)." };
  if (!(input.bankAccountId > 0)) return { ok: false, error: "Төлбөрийн данс (банк/касс) сонгоно уу." };

  const docNo =
    input.docNo.trim() ||
    `ГААЛЬ-ҮХ-${input.date.replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;

  // ── Ангилал → хөрөнгийн данс код, ашиглалтын хугацаа ──
  const catIds = [...new Set(lines.map((l) => l.categoryId))];
  const { data: catData } = await supabase
    .from("asset_categories")
    .select("id, name, account_code, useful_life_years")
    .in("id", catIds);
  const cats = new Map(
    ((catData as { id: number; name: string; account_code: string | null; useful_life_years: number | null }[] | null) ?? []).map(
      (c) => [c.id, c],
    ),
  );
  for (const id of catIds) {
    const c = cats.get(id);
    if (!c) return { ok: false, error: `Ангилал (id ${id}) олдсонгүй.` };
    if (!c.account_code) return { ok: false, error: `«${c.name}» ангиллын хөрөнгийн данс тохируулаагүй.` };
  }

  // ── Нийлүүлэгчийн өглөг ба НӨАТ-ын авлагын данс ──
  const { data: setData } = await supabase
    .from("inv_settings")
    .select(SETTINGS_SELECT)
    .eq("id", 1)
    .maybeSingle();
  const settings = (setData as InvSettings | null) ?? null;
  const apId = settings?.ap_account_id ?? null;
  if (apId == null) return { ok: false, error: "Нийлүүлэгчийн өглөгийн данс тохируулаагүй (БМ тохиргоо)." };

  // Дансны код → id (хөрөнгийн данс + НӨАТ авлага).
  const wantCodes = [
    ...new Set([
      ...[...cats.values()].map((c) => c.account_code!),
      "130600",
    ]),
  ];
  const { data: accRows } = await supabase
    .from("accounts")
    .select("id, code")
    .in("code", wantCodes);
  const idByCode = new Map(
    ((accRows as { id: number; code: string }[] | null) ?? []).map((a) => [a.code, a.id]),
  );
  const vatInId = idByCode.get("130600") ?? null;

  // ── Журналын мөрүүд ── (өртгийн тал — ангиллаар нэгтгэсэн хөрөнгийн данс)
  const assetByCode = new Map<string, number>();
  for (const l of lines) {
    const code = cats.get(l.categoryId)!.account_code!;
    assetByCode.set(code, r2((assetByCode.get(code) ?? 0) + l.landed));
  }
  const jLines: { account_id: number; debit: number; credit: number; description: string }[] = [];
  for (const [code, val] of assetByCode) {
    const aid = idByCode.get(code);
    if (aid == null) return { ok: false, error: `Хөрөнгийн данс ${code} бүртгэлд олдсонгүй.` };
    jLines.push({ account_id: aid, debit: val, credit: 0, description: `Гаалийн импорт ҮХ — ${code}` });
  }
  const landedTotal = r2(lines.reduce((s, l) => s + l.landed, 0));
  const importVat = r2(input.importVat);
  const fobMnt = r2(input.fobMnt);
  if (importVat > 0 && vatInId != null)
    jLines.push({ account_id: vatInId, debit: importVat, credit: 0, description: "Импортын НӨАТ (нөхөгдөх)" });
  jLines.push({ account_id: apId, debit: 0, credit: fobMnt, description: "Нийлүүлэгчийн өглөг (FOB)" });

  const duty = r2(input.duty);
  const freight = r2(input.freight);
  const storage = r2(input.storage);
  const acctOr = (id: number | null | undefined) => (id && id > 0 ? id : input.bankAccountId);
  if (duty > 0) jLines.push({ account_id: acctOr(input.dutyAccountId), debit: 0, credit: duty, description: "Гаалийн албан татвар" });
  if (freight > 0) jLines.push({ account_id: acctOr(input.freightAccountId), debit: 0, credit: freight, description: "Тээврийн зардал" });
  if (storage > 0) jLines.push({ account_id: acctOr(input.storageAccountId), debit: 0, credit: storage, description: "Хадгалалтын зардал" });

  const residual = r2(landedTotal - r2(fobMnt + duty + freight + storage));
  const bankCredit = r2((vatInId != null ? importVat : 0) + residual);
  if (Math.abs(bankCredit) > 0.005)
    jLines.push({ account_id: input.bankAccountId, debit: 0, credit: bankCredit, description: "Импортын НӨАТ + дугуйралт" });

  const totDt = r2(jLines.reduce((s, l) => s + l.debit, 0));
  const totKt = r2(jLines.reduce((s, l) => s + l.credit, 0));
  if (Math.abs(totDt - totKt) > 0.5)
    return { ok: false, error: `Журнал балансжихгүй байна (Дт ${totDt} ≠ Кт ${totKt}).` };

  // ── 1) Хөрөнгийн картууд (ширхэг бүрд нэг) ──
  const assetRows: Record<string, unknown>[] = [];
  for (const l of lines) {
    const c = cats.get(l.categoryId)!;
    const nm = l.name.trim();
    const n = Math.max(1, Math.round(l.qty));
    for (let i = 0; i < n; i++) {
      assetRows.push({
        name: n > 1 ? `${nm} #${i + 1}` : nm,
        category_id: l.categoryId,
        acquired_date: input.date,
        cost: r2(l.landedUnit),
        opening_accum_depreciation: 0,
        useful_life_years: c.useful_life_years ?? null,
        salvage_value: 0,
        status: "active",
        is_active: true,
      });
    }
  }
  const { data: insAssets, error: aErr } = await supabase
    .from("assets")
    .insert(assetRows)
    .select("id");
  if (aErr) return { ok: false, error: `Хөрөнгө хадгалахад алдаа: ${aErr.message}` };
  const assetIds = ((insAssets as { id: number }[] | null) ?? []).map((a) => a.id);

  // ── 2) Нэг гаалийн ваучер ──
  const posted = await postJournal(supabase, {
    date: input.date,
    description: `Гаалийн импорт ҮХ landed-cost${input.supplier ? ` — ${input.supplier}` : ""}`,
    reference: docNo,
    partner_id: null,
    source: "asset",
    lines: jLines,
  });
  if (!posted.ok) {
    if (assetIds.length) await supabase.from("assets").delete().in("id", assetIds);
    return { ok: false, error: `Журнал: ${posted.error}` };
  }

  revalidatePath("/assets");
  revalidatePath("/journals");
  return { ok: true, docNo, assets: assetIds.length, journalId: posted.id };
}

// Дансны одоогийн үлдэгдлийг (journal_entries Дт−Кт) буцаана — нэмэлт зардлыг
// УТЗ/УТТ зэрэг дансны бодит үлдэгдлээс татаж оруулахад ашиглана.
export type AccountBalanceResult =
  | { ok: true; balance: number; code: string; name: string }
  | { ok: false; error: string };

export async function getAccountBalance(accountId: number): Promise<AccountBalanceResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нэвтрэх шаардлагатай." };
  if (!(accountId > 0)) return { ok: false, error: "Данс сонгоно уу." };

  const { data: acc } = await supabase
    .from("accounts")
    .select("code, name")
    .eq("id", accountId)
    .maybeSingle();
  const a = acc as { code: string; name: string } | null;
  if (!a) return { ok: false, error: "Данс олдсонгүй." };

  async function sideTotal(col: "debit_code" | "credit_code"): Promise<number> {
    let total = 0;
    for (let off = 0; off < 500000; off += 1000) {
      const { data } = await supabase
        .from("journal_entries")
        .select("amount")
        .eq(col, a!.code)
        .range(off, off + 999);
      const page = (data as { amount: number }[] | null) ?? [];
      for (const r of page) total += Number(r.amount) || 0;
      if (page.length < 1000) break;
    }
    return total;
  }
  const [dr, cr] = await Promise.all([sideTotal("debit_code"), sideTotal("credit_code")]);
  // Дебет үлдэгдэлтэй данс (УТЗ/УТТ) → эерэг дүн.
  const balance = r2(Math.abs(dr - cr));
  return { ok: true, balance, code: a.code, name: a.name };
}

// Дансны гүйлгээнүүдийг (тухайн данс ДЕБЕТлэгдсэн — УТЗ/УТТ-д урьдчилж төлсөн
// дүнгүүд) буцаана. Хэрэглэгч чеклэн сонгож нэмэлт зардлын дүнд оруулна.
export type AccountEntry = {
  id: number;
  date: string;
  description: string | null;
  partner: string | null;
  amount: number;
};
export type AccountEntriesResult =
  | { ok: true; code: string; name: string; entries: AccountEntry[] }
  | { ok: false; error: string };

export async function getAccountEntries(accountId: number): Promise<AccountEntriesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нэвтрэх шаардлагатай." };
  if (!(accountId > 0)) return { ok: false, error: "Данс сонгоно уу." };

  const { data: acc } = await supabase
    .from("accounts")
    .select("code, name")
    .eq("id", accountId)
    .maybeSingle();
  const a = acc as { code: string; name: string } | null;
  if (!a) return { ok: false, error: "Данс олдсонгүй." };

  // Тухайн данс ДЕБЕТ талд орсон гүйлгээнүүд (урьдчилж төлсөн дүнгүүд).
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, txn_date, description, partner_name, amount")
    .eq("debit_code", a.code)
    .order("txn_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(500);
  if (error) return { ok: false, error: error.message };

  const entries: AccountEntry[] = (
    (data as { id: number; txn_date: string; description: string | null; partner_name: string | null; amount: number }[] | null) ?? []
  ).map((e) => ({
    id: e.id,
    date: (e.txn_date ?? "").slice(0, 10),
    description: e.description,
    partner: e.partner_name,
    amount: r2(Number(e.amount) || 0),
  }));

  return { ok: true, code: a.code, name: a.name, entries };
}
