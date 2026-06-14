// Тоог монгол үсгээр бичих (анхан шатны баримтын "үсгээр" хэсэгт).
// Жишээ: 1234567 → "нэг сая хоёр зуун гучин дөрвөн мянга таван зуун жаран долоо"

const ONES = ["", "нэг", "хоёр", "гурав", "дөрөв", "тав", "зургаа", "долоо", "найм", "ес"];
// Холбоос хэлбэр (дараа нь үг/нэр орвол).
const ONES_A = ["", "нэгэн", "хоёр", "гурван", "дөрвөн", "таван", "зургаан", "долоон", "найман", "есөн"];
const TENS = ["", "арав", "хорь", "гуч", "дөч", "тавь", "жар", "дал", "ная", "ер"];
const TENS_A = ["", "арван", "хорин", "гучин", "дөчин", "тавин", "жаран", "далан", "наян", "ерэн"];
const SCALES = ["", "мянга", "сая", "тэрбум", "их наяд", "тунамал"];

// 0..999 бүлгийг үсгээр. last=энэ бүлэг тооны эцсийн (терминал хэлбэр) эсэх.
function group3(n: number, last: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  const w: string[] = [];
  if (h) {
    const hLast = t === 0 && o === 0;
    w.push(ONES_A[h] + (last && hLast ? " зуу" : " зуун"));
  }
  if (t) {
    const tLast = o === 0;
    w.push(last && tLast ? TENS[t] : TENS_A[t]);
  }
  if (o) {
    w.push(last ? ONES[o] : ONES_A[o]);
  }
  return w.join(" ");
}

export function numToWordsMn(num: number): string {
  let n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return "тэг";
  const groups: number[] = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    const isLastGroup = !groups.slice(0, i).some((g) => g > 0);
    if (i === 0) {
      parts.push(group3(groups[i], true));
    } else {
      parts.push(group3(groups[i], false) + " " + SCALES[i]);
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

// Мөнгөн дүн → "X төгрөг" (бутархайтай бол ... мөнгө).
export function moneyToWordsMn(amount: number): string {
  const a = Number(amount) || 0;
  const tug = Math.floor(Math.abs(a));
  const mongo = Math.round((Math.abs(a) - tug) * 100);
  let s = `${numToWordsMn(tug)} төгрөг`;
  if (mongo > 0) s += ` ${numToWordsMn(mongo)} мөнгө`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
