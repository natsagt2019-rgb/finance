import Link from "next/link";

import { ItemForm } from "../../item-form";

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const { company } = await searchParams;

  return (
    <div>
      <Link
        href="/inventory?tab=items"
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Бараа
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Шинэ бараа</h1>
      <p className="mt-1 text-sm text-zinc-500">Барааны мэдээллийг оруулна уу.</p>

      <div className="mt-6">
        <ItemForm mode="create" defaultCompany={company} />
      </div>
    </div>
  );
}
