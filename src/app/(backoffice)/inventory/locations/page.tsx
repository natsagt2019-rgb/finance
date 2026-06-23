import { createClient } from "@/lib/supabase/server";
import { LocationsClient, type LocationRow } from "./locations-client";

export const metadata = { title: "Байршил (агуулах)" };

export default async function LocationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inv_locations")
    .select("id, code, name, keeper, note")
    .eq("is_active", true)
    .order("code", { ascending: true })
    .order("name", { ascending: true })
    .limit(2000);
  const locations = (data as LocationRow[] | null) ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">📍 Байршил (агуулах)</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Агуулах / байршлын бүртгэл. Хөдөлгөөн (орлого/зарлага) хийхэд байршил сонгож, үлдэгдлийг байршлаар харна.
      </p>
      <div className="mt-5">
        <LocationsClient locations={locations} />
      </div>
    </div>
  );
}
