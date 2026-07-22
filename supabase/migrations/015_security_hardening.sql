-- ═══════════════════════════════════════════════════════════════════════════
-- 015: Endurecimiento de seguridad y performance
-- Origen: advisors de Supabase + auditoría de sesión (2026-07-22)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) RLS en earnings_events (único ERROR del linter de seguridad).
--    Datos de mercado compartidos: lectura para usuarios autenticados;
--    escrituras solo desde Edge Functions con service role (bypassa RLS).
ALTER TABLE public.earnings_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "earnings_read_authenticated" ON public.earnings_events;
CREATE POLICY "earnings_read_authenticated"
  ON public.earnings_events FOR SELECT TO authenticated USING (true);

-- 2) Eliminar tabla vestigial de keys en texto plano (0 filas verificadas).
--    Principio irrompible #1 (CLAUDE.md): las API keys nunca van en tablas.
DROP TABLE IF EXISTS public.user_broker_keys;

-- 3) Funciones: search_path fijo + revocar EXECUTE directo vía PostgREST.
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- El trigger de signup corre bajo el rol interno de Auth: conservar su acceso.
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- 4) Índices para foreign keys sin cobertura.
CREATE INDEX IF NOT EXISTS idx_fpc_flight_plan_id ON public.flight_plan_candidates(flight_plan_id);
CREATE INDEX IF NOT EXISTS idx_je_user_id        ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_sp_user_id        ON public.screener_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_sr_user_id        ON public.screener_results(user_id);
CREATE INDEX IF NOT EXISTS idx_sr_preset_id      ON public.screener_results(preset_id);

-- 5) RLS initplan: envolver auth.uid()/auth.role() en (select ...) para que
--    se evalúe una vez por query en lugar de una vez por fila.
ALTER POLICY "Users see own snapshots"       ON public.equity_snapshots   USING ((select auth.uid()) = user_id);
ALTER POLICY "Users manage own flight plans" ON public.flight_plans       USING ((select auth.uid()) = user_id);
ALTER POLICY "Users manage own imports"      ON public.import_sessions    USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can manage own journal entries" ON public.journal_entries USING ((select auth.uid()) = user_id);
ALTER POLICY "Users see own orders"          ON public.orders             USING ((select auth.uid()) = user_id);
ALTER POLICY "Users see own positions"       ON public.positions          USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can manage own presets"  ON public.screener_presets   USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can manage own results"  ON public.screener_results   USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can manage own settings" ON public.user_settings      USING ((select auth.uid()) = id);
ALTER POLICY "Users see own watchlist"       ON public.watchlist_items    USING ((select auth.uid()) = user_id);
ALTER POLICY "fc_select_authenticated"       ON public.fundamentals_cache USING ((select auth.role()) = 'authenticated');
ALTER POLICY "mdc_select_authenticated"      ON public.market_data_cache  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "re_select_own"                 ON public.research_entries   USING ((select auth.uid()) = user_id);
ALTER POLICY "re_delete_own"                 ON public.research_entries   USING ((select auth.uid()) = user_id);
ALTER POLICY "re_insert_own"                 ON public.research_entries   WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users manage own candidates"   ON public.flight_plan_candidates
  USING (EXISTS (
    SELECT 1 FROM public.flight_plans
    WHERE flight_plans.id = flight_plan_candidates.flight_plan_id
      AND flight_plans.user_id = (select auth.uid())
  ));
