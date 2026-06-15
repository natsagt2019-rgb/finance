// Нэхэмжлэх г.м. баримтад хэвлэгдэх компанийн тогтмол мэдээлэл.
// Шаардлагатай бол энд засна.
export const COMPANY = {
  name: '"Түмэн Тээх" ХХК',
  nameUpper: "ТҮМЭН ТЭЭХ ХХК",
  address:
    "Монгол ТВ таур 1106 тоот, Сүхбаатар дүүрэг, 1 хороо, Чингисийн өргөн чөлөө, Улаанбаатар",
  phone: "77751111",
  email: "hello@tumentech.mn",
  web: "www.tumentech.mn",
  register: "6906192", // ТТД
  taxId: "9011842351", // НӨАТ
  bankName: "Худалдаа Хөгжлийн банк",
  bankAccount: "411096635",
  bankIban: "MN320004000411096635",
  director: "", // Захирал (гарын үсэгт)
  accountant: "", // Нягтлан (гарын үсэгт)
} as const;

export const VAT_RATE = 0.1; // НӨАТ 10%
