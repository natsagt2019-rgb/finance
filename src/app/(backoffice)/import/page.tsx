import { ImportClient } from "./import-client";

export default function ImportPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">
        Дансны хуулга цэгцлэгч
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Олон банкны хуулгыг нэг стандарт хэлбэрт оруулж, шалгаад дансны хуулга
        руу нэмнэ.
      </p>

      <div className="mt-6">
        <ImportClient />
      </div>
    </div>
  );
}
