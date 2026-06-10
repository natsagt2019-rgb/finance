import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { EmployeeForm } from "../../employee-form";
import { EMPLOYEE_SELECT, type EmployeeRow } from "../../types";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("employees")
    .select(EMPLOYEE_SELECT)
    .eq("id", Number(id))
    .single();

  const employee = data as EmployeeRow | null;
  if (!employee) notFound();

  return (
    <div>
      <Link href="/salary?tab=employees" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Ажилтнууд
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
        Ажилтан засах — {employee.name}
      </h1>

      <div className="mt-6">
        <EmployeeForm mode="edit" employee={employee} />
      </div>
    </div>
  );
}
