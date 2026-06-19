import { loadCompany } from "@/lib/company";
import { CompanyForm } from "./company-form";

export const metadata = { title: "Байгууллага — Тохиргоо" };

export default async function CompanySettingsPage() {
  const company = await loadCompany();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Үндсэн байгууллага
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Байгууллагынхаа мэдээллийг бүртгэнэ үү. Энэ мэдээлэл нэхэмжлэх,
          тооцооны баталгаа зэрэг хэвлэх баримтад ашиглагдана.
        </p>
      </div>

      <CompanyForm company={company} />
    </div>
  );
}
