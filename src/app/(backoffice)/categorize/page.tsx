import { loadUncategorized } from "./actions";
import { CategorizeClient } from "./categorize-client";

export default async function CategorizePage() {
  let initial: Awaited<ReturnType<typeof loadUncategorized>> = [];
  let error: string | null = null;
  try {
    initial = await loadUncategorized(100);
  } catch (e) {
    error = e instanceof Error ? e.message : "Ачаалахад алдаа гарлаа.";
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">AI ангилал</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Банкны гүйлгээг Claude AI-аар автоматаар ангиллын кодод хуваарилна.
        Санал болгосон ангиллыг шалгаж, засаж, батална.
      </p>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div className="mt-6">
          <CategorizeClient initial={initial} />
        </div>
      )}
    </div>
  );
}
