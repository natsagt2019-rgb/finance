-- ============================================================
-- Б-1: Цалингийн хугацаа хаалт + Б-2: journal_entries FK CASCADE
-- Аудитын дүгнэлтийн засвар — 2026-06-30
-- ============================================================

-- ── Б-2: journal_entries → journals FK (ON DELETE CASCADE) ──────────────────
-- Одоог хүртэл FK байхгүй байсан тул journal устгахад journal_entries
-- гараар устгах шаардлагатай байсан. Алдаа гарвал "сүүдрийн" мөр үлдэдэг.
-- NULL journal_id (жишээ: цалингийн шууд бичилт) FK-д нөлөөлөхгүй.

ALTER TABLE journal_entries
  ADD CONSTRAINT IF NOT EXISTS je_journal_id_fkey
  FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE;

-- ── Б-1: Цалингийн хаасан хугацааны бүртгэл ────────────────────────────────
CREATE TABLE IF NOT EXISTS salary_closed_periods (
  id         BIGSERIAL PRIMARY KEY,
  year       SMALLINT NOT NULL,
  month      SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  closed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_by  TEXT,                              -- хаасан хэрэглэгчийн email
  note       TEXT,
  UNIQUE (year, month)
);

COMMENT ON TABLE salary_closed_periods IS
  'Хаасан цалингийн хугацааны бүртгэл. Бичилт байвал тухайн он/сарыг өөрчилж болохгүй.';
