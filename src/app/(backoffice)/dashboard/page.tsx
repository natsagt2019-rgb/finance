export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Хяналтын самбар</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Тавтай морил. Энэ бол системийн суурь хувилбар.
      </p>

      <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
        <p className="text-zinc-500">
          Модулиуд энд нэмэгдэх болно. Дараагийн алхамд нэг модуль сонгож
          хөгжүүлж эхэлнэ.
        </p>
      </div>
    </div>
  );
}
