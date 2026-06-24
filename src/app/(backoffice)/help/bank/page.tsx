import Link from "next/link";

export const metadata = { title: "Харилцах данс — заавар" };

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

export default function BankHelpPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">🏦 Харилцах данс — заавар, гарын авлага</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Банкны данс бүртгэх, хуулга оруулах, ангилах, журналд бичих болон харилцахын тайлангуудыг хэрхэн ашиглах талаар.
        </p>
      </div>

      <Section icon="✨" title="Танилцуулга">
        <p>
          Харилцах модуль нь олон банкны <b>дансны хуулгыг</b> (ТДБ, Голомт, Хас, М банк…) нэг стандартад оруулж, гүйлгээ бүрийг
          <b> ангилж</b>, харгалзах нягтлан бодох <b>журналд бичдэг</b>. Бүх банкны данс <b>Тохиргоо → Банкны данс</b> бүртгэлээс
          динамикаар уншигдана — данс нэмэхэд бүх тайланд автоматаар нэмэгдэнэ.
        </p>
      </Section>

      <Section icon="⚙" title="1. Банкны данс бүртгэх (нэг удаа)">
        <Step n={1}>«Тохиргоо → 🏦 Банкны данс» хуудсанд <b>дансны дугаар, банк, валют, харилцах GL данс, харагдах нэр</b> бөглөж «Нэмэх».</Step>
        <Step n={2}>Бүртгэсэн данс шууд <b>бүх тайланд таб</b> болж гарна (Харилцахын тайлан, журнал, нэгтгэл).</Step>
        <Step n={3}>Дансны <b>эхний үлдэгдэл</b>-ийг оны эхэнд тохируулна (одоогоор нягтлан тохируулна).</Step>
      </Section>

      <Section icon="📥" title="2. Хуулга оруулах (цэгцлэгч)">
        <Step n={1}>«Дансны хуулга цэгцлэгч» хуудсанд банкны хуулга файлыг (.xls/.xlsx) сонгож <b>«Унших»</b>. Банк нь файл/доторх дансаар автоматаар танигдана.</Step>
        <Step n={2}>Урьдчилан харахад <b>давхардсан</b> гүйлгээ тэмдэглэгдэж, зөвхөн шинэ нь сонгогдоно. Ангилал, харилцагчийг засаж болно.</Step>
        <Step n={3}><b>«Батлах»</b> дарж гүйлгээг дансны хуулга руу нэмнэ. Валютын данс бол ханшаар төгрөгийн дүйцлийг хадгална.</Step>
      </Section>

      <Section icon="✨" title="3. AI ангилал ба автомат холболт">
        <p>
          «AI ангилал» хэсэг нь кодлогдоогүй гүйлгээг <b>харилцагч/утгаар нь автоматаар ангилж</b>, өмнө батлагдсанаас <b>сурч</b>
          давтагдсаныг бөглөнө. Нөгөө тал (харьцах) дансыг автоматаар онооно — зөвхөн хоосон талыг л бөглөх тул гараар тавьсныг дарахгүй.
        </p>
      </Section>

      <Section icon="📓" title="4. Журналд бичих">
        <p>
          Ангилсан гүйлгээг <b>«Журналд бичих»</b>-ээр ерөнхий дэвтэрт (journal_entries) double-entry болгон бичнэ — энэ нь гүйлгээ баланс,
          орлогын тайлан, баланс зэрэгт тусна. Идемпотент: дахин бичихэд хуучныг устгаад шинэчилнэ.
        </p>
      </Section>

      <Section icon="📊" title="5. Тайлангууд">
        <p>Харилцах дансаар дараах тайлан:</p>
        <Step n={1}><b>Харилцахын гүйлгээний тайлан</b> — данс бүрийн гүйлгээ, эхний/эцсийн үлдэгдэл (валютад төгрөгийн дүйцэлтэй).</Step>
        <Step n={2}><b>Мөнгөн хөрөнгийн журнал</b> — харьцсан дансаар бүлэглэсэн.</Step>
        <Step n={3}><b>Мөнгөн хөрөнгийн нэгтгэл</b> — банк ба касс тус бүрийн сарын хөдөлгөөн, үлдэгдэл.</Step>
        <Step n={4}><b>Мөнгөн урсгал</b> — ангиллын кодоор нэгтгэсэн дотоод тайлан.</Step>
      </Section>

      <Section icon="💱" title="6. Гадаад валют">
        <p>
          Валютын гүйлгээ нь дансны валютаар хадгалагдаж, журнал болон төгрөгийн тайлангуудад <b>ханшаар хөрвүүлэгдэж</b> орно.
          Тайлангуудад валютын дүнгийн хажууд төгрөгийн дүйцлийг харуулна.
        </p>
        <p className="pt-1">
          <Link href="/import" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700">
            Хуулга цэгцлэгч рүү очих →
          </Link>
        </p>
      </Section>
    </div>
  );
}
