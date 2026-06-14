import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { moneyToWordsMn } from "@/lib/num-to-words-mn";

function fmt(n: number | null): string {
  if (n == null) return "";
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const Dots = ({ w = "100%", v }: { w?: string; v?: string | null }) => (
  <span
    className="inline-block border-b border-dotted border-zinc-500 align-bottom"
    style={{ minWidth: w }}
  >
    <span className="px-1 font-medium text-zinc-900">{v || " "}</span>
  </span>
);

export default async function CashVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: e } = await supabase
    .from("cash_entries")
    .select(
      "id, date, type, amount, amount_mnt, doc_no, description, company, partner_id, partner_name, payer, register_id",
    )
    .eq("id", Number(id))
    .maybeSingle();

  if (!e) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
        Баримт олдсонгүй (id={id}).
      </div>
    );
  }

  const [{ data: partner }, { data: reg }] = await Promise.all([
    e.partner_id
      ? supabase.from("partners").select("name").eq("id", e.partner_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("cash_registers").select("name").eq("id", e.register_id).maybeSingle(),
  ]);

  const isIn = e.type === "in";
  const d = new Date(e.date);
  const yy = d.getUTCFullYear();
  const mm = d.getUTCMonth() + 1;
  const dd = d.getUTCDate();
  const amount = Number(e.amount_mnt) || Number(e.amount) || 0;
  // Мөнгө тушаагч/хүлээн авагч: тушаагчийн нэр → харилцагчийн снапшот → partner_id-аар.
  const partnerName =
    e.payer ||
    e.partner_name ||
    (partner as { name: string } | null)?.name ||
    "";
  const orgName =
    e.company === "ТҮМЭН РЕСУРС" ? "Түмэн Ресурс ХХК" : "Түмэн Тээх ХХК";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <a href="/cash" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Касс руу буцах
        </a>
        <PrintButton />
      </div>

      {/* Маягт — A5 хэмжээтэй, хэвлэхэд тохирсон */}
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 text-sm leading-7 text-zinc-800 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <div className="text-right text-[11px] leading-4 text-zinc-500">
          Сангийн сайдын 2017 оны
          <br />
          347 дугаар тушаалын хавсралт
          <br />
          <span className="font-medium">НХМаягт {isIn ? "МХ-1" : "МХ-2"}</span>
        </div>

        <h2 className="mt-2 text-center text-base font-bold uppercase text-zinc-900">
          Бэлэн мөнгөний {isIn ? "орлогын" : "зарлагын"} баримт
        </h2>

        <div className="mt-4 flex items-end justify-between">
          <span>
            Дугаар <Dots w="80px" v={e.doc_no} />
          </span>
          <span>
            <Dots w="40px" v={String(yy)} /> он <Dots w="28px" v={String(mm)} /> сар{" "}
            <Dots w="28px" v={String(dd)} /> өдөр
          </span>
        </div>

        <div className="mt-3">
          Байгууллагын нэр: <Dots w="280px" v={orgName} />
        </div>
        <div className="mt-2">
          Мөнгө {isIn ? "тушаагч" : "хүлээн авагч"}: <Dots w="300px" v={partnerName} />
        </div>
        <div className="mt-2">
          Гүйлгээний утга: <Dots w="320px" v={e.description} />
        </div>

        <div className="mt-3">
          {isIn ? "Тушаасан" : "Олгосон"} мөнгөний дүн:{" "}
          <span className="font-semibold">{fmt(amount)}</span> төгрөг
        </div>
        <div className="mt-1">
          <span className="text-zinc-500">/үсгээр/</span>{" "}
          <Dots w="360px" v={moneyToWordsMn(amount)} />
        </div>

        <div className="mt-3 text-zinc-500">
          Хавсаргасан баримт:{" "}
          <span className="inline-block w-72 border-b border-dotted border-zinc-400">
            &nbsp;
          </span>
        </div>
        <div className="mt-1 text-[11px] text-zinc-400">
          Касс: {(reg as { name: string } | null)?.name ?? ""}
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex justify-between">
            <span>
              Захирал/Дарга: <Dots w="120px" /> /<span className="px-6" />/
            </span>
            <span>Тэмдэг</span>
          </div>
          <div>
            Нягтлан бодогч: <Dots w="180px" /> /<span className="px-6" />/
          </div>
          <div>
            Мөнгө {isIn ? "хүлээн авсан" : "олгосон"}: <Dots w="160px" /> /
            <span className="px-6" />/
          </div>
          <div>
            Мөнгө {isIn ? "тушаагч" : "хүлээн авагч"}: <Dots w="160px" /> /
            <span className="px-6" />/
          </div>
        </div>
      </div>
    </div>
  );
}
