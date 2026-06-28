import Link from "next/link";

export const metadata = { title: "Гаалийн өртөг бодолт — заавар" };

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

export default function LandedCostHelpPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">🛃 Гаалийн худалдан авалт — өртөг бодолт (заавар, гарын авлага)</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Импортоор авсан барааны гаалийн татвар, тээвэр, хадгалалтын зардлыг барааны өртөгт хэрхэн шингээж (landed cost),
          журнал бичиж, тайлан гаргах талаар.
        </p>
      </div>

      <Section icon="✨" title="Танилцуулга">
        <p>
          Гадаадаас (ж: Хятадаас RMB-р) бараа импортлоход худалдан авах үнэ (FOB)-ээс гадна
          <b> гаалийн албан татвар, тээвэр, хадгалалт</b> зэрэг нэмэлт зардал гардаг. Эдгээрийг
          барааны өртөгт <b>шингээх</b> ёстой — энэ нь нэг нэгжийн бодит өртгийг (landed cost) гаргаж,
          борлуулалтын ашгийг зөв тооцоход чухал.
        </p>
        <p>
          <b>«Бараа материал → Гаалийн өртөг тооцоо»</b> хуудас нь эдгээр зардлыг бараа бүрд автоматаар
          хувиарлаж, landed нэгж өртгийг бодож, тайлан гаргаад, барааг <b>орлогод авч журнал</b> бичнэ.
        </p>
      </Section>

      <Section icon="🧮" title="Үндсэн томьёо">
        <p className="rounded-lg bg-zinc-50 px-3 py-2 font-medium text-zinc-800">
          Landed өртөг = FOB (валют × ханш) + Гаалийн татвар + Тээвэр + Хадгалалт
        </p>
        <p>
          <b>Импортын НӨАТ нь өртөгт ОРОХГҮЙ</b> — нөхөн төлөгддөг (буцаан авдаг) тул тусад нь
          «НӨАТ-ын авлага» (130600) дансанд бичигдэнэ.
        </p>
        <p>Нэмэлт зардлыг бараа бүрд <b>үнийн дүнгээр</b> (эсвэл тоо хэмжээгээр) хувиарлана.</p>
      </Section>

      <Section icon="📋" title="Алхам алхмаар">
        <Step n={1}><b>Валют ба ханш</b> сонгоно (CNY/USD/EUR…). Валют сонгоход ойролцоо ханш автоматаар бөглөгдөнө — гараар засна.</Step>
        <Step n={2}><b>Бараа мөрүүдийг</b> оруулна: бараа сонгож, тоо хэмжээ, FOB нэгж үнэ (валютаар). Олон бараа бол <b>Excel-ээс импортлоно</b> (доор үз).</Step>
        <Step n={3}><b>Гаалийн татвар</b> (%-аар эсвэл бодит дүнгээр), <b>тээвэр</b>, <b>хадгалалт</b>-ыг оруулна. Эдгээрийг урьдчилж төлсөн данснаас (УТЗ/УТТ) <b>татаж оруулж</b> болно (доор үз).</Step>
        <Step n={4}><b>Хувиарлах арга</b> (үнээр/тоогоор) ба <b>төлбөрийн данс</b> (импортын НӨАТ-ыг төлсөн банк/касс)-ыг сонгоно.</Step>
        <Step n={5}>Доорх <b>«Гаалийн өртөг тооцооны тайлан»</b>-д бараа бүрийн FOB, гааль, тээвэр, хадгалалт, <b>landed нэгж өртөг</b> шууд бодогдоно. <b>Хэвлэх</b> эсвэл <b>Excel татах</b>.</Step>
        <Step n={6}><b>«Орлогод авах + журнал бичих»</b> дарж барааг landed өртгөөр нөөцөд оруулна. Дараа нь <b>Орлогын баримт (БМ-2)</b> хэвлэнэ.</Step>
      </Section>

      <Section icon="🏦" title="Нэмэлт зардлыг УТЗ / УТТ данснаас татах">
        <p>
          Тээвэр, хадгалалт, гаалийн татварыг ихэвчлэн урьдчилж төлдөг бөгөөд тэдгээр нь дараах
          дансанд хүлээгдэж байдаг:
        </p>
        <ul className="ml-1 list-disc space-y-1 pl-5">
          <li><b>УТЗ — Урьдчилж төлсөн зардал (140200):</b> тээвэр, хадгалалт.</li>
          <li><b>УТТ — Урьдчилж төлсөн татвар (140300):</b> гаалийн албан татвар.</li>
        </ul>
        <Step n={1}>Зардал бүрийн хажуугийн <b>эх данс</b>-ыг сонгоно (анхдагч: гааль→УТТ, тээвэр/хадгалалт→УТЗ).</Step>
        <Step n={2}><b>«↧ Үлдэгдэл татах»</b> дарвал тухайн дансны одоогийн үлдэгдэл дүнд автоматаар бичигдэнэ.</Step>
        <Step n={3}>Орлогод авахад <b>банкны оронд тэр эх данс кредитлэгдэж</b>, урьдчилж төлсөн төлбөр хаагдана.</Step>
        <p className="text-zinc-500">Хэрэв бэлнээр төлсөн бол эх дансыг банк/касс болгож сонгоно.</p>
      </Section>

      <Section icon="📒" title="Журналын бичилт (жишээ)">
        <p>FOB 980,000₮ + гааль 49,000 + тээвэр 1,000,000 + хадгалалт 300,000, импортын НӨАТ 102,900:</p>
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr><th className="px-2 py-1.5 text-left">Дт данс</th><th className="px-2 py-1.5 text-left">Кт данс</th><th className="px-2 py-1.5 text-right">Дүн</th><th className="px-2 py-1.5 text-left">Утга</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 tabular-nums">
              <tr><td className="px-2 py-1">150xxx Бараа</td><td className="px-2 py-1">310100 Өглөг</td><td className="px-2 py-1 text-right">980,000</td><td className="px-2 py-1 text-zinc-500">FOB → нийлүүлэгч</td></tr>
              <tr><td className="px-2 py-1">150xxx Бараа</td><td className="px-2 py-1">140300 УТТ</td><td className="px-2 py-1 text-right">49,000</td><td className="px-2 py-1 text-zinc-500">Гааль</td></tr>
              <tr><td className="px-2 py-1">150xxx Бараа</td><td className="px-2 py-1">140200 УТЗ</td><td className="px-2 py-1 text-right">1,300,000</td><td className="px-2 py-1 text-zinc-500">Тээвэр + хадгалалт</td></tr>
              <tr><td className="px-2 py-1">130600 НӨАТ авлага</td><td className="px-2 py-1">110200 Банк</td><td className="px-2 py-1 text-right">102,900</td><td className="px-2 py-1 text-zinc-500">Импортын НӨАТ (нөхөгдөх)</td></tr>
            </tbody>
          </table>
        </div>
        <p>Барааны нөөцөд шингэх landed нийт = <b>2,329,000₮</b> (FOB-оос ~138% өндөр). Дараа нь зарлага хийхэд энэ өртгөөр ББӨ бодогдоно.</p>
      </Section>

      <Section icon="📊" title="Excel импорт / экспорт">
        <Step n={1}><b>«↓ Excel загвар»</b> татаж, баганад (Код/SKU, Барааны нэр, Тоо хэмжээ, FOB нэгж үнэ) бараагаа бөглөнө. 2-р хуудсанд барааны лавлах байна.</Step>
        <Step n={2}><b>«↥ Excel-ээс мөр оруулах»</b> — олон барааг нэг дор оруулна (SKU/нэрээр тааруулна).</Step>
        <Step n={3}><b>«↧ Excel татах (тайлан)»</b> — тооцооны тайланг Excel болгож хадгална.</Step>
      </Section>

      <Section icon="💡" title="Зөвлөмж, анхаарах зүйл">
        <ul className="ml-1 list-disc space-y-1 pl-5">
          <li>Тохиргоонд <b>ангилал бүр</b> зөв БМ данстай (150xxx) холбогдсон байх ёстой — эс бол журнал бичигдэхгүй.</li>
          <li>Гаалийн татварыг <b>бодит дүнгээр</b> (гаалийн мэдүүлгээс) оруулбал хамгийн нарийвчлалтай. % нь зөвхөн ойролцоо тооцоо.</li>
          <li>Ханшийг <b>гаалийн мэдүүлгийн өдрийн</b> ханшаар оруулна.</li>
          <li>Импортын НӨАТ-ыг өртөгт <b>бүү оруул</b> — нөхөн төлөгддөг.</li>
          <li>Нийлүүлэгчид RMB өглөгөө дараа өөр ханшаар төлвөл <b>ханшийн олз/гарз</b> үүснэ (тусад нь журналд бичнэ).</li>
        </ul>
      </Section>

      <Section icon="🔗" title="Холбоос">
        <p className="flex flex-wrap gap-2">
          <Link href="/inventory/landed-cost" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700">
            Гаалийн өртөг тооцоо →
          </Link>
          <Link href="/inventory/issue-import" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
            Зарлага импорт (Excel)
          </Link>
          <Link href="/help/inventory" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
            Бараа материал — заавар
          </Link>
        </p>
      </Section>
    </div>
  );
}
