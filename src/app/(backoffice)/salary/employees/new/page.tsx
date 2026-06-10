import Link from "next/link";

import { EmployeeForm } from "../../employee-form";

export default function NewEmployeePage() {
  return (
    <div>
      <Link href="/salary?tab=employees" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Ажилтнууд
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Шинэ ажилтан</h1>
      <p className="mt-1 text-sm text-zinc-500">Ажилтны мэдээллийг оруулна уу.</p>

      <div className="mt-6">
        <EmployeeForm mode="create" />
      </div>
    </div>
  );
}
