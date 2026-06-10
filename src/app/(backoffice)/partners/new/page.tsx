import Link from "next/link";

import { PartnerForm } from "../partner-form";

export default function NewPartnerPage() {
  return (
    <div>
      <Link href="/partners" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Харилцагчид
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
        Шинэ харилцагч
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Харилцагчийн мэдээллийг оруулна уу.
      </p>

      <div className="mt-6">
        <PartnerForm mode="create" />
      </div>
    </div>
  );
}
