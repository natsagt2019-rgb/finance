import "server-only";
import { createClient } from "@supabase/supabase-js";

// Зөвхөн серверийн талд ажиллах admin client.
// service_role түлхүүр ашигладаг тул RLS-ийг тойрно — client-д ХЭЗЭЭ Ч импортлохгүй.
// ("server-only" пакет нь client bundle-д орвол build алдаа өгнө.)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
