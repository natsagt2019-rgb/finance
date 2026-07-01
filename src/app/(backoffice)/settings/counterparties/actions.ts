"use server";

import { revalidatePath } from "next/cache";
import * as xlsx from "xlsx";
import { createClient } from "@/lib/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return supabase;
}

export type ImportCpResult =
  | { ok: true; total: number; distinct: number }
  | { ok: false; error: string };

// Excel лавлах → bank_counterparties. Формат: A багана = харилцагчийн нэр,
// B багана = харьцсан дансны дугаар. Толгой мөрүүд автоматаар алгасагдана
// (дансны багана тоо биш мөрүүд). Нэг данс олон нэртэй бол ОЛОНХЫН нэрийг авна.
export async function importCounterparties(
  formData: FormData,
): Promise<ImportCpResult> {
  const supabase = await requireAuth();

  const file = formData.get("file");
  if (!file || typeof file === "string")
    return { ok: false, error: "Файл сонгоогүй байна." };

  let grid: unknown[][];
  try {
    const buf = Buffer.from(await (file as File).arrayBuffer());
    const wb = xlsx.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    grid = xlsx.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  } catch (e) {
    return { ok: false, error: `Уншихад алдаа: ${(e as Error).message}` };
  }

  // Данс тус бүрт нэрсийн давтамж → олонхын нэр.
  const counts = new Map<string, Map<string, number>>();
  let dataRows = 0;
  for (const row of grid) {
    const name = String((row?.[0] ?? "")).trim();
    const acct = String((row?.[1] ?? "")).trim();
    // Дансны багана нь дор хаяж 4 оронтой тоо байх ёстой (толгой мөр алгасна).
    if (!name || !/^\d{4,}$/.test(acct)) continue;
    dataRows++;
    let g = counts.get(acct);
    if (!g) {
      g = new Map();
      counts.set(acct, g);
    }
    g.set(name, (g.get(name) ?? 0) + 1);
  }

  if (counts.size === 0)
    return {
      ok: false,
      error:
        "Данс/нэр олдсонгүй. A багана = нэр, B багана = дансны дугаар байх ёстой.",
    };

  const rows = [...counts].map(([account_no, g]) => {
    let best = "";
    let bn = 0;
    for (const [nm, n] of g)
      if (n > bn) {
        bn = n;
        best = nm;
      }
    return { account_no, name: best };
  });

  // Багцаар upsert (500-аар).
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase
      .from("bank_counterparties")
      .upsert(chunk, { onConflict: "account_no" });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/settings/counterparties");
  return { ok: true, total: dataRows, distinct: rows.length };
}

export type CpResult = { ok: true } | { ok: false; error: string };

// Нэг бичлэг нэмэх/засах (upsert).
export async function upsertCounterparty(
  accountNo: string,
  name: string,
): Promise<CpResult> {
  const supabase = await requireAuth();
  const acct = accountNo.trim();
  const nm = name.trim();
  if (!/^\d{4,}$/.test(acct))
    return { ok: false, error: "Дансны дугаар (4+ орон) буруу." };
  if (!nm) return { ok: false, error: "Нэр хоосон байна." };
  const { error } = await supabase
    .from("bank_counterparties")
    .upsert({ account_no: acct, name: nm }, { onConflict: "account_no" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/counterparties");
  return { ok: true };
}

// Нэг бичлэг устгах.
export async function deleteCounterparty(accountNo: string): Promise<CpResult> {
  const supabase = await requireAuth();
  const { error } = await supabase
    .from("bank_counterparties")
    .delete()
    .eq("account_no", accountNo);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/counterparties");
  return { ok: true };
}
