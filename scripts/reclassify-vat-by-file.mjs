// Өгөгдсөн eBarimt Excel файлыг задлаад, түүний ДДТД-уудад тохирох vat_records
// бичлэгийн `type`-ийг файлын зөв ангилалд (parseVatExcel-ийн дүгнэлт) тааруулна.
// Буруу ангилсан файлыг засахад хэрэглэнэ (ж: "Нэхэмжлэх (undefined)" → in).
//
//   node --experimental-strip-types scripts/reclassify-vat-by-file.mjs <файл.xlsx>
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import { parseVatExcel } from "../src/lib/vat-import.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  try {
    const txt = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch {
    /* env */
  }
}
loadEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const path = process.argv[2];
if (!path) {
  console.error("Хэрэглээ: node --experimental-strip-types scripts/reclassify-vat-by-file.mjs <файл.xlsx>");
  process.exit(1);
}

const res = parseVatExcel(readFileSync(path), basename(path));
console.log(`→ ${basename(path).slice(0, 50)}  [${res.format}]  ${res.rows.length} мөр, зөв төрөл = ${res.rows[0]?.type}`);

// Төрлөөр бүлэглэж, ддтд-аар update.
const byType = { in: [], out: [] };
for (const r of res.rows) if (r.ddtd) byType[r.type].push(r.ddtd);

let updated = 0;
for (const type of ["in", "out"]) {
  const ddtds = [...new Set(byType[type])];
  for (let i = 0; i < ddtds.length; i += 100) {
    const slice = ddtds.slice(i, i + 100);
    const inList = slice.map((d) => `"${d}"`).join(",");
    const r = await fetch(`${URL}/rest/v1/vat_records?ddtd=in.(${encodeURIComponent(inList)})`, {
      method: "PATCH",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify({ type }),
    });
    if (!r.ok) {
      console.error("❌", r.status, (await r.text()).slice(0, 200));
      process.exit(1);
    }
    updated += (await r.json()).length;
  }
}
console.log(`✅ ${updated} бичлэгийн төрөл шинэчлэгдлээ.`);
