-- ============================================================
-- АЮУЛГҮЙ БАЙДАЛ — Row Level Security (RLS)
-- ============================================================
-- public схемийн БҮХ хүснэгтэд RLS асааж, "зөвхөн нэвтэрсэн хэрэглэгч"
-- (authenticated) бүрэн хандах policy нэмнэ. Үүнгүйгээр anon түлхүүр
-- (хөтчид ил) нэвтрэлтгүйгээр бүх датаг унших/бичих боломжтой болдог.
--
--   • anon (нэвтрээгүй) → policy байхгүй тул БҮРЭН ХААГДАНА.
--   • authenticated (нэвтэрсэн) → бүрэн хандана (апп ингэж ажиллана).
--   • service_role (харнесс/админ) → RLS-ийг алгасна (өөрчлөлтгүй).
--
-- Энэ апп нь нэг компанийн нягтлан — урьсан бүх хэрэглэгч ижил дэвтрийг
-- хамтран хөтөлдөг тул "нэвтэрсэн бол бүрэн хандах" зөв загвар.
-- Идемпотент: дахин ажиллуулж болно (DROP POLICY IF EXISTS).
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_all ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY auth_all ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;
