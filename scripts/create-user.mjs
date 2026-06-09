// Supabase-д шинэ хэрэглэгч (баталгаажсан) үүсгэх скрипт.
// Хэрэглээ:  node scripts/create-user.mjs <email> <password>
// service_role түлхүүрийг .env.local-оос уншина (хэзээ ч хатуу бичихгүй).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Хэрэглээ: node scripts/create-user.mjs <email> <password>");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  console.error("Алдаа:", error.message);
  process.exit(1);
}

console.log("✓ Хэрэглэгч үүслээ:", data.user.email);
