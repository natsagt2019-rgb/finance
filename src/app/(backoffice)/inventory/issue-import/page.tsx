import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { IssueImportClient } from "./issue-import-client";
import { type AccountOption } from "../types";

export const metadata = { title: "Зарлага импорт (Excel)" };

export default async function IssueImportPage() {
  const supabase = await createClient();
  const { data: accData } = await supabase
    .from("accounts")
    .select("id, code, name")
    .eq("is_active", true)
    .order("code", { ascending: true })
    .limit(3000);
  const accounts = (accData as AccountOption[] | null) ?? [];

  // Анхдагч зарлагын данс: борлуулсан барааны өртөг (710100) байвал сонгоно.
  const defaultCounter = accounts.find((a) => a.code === "710100")?.id ?? null;

  return (
    <div>
      <div className="mb-4">
        <Link href="/inventory?tab=moves" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Хөдөлгөөн
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-zinc-900">Зарлага импорт (Excel)</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Excel загвар татаж, зарлагын мөрүүдээ бөглөөд оруулна. Өртөг нь
        тохиргооны аргаар (FIFO эсвэл дундаж) автоматаар бодогдож журнал бичигдэнэ.
        Дараа нь нэг баримтын дугаараар «Зарлагын баримт» (БМ-3) хэвлэнэ.
      </p>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
        <IssueImportClient accounts={accounts} defaultCounter={defaultCounter} />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-600">
        <p className="font-medium text-zinc-700">Excel баганын дараалал:</p>
        <ol className="mt-1 list-decimal pl-5">
          <li>Код / SKU — барааны код (эсвэл нэрээр тааруулна)</li>
          <li>Барааны нэр</li>
          <li>Тоо хэмжээ</li>
          <li>Огноо (заавал биш — хоосон бол дээрх огноог хэрэглэнэ)</li>
          <li>Тэмдэглэл (заавал биш)</li>
        </ol>
        <p className="mt-2">2-р хуудсанд бараа болон одоогийн үлдэгдлийн лавлах байна.</p>
      </div>
    </div>
  );
}
