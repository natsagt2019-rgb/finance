import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { LogoutButton } from "@/components/logout-button";

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

  return (
    <div className="flex h-screen bg-zinc-100">
      <div className="no-print contents">
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="no-print flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500">{user.email}</span>
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
