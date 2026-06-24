import Link from "next/link";

export const metadata = { title: "Касс — заавар" };

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

export default function CashHelpPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">🪙 Касс — заавар, гарын авлага</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Бэлэн мөнгөний кассын орлого/зарлагын баримт, кассын дэвтэр, авто журнал болон тайлангуудыг хэрхэн ашиглах талаар.
        </p>
      </div>

      <Section icon="✨" title="Танилцуулга">
        <p>
          Кассын модуль нь бэлэн мөнгөний <b>орлого (КО)</b> ба <b>зарлага (КЗ)</b>-ын баримтыг бүртгэж, кассын дэвтрийн
          үлдэгдлийг хөтөлж, харгалзах нягтлан бодох <b>журналыг автоматаар</b> үүсгэдэг. Олон касс (салбар, валют) хөтлөх боломжтой.
        </p>
        <p>Гол зарчим: <b>орлого</b> = Дт касс / Кт эх үүсвэр, &nbsp;<b>зарлага</b> = Дт зориулалт / Кт касс.</p>
      </Section>

      <Section icon="⚙" title="1. Эхлэх тохиргоо (нэг удаа)">
        <Step n={1}>«Касс» хуудасны <b>«Касс» табд</b> кассаа үүсгэнэ: нэр, валют, мөн <b>бэлэн мөнгөний GL данс</b> (ж: 110100 Кассын бэлэн мөнгө). Энэ данс журнал бичихэд зайлшгүй.</Step>
        <Step n={2}>«Тохиргоо» табд <b>орлого/зарлагын анхдагч нөгөө тал данс</b>-ыг сонгож болно (баримт дээр заагаагүй үед хэрэглэнэ).</Step>
        <Step n={3}>«Журнал автоматаар үүсгэх» асаалттай эсэхийг шалгана.</Step>
      </Section>

      <Section icon="📥" title="2. Орлогын баримт (КО)">
        <Step n={1}>«Касс» хуудаснаас касс сонгож, <b>«Орлого»</b> баримт нэмнэ.</Step>
        <Step n={2}>Огноо, дүн, шаардвал ханш (валютын касс), харилцагч, <b>нөгөө тал данс</b> (орлогын эх үүсвэр — борлуулалт/авлага), гүйлгээний утгыг бөглөнө.</Step>
        <Step n={3}>Хадгалахад баримтын дугаар (КО100001…) автоматаар олгогдож, журнал <b>Дт касс / Кт эх үүсвэр</b> бичигдэнэ.</Step>
      </Section>

      <Section icon="📤" title="3. Зарлагын баримт (КЗ)">
        <Step n={1}><b>«Зарлага»</b> баримт нэмж, дүн, харилцагч, <b>зориулалтын данс</b> (зардал/өглөг), утгыг бөглөнө.</Step>
        <Step n={2}>Журнал <b>Дт зориулалт / Кт касс</b> бичигдэнэ. Баримтын дугаар КЗ100001… болж олгогдоно.</Step>
      </Section>

      <Section icon="💱" title="4. Валютын касс">
        <p>
          Касс гадаад валюттай бол баримт дээр <b>дүн нь кассын валютаар</b>, ханш оруулна — журналд <b>төгрөгийн дүйцлээр</b> (дүн × ханш)
          бичигдэнэ. Кассын гүйлгээний тайлан валютын дүнгийн хажууд <b>төгрөгийн дүйцлийг</b> давхар харуулна.
        </p>
      </Section>

      <Section icon="📒" title="5. Кассын дэвтэр ба тайлан">
        <p>
          «Кассын гүйлгээний тайлан»-аас касс бүрийн <b>эхний үлдэгдэл, орлого, зарлага, эцсийн үлдэгдэл</b>-ийг хугацаагаар харна.
          Дээд талын <b>«↧ Excel татах»</b> товчоор тайланг .xlsx болгон татна, «Хэвлэх»-ээр хэвлэнэ.
        </p>
        <p>Бүх кассын нэгдсэн дүнг «Мөнгөн хөрөнгийн нэгтгэл»-ээс банктай хамт харна.</p>
      </Section>

      <Section icon="🗑" title="6. Баримт устгах">
        <p>Баримт устгахад холбоотой журнал (ерөнхий дэвтэр дэх бичилт хамт) <b>автоматаар устаж</b>, кассын дэвтэр ба гүйлгээ баланс зөрөхгүй.</p>
      </Section>

      <Section icon="✅" title="7. Тулгалт (хяналт)">
        <p>
          Кассын дэвтрийн эцсийн үлдэгдэл нь гүйлгээ баланс дахь тухайн кассын <b>бэлэн мөнгөний дансны үлдэгдэлтэй үргэлж тэнцэнэ</b>
          (орлого − зарлага). Зөрвөл журнал автоматаар үүсээгүй (тохиргоо унтраалттай) баримт байгаа эсэхийг шалгана.
        </p>
        <p className="pt-1">
          <Link href="/cash" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700">
            Касс руу очих →
          </Link>
        </p>
      </Section>
    </div>
  );
}
