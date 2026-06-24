import Link from "next/link";

export const metadata = { title: "Журнал — заавар" };

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
        <span>{icon}</span> {title}
      </h2>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-700">{children}</div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">{n}</span>
      <span>{children}</span>
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-zinc-50 px-3 py-1.5 font-mono text-xs text-zinc-600">{children}</p>
  );
}

export default function JournalsHelpPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">📒 Журнал — заавар, гарын авлага</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ерөнхий дэвтрийн бичилт: гар журнал хийх, засах, устгах, автомат журнал, харьцсан данс,
          хайлт ба тайлантай уялдах зарчим.
        </p>
      </div>

      <Section icon="✨" title="Танилцуулга">
        <p>
          Журнал нь нягтлан бодох бүртгэлийн <b>давхар бичилт</b>-ийн зарчмаар хөтлөгдөнө: гүйлгээ бүр
          <b> дебет (Дт)</b> ба <b>кредит (Кт)</b> талтай, нийт дебет = нийт кредит байна. Систем хоёр
          түвшинд хадгална:
        </p>
        <p className="text-zinc-500">
          • <b>journals + journal_lines</b> — журналын баримтын (voucher) дэлгэрэнгүй (огноо, утга, мөр бүрийн данс/дүн).<br />
          • <b>journal_entries</b> — ерөнхий дэвтэр (GL), тайлангийн эх сурвалж. Батлагдсан журнал бүр энд автоматаар тусна.
        </p>
      </Section>

      <Section icon="🔀" title="1. Гар ба автомат журнал">
        <p>
          <b>Гар журнал</b> (эх сурвалж = <span className="font-mono text-xs">manual</span>) — энэ дэлгэцээс өөрөө хийнэ.
          <b> Автомат журнал</b> — холбогдох модуль (Цалин, Үндсэн хөрөнгө, НӨАТ, Банк/Касс, Бараа материал) гүйлгээ
          бүртгэхэд өөрөө үүсгэдэг (эх сурвалж нь <span className="font-mono text-xs">salary, asset_depr, vat …</span>).
        </p>
        <p className="text-zinc-500">Зөвхөн гар журнал энд засагдана; автомат журналыг эх модулиар нь засна.</p>
      </Section>

      <Section icon="➕" title="2. Гар бичилт хийх">
        <Step n={1}>Дээд талын <b>«+ Гар бичилт»</b> товчийг дарна.</Step>
        <Step n={2}>Огноо, гүйлгээний утга, лавлах № (заавал биш), харилцагч (заавал биш)-ийг бөглөнө.</Step>
        <Step n={3}>Мөр бүрд <b>данс сонгож</b>, дебет ЭСВЭЛ кредит дүнг бичнэ. «+ Мөр нэмэх»-ээр мөр нэмнэ.</Step>
        <Step n={4}>Дебет = Кредит <b>баланслахад</b> «Батлаж хадгалах» идэвхждэг. Ноорог хадгалж бас болно.</Step>
        <Formula>Нийт дебет = Нийт кредит (баланс) → батлах боломжтой</Formula>
      </Section>

      <Section icon="✏" title="3. Засах">
        <p>Жагсаалтын гар журналын мөрөнд <b>«Засах»</b> товч гарна. Дарж ороод огноо, утга, мөр/дансыг өөрчилж
          дахин хадгална. Хадгалахад ерөнхий дэвтрийн тусгал (journal_entries) <b>дахин үүснэ</b> — тайлан шууд шинэчлэгдэнэ.</p>
        <p className="text-zinc-500">Автомат журналд «Засах» товч гарахгүй (эх модулиар нь засна).</p>
      </Section>

      <Section icon="🗑" title="4. Устгах">
        <p><b>«Устгах»</b> товчоор журналыг бүхэлд нь устгана. Журналын мөр (journal_lines) ба ерөнхий дэвтрийн
          тусгал (journal_entries) хамт цэвэрлэгдэнэ — орфан үлдэхгүй.</p>
      </Section>

      <Section icon="🔢" title="5. Харьцсан данс ба дүн">
        <p>Жагсаалтын <b>«Дт / Кт данс»</b> баганад журнал бүрийн дебет/кредит данс, тус бүрийн <b>дүнтэй</b>
          харагдана. Ижил данс нэг мөрөнд нэгтгэгдэнэ. Дансны код дээр хулганаа аваачихад бүтэн нэр гарна.</p>
      </Section>

      <Section icon="🔍" title="6. Хайлт ба хугацааны шүүлт">
        <p>Дээд талын талбараас <b>утга / дугаар (GL-…) / лавлахаар</b> хайна, <b>эхлэх–дуусах огноо</b>-гоор шүүнэ.
          «Цэвэрлэх» дарж шүүлтийг арилгана. Шүүлт URL-д хадгалагддаг тул хуудсыг хадгалах/хуваалцаж болно.</p>
      </Section>

      <Section icon="📊" title="7. Тайлантай уялдах">
        <p>Батлагдсан журнал бүр <b>journal_entries</b> (ерөнхий дэвтэр) рүү тусч, дараах тайлангуудад автоматаар орно:
          гүйлгээ баланс, ерөнхий данс, санхүүгийн байдал, орлогын тайлан гэх мэт.</p>
        <p className="pt-1">
          <Link href="/journals" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700">
            Журнал руу очих →
          </Link>
        </p>
      </Section>
    </div>
  );
}
