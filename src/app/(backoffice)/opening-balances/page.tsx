import { redirect } from "next/navigation";

// Эхний үлдэгдлийн үндсэн хуудас → Дансны таб руу шилжүүлнэ.
export default async function OpeningBalancesIndex({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  redirect(`/opening-balances/accounts${sp.year ? `?year=${sp.year}` : ""}`);
}
