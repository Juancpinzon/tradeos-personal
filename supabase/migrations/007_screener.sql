-- ─────────────────────────────────────────────────────────────────────────────
-- 007_screener.sql — Tablas para el buscador de oportunidades (Screener)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Universo de símbolos cacheado diariamente
CREATE TABLE IF NOT EXISTS public.screener_universe (
  symbol          text PRIMARY KEY,
  name            text NOT NULL,
  exchange        text NOT NULL,
  asset_class     text NOT NULL CHECK (asset_class IN ('equity', 'crypto')),
  market_cap      numeric,
  price           numeric,
  volume_avg_30d  numeric,
  sector          text,
  industry        text,
  synced_at       timestamptz NOT NULL DEFAULT now()
);

-- screener_universe es pública (lectura para todos los usuarios autenticados)
ALTER TABLE public.screener_universe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for screener_universe" 
  ON public.screener_universe FOR SELECT 
  TO authenticated 
  USING (true);

-- 2. Presets de criterios del usuario
CREATE TABLE IF NOT EXISTS public.screener_presets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  criteria    jsonb NOT NULL,
  last_run_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.screener_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own presets"
  ON public.screener_presets FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Resultados guardados del screener
CREATE TABLE IF NOT EXISTS public.screener_results (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_id                   uuid REFERENCES public.screener_presets(id) ON DELETE SET NULL,
  criteria                    jsonb NOT NULL,
  results                     jsonb NOT NULL, -- ScreenerResultItem[]
  total_candidates_evaluated  integer NOT NULL,
  total_passed_filters        integer NOT NULL,
  ai_summary                  text,
  run_at                      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.screener_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own results"
  ON public.screener_results FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger para updated_at en presets
CREATE TRIGGER screener_presets_updated_at
  BEFORE UPDATE ON public.screener_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA: Presets por defecto (opcional, se puede insertar vía hook de registro)
-- ─────────────────────────────────────────────────────────────────────────────
-- Nota: Como esto es una migración, los presets se pueden insertar 
-- para usuarios existentes o dejar que el frontend los proponga si no existen.
