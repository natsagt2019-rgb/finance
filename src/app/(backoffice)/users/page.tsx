import { createClient } from "@/lib/supabase/server";
import { listUsers } from "./actions";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const users = await listUsers();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Хэрэглэгчид</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Системд нэвтрэх эрхтэй хэрэглэгчдийг үүсгэж, удирдана.
      </p>

      <div className="mt-6">
        <UsersClient initialUsers={users} currentUserId={user?.id ?? ""} />
      </div>
    </div>
  );
}
