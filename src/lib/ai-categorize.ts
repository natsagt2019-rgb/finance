// AI гүйлгээ ангилал — банкны гүйлгээг Claude API-аар ангиллын кодод хуваарилна.
// Дүрэмд суурилсан coder.ts-ийг нөхөж, тодорхойгүй гүйлгээг ухаалаг ангилна.
//
// ANTHROPIC_API_KEY орчны хувьсагч шаардлагатай (.env.local).
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { CATEGORY_CODES, INCOME_CODES, EXPENSE_CODES } from "./bank-importer/config";

export type TxnToClassify = {
  description: string;
  counterparty: string;
  amount: number;
  direction: "income" | "expense";
};

export type Suggestion = {
  code: string; // ангиллын код ('1.1.1' г.м) эсвэл '' (тодорхойгүй)
  label: string; // кодын тайлбар
  confidence: number; // 0..1
};

const MODEL = "claude-opus-4-8";
const BATCH = 40; // нэг дуудлагад хэдэн гүйлгээ

// Ангиллын жагсаалтыг текст болгож промптод өгнө.
function codeMenu(codes: string[]): string {
  return codes.map((c) => `  ${c} — ${CATEGORY_CODES[c] ?? c}`).join("\n");
}

const SYSTEM = `Чи бол Монгол банкны гүйлгээг нягтлан бодох бүртгэлийн ангилалд хуваарилах туслах.
Гүйлгээ бүрийн тайлбар, харилцагч, дүн, чиглэл (орлого/зарлага)-ийг хараад ХАМГИЙН ТОХИРОХ нэг кодыг сонгоно.

ОРЛОГЫН кодууд:
${codeMenu(INCOME_CODES)}

ЗАРЛАГЫН кодууд:
${codeMenu(EXPENSE_CODES)}

Дүрэм:
- Орлогын гүйлгээнд зөвхөн ОРЛОГЫН код, зарлагын гүйлгээнд зөвхөн ЗАРЛАГЫН код сонго.
- Итгэлгүй бол хамгийн магадлалтайг сонгоод confidence-ийг бага (0.3-0.5) тавь.
- Огт тохирох код байхгүй бол code-г "" (хоосон) болгож confidence 0 тавь.
- confidence: 0..1 хооронд (0.9+ маш итгэлтэй, 0.5 дунд, 0.3 эргэлзээтэй).`;

const ResultSchema = z.object({
  results: z.array(
    z.object({
      index: z.number(),
      code: z.string(),
      confidence: z.number(),
    }),
  ),
});

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY тохируулаагүй байна (.env.local-д нэмнэ үү).",
    );
  }
  client ??= new Anthropic();
  return client;
}

function labelOf(code: string): string {
  return code ? (CATEGORY_CODES[code] ?? code) : "";
}

async function classifyBatch(txns: TxnToClassify[]): Promise<Suggestion[]> {
  const anthropic = getClient();

  const lines = txns
    .map(
      (t, i) =>
        `${i}. [${t.direction === "income" ? "ОРЛОГО" : "ЗАРЛАГА"}] ` +
        `дүн=${Math.round(t.amount).toLocaleString()} | ` +
        `харилцагч="${t.counterparty || "—"}" | тайлбар="${t.description || "—"}"`,
    )
    .join("\n");

  const response = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content:
          `Доорх ${txns.length} гүйлгээ бүрд тохирох кодыг сонго. ` +
          `index-ийг яг хадгал.\n\n${lines}`,
      },
    ],
    output_config: { format: zodOutputFormat(ResultSchema) },
  });

  const parsed = response.parsed_output;
  const byIndex = new Map<number, { code: string; confidence: number }>();
  for (const r of parsed?.results ?? []) {
    byIndex.set(r.index, { code: r.code, confidence: r.confidence });
  }

  // Зөвхөн чиглэлд тохирох кодыг хүлээж авна (буруу талын кодыг хасна).
  return txns.map((t, i) => {
    const r = byIndex.get(i);
    const valid =
      t.direction === "income" ? INCOME_CODES : EXPENSE_CODES;
    const code = r && valid.includes(r.code) ? r.code : "";
    return {
      code,
      label: labelOf(code),
      confidence: code ? Math.max(0, Math.min(1, r?.confidence ?? 0)) : 0,
    };
  });
}

// Олон гүйлгээг багцлан ангилна. Дараалал хадгалагдана.
export async function aiClassify(
  txns: TxnToClassify[],
): Promise<Suggestion[]> {
  const out: Suggestion[] = [];
  for (let i = 0; i < txns.length; i += BATCH) {
    const slice = txns.slice(i, i + BATCH);
    out.push(...(await classifyBatch(slice)));
  }
  return out;
}
