-- ============================================================
-- transactions — давхардсан гүйлгээ цэвэрлэх (огноо-түвшний)
-- ============================================================
-- Шалтгаан: давхцсан банкны хуулга 2 удаа орохдоо timestamp 8 цагаар (UTC/UB)
-- зөрсөн тул fingerprint (бүтэн цаг) давхардлыг танихгүй өнгөрүүлсэн.
-- Энд (данс + огноо + тайлбар + дүн + ХАРИЛЦАГЧ) ижил, харилцагчтай гүйлгээний
-- багц бүрт хамгийн БАГА id (анхных, кодлогдсон)-г үлдээж, бусдыг устгана.
-- Харилцагчгүй (банкны жижиг шимтгэл г.м.) нь хууль ёсны давталт тул хөндөхгүй.
--   node scripts/apply-sql.mjs scripts/dedup-transactions-keep-earliest.sql
-- ============================================================

WITH g AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY account_id, (txn_date::date),
        btrim(coalesce(description, '')),
        coalesce(income, 0) + coalesce(expense, 0),
        btrim(coalesce(counterparty, ''))
      ORDER BY id
    ) AS rn
  FROM transactions
  WHERE btrim(coalesce(counterparty, '')) <> ''
)
DELETE FROM transactions
WHERE id IN (SELECT id FROM g WHERE rn > 1);
