-- ─────────────────────────────────────────────────────────────────────────────
-- 005_research.sql
-- Tabla research_entries con data_used y portfolio_context como JSONB.
-- RLS estricto: cada usuario solo ve sus propios análisis.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.research_entries (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol            TEXT        NOT NULL,  -- 'AAPL' o 'PORTFOLIO' para Portfolio Doctor
  query             TEXT        NOT NULL,
  analysis          TEXT        NOT NULL,
  data_used         JSONB       NOT NULL DEFAULT '{}',
  portfolio_context JSONB       NOT NULL DEFAULT '{}',
  model             TEXT        NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_re_user_id    ON public.research_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_re_symbol     ON public.research_entries (user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_re_created_at ON public.research_entries (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: usuario solo accede a sus análisis
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.research_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "re_select_own"
  ON public.research_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "re_insert_own"
  ON public.research_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "re_delete_own"
  ON public.research_entries FOR DELETE
  USING (auth.uid() = user_id);
