import { createClient } from "@/lib/supabase/server";
import { listUsers } from "./actions";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // listUsers унавал (ж: service_role түлхүүр дутуу) бүх хуудсыг 500 болгохгүй,
  // харин форм нь ажиллах хэвээр, алдааг client-д харуулна.
  let users: Awaited<ReturnType<typeof listUsers>> = [];
  let loadError: string | null = null;
  try {
    users = await listUsers();
  } catch (e) {
    loadError =
      e instanceof Error ? e.message : "Хэрэглэгчдийн жагсаалт ачаалахад алдаа гарлаа.";
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Хэрэглэгчид</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Системд нэвтрэх эрхтэй хэрэглэгчдийг үүсгэж, удирдана.
      </p>

      <div className="mt-6">
        <UsersClient
          initialUsers={users}
          currentUserId={user?.id ?? ""}
          loadError={loadError}
        />
      </div>
    </div>
  );
}
