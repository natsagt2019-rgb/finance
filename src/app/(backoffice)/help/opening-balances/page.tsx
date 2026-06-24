import Link from "next/link";

export const metadata = { title: "Эхний үлдэгдэл оруулах заавар — Туслах" };

// ── Жижиг бүрэлдэхүүн хэсгүүд ────────────────────────────────────────────────
function Section({
  no,
  title,
  children,
}: {
  no: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
          {no}
        </span>
        {title}
      </h2>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600">
        {children}
      </div>
    </section>
  );
}

function Tab({
  icon,
  name,
  children,
}: {
  icon: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
        <span>{icon}</span> {name}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{children}</p>
    </div>
  );
}

export default function OpeningBalancesHelpPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link
          href="/opening-balances"
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          ← Эхний үлдэгдэл рүү очих
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Эхний үлдэгдэл оруулах заавар
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Систем рүү анх шилжихдээ өмнөх үлдэгдлүүдээ хэрхэн зөв оруулах
          алхамчилсан гарын авлага.
        </p>
      </div>

      <Section no="1" title="Эхний үлдэгдэл гэж юу вэ?">
        <p>
          Энэ системд бүртгэл хөтлөж эхлэхээс <b>өмнөх</b> (өмнөх оны эцсийн)
          дансны үлдэгдлүүд. Эдгээрийг оруулснаар тайлан (баланс, гүйлгээ баланс)
          зөв эхлэх цэгтэй болно.
        </p>
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-blue-800">
          📅 <b>Огноо:</b> Тайлант он сонгоход эхний үлдэгдлийн огноо нь{" "}
          <b>(он − 1)-12-31</b> болно. Жишээ нь <b>2026</b> он сонговол{" "}
          <b>2025-12-31</b> огноогоор бичигдэнэ.
        </p>
      </Section>

      <Section no="2" title="Урьдчилан бэлдэх">
        <p>
          Эхний үлдэгдэл оруулахаас өмнө <b>Дансны жагсаалт</b> (Үндсэн бүртгэл →
          Дансны жагсаалт) бэлэн байх ёстой. Хоосон бол стандарт дансны
          төлөвлөгөөг ачаалсан байх хэрэгтэй. Харилцагч, үндсэн хөрөнгө, барааны
          дэлгэрэнгүйг оруулах бол тэдгээрийн модульд эхлээд бүртгэнэ (эсвэл Excel
          загвараар оруулна).
        </p>
      </Section>

      <Section no="3" title="Tab бүрийн үүрэг">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Tab icon="⚖" name="Санхүүгийн тайлангийн">
            Санхүүгийн байдлын тайлан (баланс)-ын мөрүүдээр шууд оруулах хялбар
            арга.
          </Tab>
          <Tab icon="🗂" name="Дансны">
            Данс бүрээр гар оруулга эсвэл Excel импорт. Зөвхөн эерэг дүн бичнэ —
            Дт/Кт-г дансны шинжээс автомат тогтооно (хөрөнгө/зардал→Дт,
            өр/өмч/орлого→Кт). Контр данс (ж: хуримтлагдсан элэгдэл) бол сөрөг тоо.
          </Tab>
          <Tab icon="👥" name="Харилцагчийн">
            Авлага (Дт) ба өглөг (Кт)-ийг харилцагч тус бүрээр. Энэ нь
            авлага/өглөгийн дансны нийт дүнг <b>орлоно</b> — Дансны таб дээр уг
            дансны дүнг давхар бичихгүй.
          </Tab>
          <Tab icon="🏗" name="Үндсэн хөрөнгийн">
            «Үндсэн хөрөнгө» модулийн картаас автоматаар (өртөг→Дт, хуримтлагдсан
            элэгдэл→Кт). Excel загвараар хөрөнгийн картыг бөөнөөр оруулж болно.
          </Tab>
          <Tab icon="📦" name="Барааны / хангамж">
            «Бараа материал» модулийн FIFO үлдэгдлээс (тоо × өртөг). Excel
            загвараар барааны нээлтийн нөөцийг оруулж болно.
          </Tab>
        </div>
      </Section>

      <Section no="4" title="Алхамчилсан дараалал">
        <ol className="ml-1 space-y-2">
          {[
            "Дээрээс «Тайлант он» сонгоно (огноо автоматаар (он−1)-12-31 болно).",
            "«Дансны» таб дээр данс бүрийн үлдэгдлийг гараар бичих эсвэл «Excel загвар татах»-аар бөглөж импортлоно → «Хадгалах».",
            "«Харилцагчийн» таб дээр авлага/өглөгийг харилцагчаар оруулна → «Хадгалах».",
            "«Үндсэн хөрөнгийн» ба «Барааны» таб дээр (карт/бараагаа оруулсан бол) «Журналд тусгах» дарна.",
            "Дээрх «Зөрүү» 0 болж «✓ тэнцэв» гарахыг шалгана (Дт = Кт).",
          ].map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-semibold text-zinc-400">{i + 1}.</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section no="5" title="Тэнцэл (Дт = Кт)">
        <p>
          Эхний үлдэгдэл нь давхар бичилтийн зарчмаар <b>тэнцсэн</b> байх ёстой:
          бүх эх сурвалжийн (данс, харилцагч, хөрөнгө, бараа) нийт <b>Дебет = Кредит</b>.
        </p>
        <p>
          Дээд талын самбар <span className="font-medium text-green-700">«✓ тэнцэв»</span>{" "}
          (зөрүү 0) эсвэл <span className="font-medium text-amber-700">«Зөрүү …»</span>{" "}
          гэж харуулна. Зөрүүтэй бол өмч (эзэмшигчийн капитал, хуримтлагдсан
          ашиг)-ийн дансаар тэнцлийг гүйцээнэ.
        </p>
      </Section>

      <Section no="6" title="Анхаарах зүйлс">
        <ul className="ml-1 list-disc space-y-1.5 pl-4">
          <li>
            <b>Давхар тоолохоос сэргийл:</b> Харилцагч/хөрөнгө/барааны дэлгэрэнгүйг
            тусдаа таб дээр оруулсан бол «Дансны» таб дээр тэр дансны нийт дүнг
            дахин бичихгүй.
          </li>
          <li>
            <b>Идемпотент:</b> Таб бүр зөвхөн өөрийн хэсгийг дахин бичдэг тул
            «Хадгалах»/«Журналд тусгах»-ыг дахин дарахад давхардахгүй, шинэчилнэ.
          </li>
          <li>
            <b>Excel:</b> «Дансны», «Үндсэн хөрөнгийн», «Барааны» таб бүрд «Excel
            загвар татах» → бөглөх → «Excel-ээс импорт».
          </li>
        </ul>
      </Section>

      <div className="flex flex-wrap gap-3 pt-1">
        <Link
          href="/opening-balances"
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Эхний үлдэгдэл оруулж эхлэх →
        </Link>
        <Link
          href="/accounts"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Дансны жагсаалт харах
        </Link>
      </div>
    </div>
  );
}
