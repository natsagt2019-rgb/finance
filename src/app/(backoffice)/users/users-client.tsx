"use client";

import { useState, useTransition } from "react";

import { listUsers, createUser, deleteUser, type UserRow } from "./actions";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

export function UsersClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: UserRow[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);

    startTransition(async () => {
      const res = await createUser(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(`${res.email} хэрэглэгч амжилттай үүслээ.`);
      setEmail("");
      setPassword("");
      try {
        setUsers(await listUsers());
      } catch {
        /* жагсаалт дараа дахин ачаалагдана */
      }
    });
  }

  function handleDelete(u: UserRow) {
    if (!window.confirm(`"${u.email}" хэрэглэгчийг устгах уу?`)) return;
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const res = await deleteUser(u.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage("Хэрэглэгч устгагдлаа.");
      try {
        setUsers(await listUsers());
      } catch {
        /* */
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Шинэ хэрэглэгч нэмэх */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">
          Шинэ хэрэглэгч нэмэх
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Үүсгэсэн хэрэглэгч мэйл + нууц үгээрээ шууд нэвтэрнэ (мэйл
          баталгаажуулалт шаардахгүй).
        </p>

        <form
          onSubmit={handleCreate}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[220px]">
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Мэйл хаяг
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Нууц үг (6+ тэмдэгт)
            </label>
            <input
              type="text"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? "Үүсгэж байна…" : "Нэмэх"}
          </button>
        </form>
      </div>

      {/* Мессеж / алдаа */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {/* Хэрэглэгчдийн жагсаалт */}
      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            Бүх хэрэглэгч ({users.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-6 py-2">Мэйл хаяг</th>
                <th className="px-3 py-2">Үүсгэсэн</th>
                <th className="px-3 py-2">Сүүлд нэвтэрсэн</th>
                <th className="px-3 py-2 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-3 text-zinc-800">
                    {u.email}
                    {u.id === currentUserId && (
                      <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                        та
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-zinc-500">
                    {fmtDate(u.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-zinc-500">
                    {fmtDate(u.last_sign_in_at)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {u.id !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
                        disabled={isPending}
                        className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Устгах
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-zinc-400">
                    Хэрэглэгч алга.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
