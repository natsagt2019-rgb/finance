"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type UserRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
};

export type ActionResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

// Бүх action нэвтэрсэн хэрэглэгч шаардана.
async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрэх шаардлагатай");
  return user;
}

// ── Хэрэглэгчдийн жагсаалт ────────────────────────────────────────────────
export async function listUsers(): Promise<UserRow[]> {
  await requireAuth();

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) throw new Error(error.message);

  return data.users
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

// ── Шинэ хэрэглэгч үүсгэх ──────────────────────────────────────────────────
export async function createUser(formData: FormData): Promise<ActionResult> {
  await requireAuth();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email) return { ok: false, error: "Мэйл хаяг шаардлагатай." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Мэйл хаяг буруу байна." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // шууд баталгаажуулна (мэйл илгээхгүй)
  });

  if (error) {
    // Давхардсан мэйлийн алдааг ойлгомжтой болгоно.
    const msg = /already.*registered|exists/i.test(error.message)
      ? "Энэ мэйл хаягтай хэрэглэгч аль хэдийн бүртгэлтэй байна."
      : error.message;
    return { ok: false, error: msg };
  }

  revalidatePath("/users");
  return { ok: true, email: data.user.email ?? email };
}

// ── Хэрэглэгч устгах ───────────────────────────────────────────────────────
export async function deleteUser(userId: string): Promise<ActionResult> {
  const current = await requireAuth();
  if (current.id === userId) {
    return { ok: false, error: "Та өөрийгөө устгах боломжгүй." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/users");
  return { ok: true, email: "" };
}
