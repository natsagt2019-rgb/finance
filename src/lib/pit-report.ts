// ХХОАТ (Хувь хүний орлогын албан татвар) тайлан — цалингаас суутгасан.
//
// Эрх зүйн суурь: ХХОАТ хууль 2019.03.22 (legalinfo lawId=14410).
// Ажил олгогч цалин хөлснөөс сар бүр суутган төлж тайлагнана (суутган
// төлөгчийн тайлан). Эх өгөгдөл: salary_records (pit = шатлалт хасагдуулгатай
// 10%, salary-calc.ts-ээр бодогдсон) + employees (регистр/ДД).

import type { createClient } from "@/lib/supabase/server";
import { isForeignRegister } from "@/lib/salary-calc";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type PitReportRow = {
  employeeId: number | null;
  register: string; // ДД / регистр
  tin: string; // ТТД — татвар төлөгчийн дугаар (e-Tax XM-11)
  name: string;
  lastName: string; // овог
  firstName: string; // нэр
  months: number; // тооцоонд орсон сарын тоо
  gross: number; // нийт орлого
  shInsurance: number; // ЭМНДШ (татвар ногдох орлогоос хасагдана)
  taxable: number; // татвар ногдох орлого = gross − ЭМНДШ
  reliefApplied: number; // хэрэглэсэн хөнгөлөлт (хасагдуулга, Арт.23.1)
  pit: number; // ногдуулсан ХХОАТ
};

export type PitReport = {
  rows: PitReportRow[];
  total: {
    gross: number;
    shInsurance: number;
    taxable: number;
    reliefApplied: number;
    pit: number;
  };
  pitRate: number;
  monthLabel: string;
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Тайланд гарах боломжит онууд (salary_records-оос).
export async function pitReportYears(
  supabase: SupabaseClient,
): Promise<number[]> {
  const { data } = await supabase
    .from("salary_records")
    .select("year")
    .eq("is_active", true);
  const ys = new Set<number>(
    ((data as { year: number }[] | null) ?? []).map((r) => r.year).filter(Boolean),
  );
  return [...ys].sort((a, b) => b - a);
}

const MONTHS_MN = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

export function periodLabel(fromMonth: number, toMonth: number): string {
  if (fromMonth === 1 && toMonth === 12) return "Жилийн дүн";
  if (fromMonth === toMonth) return MONTHS_MN[fromMonth - 1];
  return `${MONTHS_MN[fromMonth - 1]} — ${MONTHS_MN[toMonth - 1]}`;
}

// [fromMonth, toMonth] сарын мужид ХХОАТ тайланг ажилтнаар нэгтгэнэ.
export async function buildPitReport(
  supabase: SupabaseClient,
  year: number,
  fromMonth: number,
  toMonth: number,
): Promise<PitReport> {
  // ХХОАТ хувь (тухайн жилийн тохиргооноос; анхдагч 10%).
  const { data: settings } = await supabase
    .from("salary_settings")
    .select("pit_rate")
    .eq("year", year)
    .maybeSingle();
  const pitRate = Number((settings as { pit_rate: number } | null)?.pit_rate) || 0.1;

  // Цалингийн мөрүүд.
  const { data: recRows } = await supabase
    .from("salary_records")
    .select("employee_id, employee_name, gross, sh_insurance, pit")
    .eq("is_active", true)
    .eq("year", year)
    .gte("month", fromMonth)
    .lte("month", toMonth)
    .limit(20000);
  const records =
    (recRows as
      | {
          employee_id: number | null;
          employee_name: string | null;
          gross: number | null;
          sh_insurance: number | null;
          pit: number | null;
        }[]
      | null) ?? [];

  // Ажилтны регистр (ДД), ТТД, овог/нэр.
  const { data: empRows } = await supabase
    .from("employees")
    .select("id, name, register, tin, last_name, first_name")
    .limit(20000);
  const empById = new Map<
    number,
    { name: string; register: string; tin: string; lastName: string; firstName: string }
  >();
  for (const e of (empRows as
    | {
        id: number;
        name: string | null;
        register: string | null;
        tin: string | null;
        last_name: string | null;
        first_name: string | null;
      }[]
    | null) ?? []) {
    empById.set(e.id, {
      name: e.name ?? "",
      register: e.register ?? "",
      tin: e.tin ?? "",
      lastName: e.last_name ?? "",
      firstName: e.first_name ?? "",
    });
  }

  // Ажилтнаар нэгтгэх.
  const byEmp = new Map<string, PitReportRow>();
  for (const r of records) {
    const gross = Number(r.gross) || 0;
    const sh = Number(r.sh_insurance) || 0;
    const pit = Number(r.pit) || 0;

    const key = r.employee_id != null ? `e${r.employee_id}` : `n:${r.employee_name ?? ""}`;
    const emp = r.employee_id != null ? empById.get(r.employee_id) : undefined;
    // Гадаад ажилтан: татвар ногдох орлого = нийт цалин (НДШ хасахгүй).
    const foreign = isForeignRegister(emp?.register);
    const taxable = foreign ? gross : gross - sh;
    // Хэрэглэсэн хөнгөлөлт = татвар ногдох × хувь − ногдсон ХХОАТ (≥0).
    const relief = Math.max(0, round2(taxable * pitRate - pit));
    const cur =
      byEmp.get(key) ??
      ({
        employeeId: r.employee_id,
        register: emp?.register ?? "",
        tin: emp?.tin ?? "",
        name: emp?.name || r.employee_name || "—",
        lastName: emp?.lastName ?? "",
        firstName: emp?.firstName ?? "",
        months: 0,
        gross: 0,
        shInsurance: 0,
        taxable: 0,
        reliefApplied: 0,
        pit: 0,
      } satisfies PitReportRow);
    cur.months += 1;
    cur.gross += gross;
    cur.shInsurance += sh;
    cur.taxable += taxable;
    cur.reliefApplied += relief;
    cur.pit += pit;
    byEmp.set(key, cur);
  }

  const rows = [...byEmp.values()].map((r) => ({
    ...r,
    gross: round2(r.gross),
    shInsurance: round2(r.shInsurance),
    taxable: round2(r.taxable),
    reliefApplied: round2(r.reliefApplied),
    pit: round2(r.pit),
  }));
  rows.sort((a, b) => a.name.localeCompare(b.name, "mn"));

  const total = rows.reduce(
    (t, r) => ({
      gross: t.gross + r.gross,
      shInsurance: t.shInsurance + r.shInsurance,
      taxable: t.taxable + r.taxable,
      reliefApplied: t.reliefApplied + r.reliefApplied,
      pit: t.pit + r.pit,
    }),
    { gross: 0, shInsurance: 0, taxable: 0, reliefApplied: 0, pit: 0 },
  );

  return {
    rows,
    total: {
      gross: round2(total.gross),
      shInsurance: round2(total.shInsurance),
      taxable: round2(total.taxable),
      reliefApplied: round2(total.reliefApplied),
      pit: round2(total.pit),
    },
    pitRate,
    monthLabel: periodLabel(fromMonth, toMonth),
  };
}
