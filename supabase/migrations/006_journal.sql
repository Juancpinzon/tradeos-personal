-- ─────────────────────────────────────────────────────────────────────────────
-- 006_journal.sql
-- Tabla para el Trading Journal (Tesis, Post-mortem, Emociones)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id          text, -- Opcional: enlace a una orden de Alpaca/Binance
  symbol            text NOT NULL,
  side              text NOT NULL CHECK (side IN ('buy', 'sell')),
  asset_class       text NOT NULL DEFAULT 'equity',
  
  -- Pre-trade (Tesis)
  entry_thesis      text,
  setup_type        text,
  confidence_level  integer CHECK (confidence_level BETWEEN 1 AND 5),
  emotional_state   text,
  
  -- Post-trade (Outcome)
  outcome           text CHECK (outcome IN ('win', 'loss', 'break-even', 'scratch')),
  pnl_realized      numeric,
  pnl_pct           numeric,
  exit_reason       text,
  lessons_learned   text,
  followed_plan     boolean DEFAULT true,
  
  -- Metadata
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own journal entries"
  ON public.journal_entries FOR ALL
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_journal
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
