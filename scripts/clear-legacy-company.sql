-- Хуучин template-ийн "Түмэн Тээх/Ресурс" company нэрийг цэвэрлэх.
-- Энэ project нь нэг байгууллага (Нэгэ Финанс ХХК) тул компани бүлэглэл хэрэггүй.
UPDATE bank_accounts  SET company = NULL WHERE company IS NOT NULL;
UPDATE cash_registers SET company = NULL WHERE company IS NOT NULL;
