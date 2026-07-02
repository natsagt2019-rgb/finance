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

// Мөрөн дэх үсгэн тэмдэгтийн тоо (нэрийн баганыг таних score).
function letterCount(s: string): number {
  return (s.match(/[A-Za-zА-Яа-яЁёӨҮөүÖÜ]/g) || []).length;
}

// Excel лавлах → bank_counterparties. Багана-хамааралгүй: мөр бүрээс ДАНС
// (бүхэлдээ 4+ оронтой тоо байх нүд) ба НЭР (үсэг хамгийн ихтэй бусад нүд)-ийг
// таньж авна — ингэснээр багана шилжсэн (код/нэр/данс) файл ч ажиллана. Бүх
// sheet-ийг уншина. Толгой мөр автоматаар алгасагдана. Нэг данс олон нэртэй бол
// ОЛОНХЫН нэрийг авна.
export async function importCounterparties(
  formData: FormData,
): Promise<ImportCpResult> {
  const supabase = await requireAuth();

  const file = formData.get("file");
  if (!file || typeof file === "string")
    return { ok: false, error: "Файл сонгоогүй байна." };

  let grids: unknown[][][];
  try {
    const buf = Buffer.from(await (file as File).arrayBuffer());
    const wb = xlsx.read(buf, { type: "buffer" });
    grids = wb.SheetNames.map((sn) =>
      xlsx.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], {
        header: 1,
        defval: null,
      }),
    );
  } catch (e) {
    return { ok: false, error: `Уншихад алдаа: ${(e as Error).message}` };
  }

  // Данс тус бүрт нэрсийн давтамж → олонхын нэр.
  const counts = new Map<string, Map<string, number>>();
  let dataRows = 0;
  for (const grid of grids) {
    for (const row of grid) {
      const cells = ((row as unknown[]) ?? []).map((c) =>
        String(c ?? "").trim(),
      );
      // Данс: бүхэлдээ 4+ оронтой тоо байх нүд.
      const acct = cells.find((c) => /^\d{4,}$/.test(c));
      if (!acct) continue;
      // Нэр: данс биш, үсэг хамгийн ихтэй нүд (дор хаяж 3 үсэг — код/тоо алгасна).
      let name = "";
      let bestLetters = 2;
      for (const c of cells) {
        if (c === acct) continue;
        const lc = letterCount(c);
        if (lc > bestLetters) {
          bestLetters = lc;
          name = c;
        }
      }
      if (!name) continue;
      dataRows++;
      let g = counts.get(acct);
      if (!g) {
        g = new Map();
        counts.set(acct, g);
      }
      g.set(name, (g.get(name) ?? 0) + 1);
    }
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
