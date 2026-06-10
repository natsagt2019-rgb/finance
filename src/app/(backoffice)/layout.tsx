import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Хамгаалалт (middleware-ээс гадна давхар шалгалт)
  if (!user) {
    redirect("/login");
  }

  return <AppShell userEmail={user.email ?? ""}>{children}</AppShell>;
}
