-- ============================================================
-- Accounts.fs_line засвар — баланс тайланд хөрөнгийн мөр орохгүй байвал
-- ============================================================
-- accounts-seed.sql "IF count=0" нөхцөлтэй тул хуучин accounts байвал
-- fs_line тохируулагдаагүй хэвээр үлдэнэ. Энэ script нь БҮГДИЙГ UPDATE
-- хийнэ (аль хэдийн зөв байвал өөрчлөхгүй — WHERE нөхцөл шүүнэ).
-- Supabase SQL Editor-д ажиллуулна.
-- ============================================================

UPDATE accounts SET fs_line = 'СБТ 1.1.1 Мөнгө, түүнтэй адилтгах хөрөнгө'
WHERE code IN ('100101','110101','110102','110103','110104',
               '110100','110200','110300','110400','110500','110600','110700')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 1.1.1 Мөнгө, түүнтэй адилтгах хөрөнгө');

UPDATE accounts SET fs_line = 'СБТ 1.1.2 Дансны авлага'
WHERE code IN ('120101','130100')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 1.1.2 Дансны авлага');

UPDATE accounts SET fs_line = 'СБТ 1.1.3 Татвар, НДШ-ийн авлага'
WHERE code IN ('120201','120301','120401','120501','120502',
               '130500','130600')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 1.1.3 Татвар, НДШ-ийн авлага');

UPDATE accounts SET fs_line = 'СБТ 1.1.4 Бусад авлага'
WHERE code IN ('120601','120105',
               '130200','130300','130400','130700','130800','130900')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 1.1.4 Бусад авлага');

UPDATE accounts SET fs_line = 'СБТ 1.1.5 Бусад санхүүгийн хөрөнгө'
WHERE code IN ('120100','120200','120900')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 1.1.5 Бусад санхүүгийн хөрөнгө');

UPDATE accounts SET fs_line = 'СБТ 1.1.6 Бараа материал'
WHERE code IN (
  '140101','140201','140301','140401','140501','140601',
  '150101','150102','150103','150201',
  '150100','150200','150300','150400','150500','150600','150700'
)
  AND (fs_line IS NULL OR fs_line <> 'СБТ 1.1.6 Бараа материал');

UPDATE accounts SET fs_line = 'СБТ 1.1.7 Урьдчилж төлсөн зардал/тооцоо'
WHERE code IN ('180101','180102','140100','140200','140300','140900')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 1.1.7 Урьдчилж төлсөн зардал/тооцоо');

UPDATE accounts SET fs_line = 'СБТ 1.1.8 Бусад эргэлтийн хөрөнгө'
WHERE code IN ('140900','140800')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 1.1.8 Бусад эргэлтийн хөрөнгө');

-- Үндсэн хөрөнгө (дансны код 200xxx-201xxx эсвэл 160xxx)
UPDATE accounts SET fs_line = 'СБТ 1.2.1 Үндсэн хөрөнгө'
WHERE code IN (
  '200201','200301','200401','200501','200601','200701','200801',
  '201201','201301','201401','201501','201601','201701','201801',
  '160100','160200','160300','160400','160500','160600','160700','160800'
)
  AND (fs_line IS NULL OR fs_line <> 'СБТ 1.2.1 Үндсэн хөрөнгө');

UPDATE accounts SET fs_line = 'СБТ 1.2.2 Биет бус хөрөнгө'
WHERE code IN ('201001','160500')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 1.2.2 Биет бус хөрөнгө');

-- ── Өр төлбөр ────────────────────────────────────────────────────────────────

UPDATE accounts SET fs_line = 'СБТ 2.1.1.1 Дансны өглөг'
WHERE code IN ('310101','310100','310200')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 2.1.1.1 Дансны өглөг');

UPDATE accounts SET fs_line = 'СБТ 2.1.1.2 Цалингийн өглөг'
WHERE code IN ('310201','320100')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 2.1.1.2 Цалингийн өглөг');

UPDATE accounts SET fs_line = 'СБТ 2.1.1.3 Татварын өр'
WHERE code IN (
  '310301','310401','310402','310601','310701','310901','311301',
  '330100','330200'
)
  AND (fs_line IS NULL OR fs_line <> 'СБТ 2.1.1.3 Татварын өр');

UPDATE accounts SET fs_line = 'СБТ 2.1.1.4 НДШ-ийн өглөг'
WHERE code IN ('310501','320200')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 2.1.1.4 НДШ-ийн өглөг');

UPDATE accounts SET fs_line = 'СБТ 2.1.1.5 Богино хугацаат зээл'
WHERE code IN ('311001')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 2.1.1.5 Богино хугацаат зээл');

UPDATE accounts SET fs_line = 'СБТ 2.1.1.6 Хүүний өглөг'
WHERE code IN ('310801')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 2.1.1.6 Хүүний өглөг');

UPDATE accounts SET fs_line = 'СБТ 2.1.1.7 Ногдол ашгийн өглөг'
WHERE code IN ('311201')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 2.1.1.7 Ногдол ашгийн өглөг');

UPDATE accounts SET fs_line = 'СБТ 2.1.1.8 Урьдчилж орсон орлого'
WHERE code IN ('320101')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 2.1.1.8 Урьдчилж орсон орлого');

UPDATE accounts SET fs_line = 'СБТ 2.1.1.10 Бусад богино хугацаат өр төлбөр'
WHERE code IN ('311101','320300')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 2.1.1.10 Бусад богино хугацаат өр төлбөр');

UPDATE accounts SET fs_line = 'СБТ 2.1.2.1 Урт хугацаат зээл'
WHERE code IN ('320102')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 2.1.2.1 Урт хугацаат зээл');

UPDATE accounts SET fs_line = 'СБТ 2.1.2.4 Бусад урт хугацаат өр төлбөр'
WHERE code IN ('340104')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 2.1.2.4 Бусад урт хугацаат өр төлбөр');

-- ── Өмч ─────────────────────────────────────────────────────────────────────

UPDATE accounts SET fs_line = 'СБТ 2.3.1 Өмч'
WHERE code IN ('410101','410201','410100')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 2.3.1 Өмч');

UPDATE accounts SET fs_line = 'СБТ 2.3.6 Эздийн өмчийн бусад хэсэг'
WHERE code IN ('420101','420100')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 2.3.6 Эздийн өмчийн бусад хэсэг');

UPDATE accounts SET fs_line = 'СБТ 2.3.7 Хуримтлагдсан ашиг'
WHERE code IN ('430101','430201','430100','430200')
  AND (fs_line IS NULL OR fs_line <> 'СБТ 2.3.7 Хуримтлагдсан ашиг');

-- Дүн мэдээлэх
SELECT
  SUM(CASE WHEN fs_line IS NULL THEN 1 ELSE 0 END) AS null_fsline,
  COUNT(*) AS total
FROM accounts WHERE is_active = TRUE;
