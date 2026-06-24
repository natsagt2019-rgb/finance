import Link from "next/link";

export const metadata = { title: "Дансны төлөвлөгөө — заавар" };

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

function Code({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-rose-600">{children}</span>;
}

export default function AccountsHelpPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">📋 Дансны төлөвлөгөө — заавар, гарын авлага</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Аж ахуйн нэгжийн дансны мод (chart of accounts) байгуулах: кодын бүтэц, дансны төрөл, данс
          нэмэх/засах/устгах, мод дэлгэх ба тайлантай уялдах зарчим.
        </p>
      </div>

      <Section icon="✨" title="Танилцуулга">
        <p>
          <b>Дансны төлөвлөгөө</b> (дансны мод) нь нягтлан бодох бүртгэлийн <b>үндэс</b> — бүх гүйлгээ,
          журнал, тайлан энэ дансууд дээр тулгуурлана. Данс бүр <b>код</b>, <b>нэр</b>, <b>төрөл</b>,
          <b> ангилал (эх данс)</b>-тай. Гүйлгээ нь давхар бичилтээр данс хооронд дебет/кредит хөдөлгөнө.
        </p>
        <p className="text-zinc-500">
          Дансны жагсаалт нь <b>хэсэг → бүлэг → данс</b> гэсэн модлог бүтэцтэй, кодын эхний оронгуудаар
          автоматаар бүлэглэгдэнэ.
        </p>
      </Section>

      <Section icon="🔢" title="1. Дансны кодын бүтэц (AABBCC)">
        <p>Код нь 6 оронтой, эхний оронгуудаар модны түвшинг тодорхойлно:</p>
        <p className="text-zinc-500">
          • <b>1 дэх орон</b> = <b>хэсэг</b> (жишээ <Code>1</Code> Эргэлтийн хөрөнгө … <Code>5</Code> Орлого, <Code>7</Code> Зардал).<br />
          • <b>1–2 дахь орон</b> = <b>бүлэг</b> (<Code>11</Code> Банкны харилцах, <Code>15</Code> Бараа материал, <Code>16</Code> Үндсэн хөрөнгө …).<br />
          • <b>Бүтэн код</b> = тухайн <b>данс</b> (<Code>160300</Code> Машин, тоног төхөөрөмж).
        </p>
        <p>9 хэсэг: <Code>1</Code> Эргэлтийн хөрөнгө · <Code>2</Code> Үндсэн хөрөнгө · <Code>3</Code> Өр төлбөр ·
          <Code>4</Code> Өмч · <Code>5</Code> Орлого · <Code>6</Code> Борлуулалтын өртөг · <Code>7</Code> Зардал ·
          <Code>8</Code> Бусад орлого/зардал · <Code>9</Code> Татвар/хаалт.</p>
      </Section>

      <Section icon="🏷" title="2. Дансны 5 төрөл">
        <p>Данс бүр дараах <b>төрөл</b>-ийн нэг байна (тайлан, тэнцэлд зөв тусахын тулд чухал):</p>
        <p className="text-zinc-500">
          • <b>Хөрөнгө</b> (asset) — дебетээр өснө · <b>Өр төлбөр</b> (liability) — кредитээр өснө ·
          <b> Өмч</b> (equity) — кредитээр · <b>Орлого</b> (income) — кредитээр · <b>Зардал</b> (expense) — дебетээр.
        </p>
        <p>«Шинж» талбар (<b>Актив / Пассив</b>) ба <b>ББӨ</b> (борлуулсан барааны өртгийн данс) тэмдэглэгээ нэмэлт
          ангилалд хэрэглэгдэнэ.</p>
      </Section>

      <Section icon="➕" title="3. Шинэ данс нэмэх">
        <Step n={1}>Дээд талын <b>«+ Данс нэмэх»</b> товчийг дарна.</Step>
        <Step n={2}><b>Код</b> (жишээ <Code>311005</Code>) ба <b>Нэр</b>-ийг бичнэ. Код давхцахгүй байх ёстой.</Step>
        <Step n={3}><b>Төрөл</b> (Хөрөнгө/Өр төлбөр/Өмч/Орлого/Зардал) сонгоно — тайланд зөв тусах суурь.</Step>
        <Step n={4}><b>Бүлэг (эх данс)</b>, <b>валют</b> (MNT/USD…), <b>Санхүүгийн тайлангийн мөр (fs_line)</b>-ийг
          тохируулна. Гадаад валютын данс бол валютыг сонгоно.</Step>
        <Step n={5}><b>«Хадгалах»</b> дарна — данс модонд кодынхоо байрлалд орж харагдана.</Step>
        <p className="text-zinc-500">Код нь модны бүлэглэлийг тодорхойлдог тул зөв хэсэг/бүлгийн дугаараар эхлүүлээрэй
          (жишээ банкны данс <Code>11…</Code>, зардал <Code>7…</Code>).</p>
      </Section>

      <Section icon="✏" title="4. Засах ба устгах">
        <p>Данс бүрийн мөрөнд <b>«Засах»</b> (нэр, төрөл, валют, fs_line өөрчлөх) ба <b>«Устгах»</b> товч бий.
          Гүйлгээтэй холбогдсон дансыг устгах боломжгүй — оронд нь идэвхгүй болгоно.</p>
      </Section>

      <Section icon="🌳" title="5. Мод дэлгэх / хаах ба сонгож нээх">
        <p>Жагсаалт нь хэсэг/бүлгээр эвхэгддэг:</p>
        <p className="text-zinc-500">
          • <b>«Бүгд нээх / Бүгд хаах»</b> — модыг бүхэлд нь дэлгэх/хумих.<br />
          • Хэсэг, бүлэг, данс бүрийн зүүн талын <b>checkbox</b>-оор тэмдэглээд <b>«Сонгосныг нээх»</b> дарвал
          зөвхөн сонгосон зүйлс (данс сонгосон бол түүний эх бүлэг/хэсэг) дэлгэгдэнэ. <b>«Сонгосныг хаах»</b>-аар
          хумина, <b>«Цэвэрлэх»</b>-ээр сонголтыг арилгана.
        </p>
        <p>Дээд талын <b>таб</b>-аар (Хөрөнгө / Өр төлбөр / Өмч / Орлого / Зардал) төрлөөр шүүж болно.</p>
      </Section>

      <Section icon="🏗" title="6. Хуримтлагдсан элэгдэл — ангилал бүрээр">
        <p>Үндсэн хөрөнгийн ангилал бүр өөрийн <b>хуримтлагдсан элэгдлийн (контра) данс</b>-тай байна
          (жишээ <Code>160300</Code> Машин → <Code>160390</Code> хуримтлагдсан элэгдэл). Элэгдлийн журнал
          тухайн ангиллын дансаар автоматаар бичигдэнэ — балансад ангилал тус бүрийн цэвэр үнэ зөв гарна.</p>
      </Section>

      <Section icon="📊" title="7. Тайлантай уялдах">
        <p>Данс бүрийн <b>төрөл</b> ба <b>fs_line</b> нь санхүүгийн тайланд хаана тусахыг тодорхойлно:
          гүйлгээ баланс, ерөнхий данс, <b>санхүүгийн байдлын тайлан</b> (баланс), <b>орлогын тайлан</b>.
          Тиймээс шинэ данс нэмэхдээ төрөл ба тайлангийн мөрийг зөв оноох нь чухал.</p>
      </Section>

      <Section icon="✅" title="8. Зөвлөмж (дараалал)">
        <Step n={1}>Эхлээд <b>дансны төлөвлөгөөг</b> бүрэн байгуулна (энэ хуудас).</Step>
        <Step n={2}>Дараа нь <Link href="/help/opening-balances" className="underline">эхний үлдэгдэл</Link> оруулна.</Step>
        <Step n={3}>Тэгээд модулиуд (Банк/Касс, Бараа материал, Үндсэн хөрөнгө, Цалин) гүйлгээ бүртгэж эхэлнэ.</Step>
        <p className="pt-1">
          <Link href="/accounts" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700">
            Дансны жагсаалт руу очих →
          </Link>
        </p>
      </Section>
    </div>
  );
}
