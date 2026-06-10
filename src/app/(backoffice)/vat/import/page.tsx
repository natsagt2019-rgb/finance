import { VatImportClient } from "../import-client";

export default function VatImportPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">
        НӨАТ — Excel оруулах
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        ebarimt.mn порталаас татсан Excel-ийг оруулж, урьдчилан хараад батална.
      </p>
      <div className="mt-6">
        <VatImportClient />
      </div>
    </div>
  );
}
