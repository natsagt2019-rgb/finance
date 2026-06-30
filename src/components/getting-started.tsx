"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Шинэ хэрэглэгчид зориулсан эхлэх заавар. Хэрэглэгч хаавал
// localStorage-д тэмдэглэж, дараагийн удаа нуудаг.
const STORAGE_KEY = "nege:getting-started:hidden";

type Step = {
  href: string;
  icon: string;
  title: string;
  desc: string;
};

// Зөвлөмжийн дараалал — систем тохируулж эхлэх логик урсгал.
const STEPS: Step[] = [
  {
    href: "/accounts",
    icon: "🗂",
    title: "1. Дансны жагсаалт",
    desc: "Хамгийн түрүүнд дансны төлөвлөгөөгөө (Cash, Авлага, Өглөг, Орлого, Зардал…) үүсгэнэ. Энэ бол бүх бүртгэлийн суурь.",
  },
  {
    href: "/partners",
    icon: "👥",
    title: "2. Харилцагчид",
    desc: "Худалдан авагч, нийлүүлэгч, ажилтан зэрэг харилцагчдаа бүртгэнэ. Авлага/өглөгийг тэдгээрт холбоно.",
  },
  {
    href: "/opening-balances",
    icon: "◔",
    title: "3. Эхний үлдэгдэл",
    desc: "Системд шилжихийн өмнөх үлдэгдлүүдээ (данс, харилцагч, үндсэн хөрөнгө, бараа) оруулна. Зөв тайлангийн эхлэл цэг.",
  },
  {
    href: "/settings/bank-accounts",
    icon: "🏦",
    title: "4. Банкны данс бүртгэх",
    desc: "Тохиргоо → Банкны данс дээр банкны дансаа (дугаар, банк ТДБ/Голомт/М/Хас, валют, харилцах GL данс) бүртгэнэ. Хуулга оруулахад заавал хэрэгтэй.",
  },
  {
    href: "/import",
    icon: "↧",
    title: "5. Дансны хуулга оруулах",
    desc: "Банкны хуулгаа Excel-ээр импортлож цэгцэлнэ. Файлын дансны дугаараар (эсвэл доторх агуулгаар) бүртгэсэн данс автоматаар танигдана.",
  },
  {
    href: "/categorize",
    icon: "✨",
    title: "6. AI ангилал",
    desc: "Импортолсон гүйлгээнүүдийг AI-аар автоматаар ангилж, харгалзах данс/харилцагчид хуваарилна.",
  },
  {
    href: "/journals",
    icon: "📒",
    title: "7. Журнал бичих",
    desc: "Автоматаар үүсээгүй гүйлгээг (тохируулга, цалин, элэгдэл г.м.) гар журналаар Дт/Кт-оор бичнэ.",
  },
  {
    href: "/purchases",
    icon: "🛒",
    title: "8. Худалдан авалт / Борлуулалт",
    desc: "Бараа, үйлчилгээ худалдан авах, борлуулах гүйлгээг бүртгэнэ. НӨАТ-ыг автоматаар тооцож, авлага/өглөг үүсгэнэ.",
  },
  {
    href: "/receivables",
    icon: "🤝",
    title: "9. Авлага / Өглөг",
    desc: "Харилцагч бүрийн авлага, өглөгийг насжилтаар (0–30 … 90+ хоног) автоматаар хянана. Төлбөрийг FIFO-гоор хаана.",
  },
  {
    href: "/inventory",
    icon: "📦",
    title: "10. Бараа материал / Гааль",
    desc: "Барааны орлого/зарлага, үлдэгдэл, өртгийг (FIFO) хөтөлнө. Гаалийн импортыг landed-cost-оор (татвар, тээвэр шингээж) орлогод авна.",
  },
  {
    href: "/assets",
    icon: "🏗",
    title: "11. Үндсэн хөрөнгө",
    desc: "Үндсэн хөрөнгийг бүртгэж, элэгдлийг автоматаар тооцоолно. Шилжүүлэг, хасалт, борлуулалтыг хөтөлнө.",
  },
  {
    href: "/salary",
    icon: "💰",
    title: "12. Цалин",
    desc: "Ажилтны цалин, НДШ, ХХОАТ-ыг тооцож, журналд автоматаар холбоно.",
  },
  {
    href: "/reports/vat-return",
    icon: "🏛",
    title: "13. Татварын тайлан",
    desc: "НӨАТ (TT-03а), ААНОАТ (TT-02), ХХОАТ (TT-11) тайланг гүйлгээнээс автоматаар бэлтгэнэ.",
  },
  {
    href: "/reports/balance-sheet",
    icon: "📊",
    title: "14. Тайлан харах",
    desc: "Гүйлгээ баланс, Санхүүгийн байдал, Орлого, Мөнгөн гүйлгээ зэрэг бүрэн санхүүгийн тайланг гаргана.",
  },
];

export function GettingStarted() {
  // SSR/CSR зөрөхөөс сэргийлж эхэндээ нуухгүй; mount дээр localStorage уншина.
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHidden(localStorage.getItem(STORAGE_KEY) === "1");
    setReady(true);
  }, []);

  function hide() {
    localStorage.setItem(STORAGE_KEY, "1");
    setHidden(true);
  }

  function show() {
    localStorage.removeItem(STORAGE_KEY);
    setHidden(false);
  }

  if (!ready) return null;

  if (hidden) {
    return (
      <div className="mt-6">
        <button
          type="button"
          onClick={show}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          <span>💡</span> Эхлэх заавар харах
        </button>
      </div>
    );
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <header className="flex items-start justify-between gap-3 border-b border-blue-100 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <span>💡</span> Системд тавтай морил — эхлэх заавар
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Анх ороход дата хоосон байна. Доорх дарааллаар эхэлбэл хамгийн хялбар:{" "}
            <span className="font-medium">1–7 эхний тохиргоо</span>,{" "}
            <span className="font-medium">8–13 өдөр тутмын модуль</span>,{" "}
            <span className="font-medium">14 тайлан</span>. Бүх модуль{" "}
            <span className="font-medium">зүүн талын цэс</span>-нд байрлана.
          </p>
        </div>
        <button
          type="button"
          onClick={hide}
          aria-label="Зааврыг хаах"
          className="shrink-0 rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-white hover:text-zinc-700"
        >
          Нуух ✕
        </button>
      </header>

      <ol className="grid grid-cols-1 gap-px bg-blue-100 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.href} className="bg-white">
            <Link
              href={s.href}
              className="flex h-full flex-col gap-1.5 px-4 py-3.5 transition-colors hover:bg-blue-50"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                <span className="text-base">{s.icon}</span>
                {s.title}
              </span>
              <span className="text-xs leading-relaxed text-zinc-500">
                {s.desc}
              </span>
            </Link>
          </li>
        ))}
        <li className="bg-white">
          <div className="flex h-full flex-col justify-center gap-2 px-4 py-3.5">
            <span className="text-xs font-medium text-zinc-400">
              Хурдан зөвлөмж
            </span>
            <ul className="space-y-1 text-xs leading-relaxed text-zinc-500">
              <li>• Самбар дээрх огноо сонгож тухайн өдрийн байдлаар харна.</li>
              <li>• Гар утсан дээр зүүн дээд ☰ товчоор цэс нээнэ.</li>
              <li>• «Хэрэглэгчид» цэснээс шинэ хэрэглэгч урина.</li>
            </ul>
          </div>
        </li>
      </ol>
    </section>
  );
}
