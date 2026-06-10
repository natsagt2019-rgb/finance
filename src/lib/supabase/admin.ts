import "server-only";
import { createClient } from "@supabase/supabase-js";

// Зөвхөн серверийн талд ажиллах admin client.
// service_role түлхүүр ашигладаг тул RLS-ийг тойрно — client-д ХЭЗЭЭ Ч импортлохгүй.
// ("server-only" пакет нь client bundle-д орвол build алдаа өгнө.)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY эсвэл NEXT_PUBLIC_SUPABASE_URL орчны хувьсагч тохируулагдаагүй байна. " +
        "Локал дээр .env.local, Vercel дээр Environment Variables хэсэгт оруулна уу.",
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
