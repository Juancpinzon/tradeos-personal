-- ─────────────────────────────────────────────────────────────────────────────
-- 002_portfolio_tables.sql — Posiciones y snapshots de equity
-- Ejecutar en Supabase SQL Editor DESPUÉS de 001_auth_setup.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Posiciones ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.positions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker                text NOT NULL,
  symbol                text NOT NULL,
  qty                   numeric NOT NULL,
  avg_entry_price       numeric NOT NULL,
  current_price         numeric NOT NULL,
  market_value          numeric NOT NULL,
  unrealized_pnl        numeric NOT NULL,
  unrealized_pnl_pct    numeric NOT NULL,
  portfolio_weight_pct  numeric NOT NULL DEFAULT 0,
  side                  text NOT NULL DEFAULT 'long',
  asset_class           text NOT NULL,
  synced_at             timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own positions"
  ON public.positions FOR ALL
  USING (auth.uid() = user_id);

-- Índice para queries frecuentes
CREATE INDEX IF NOT EXISTS positions_user_id_idx ON public.positions (user_id);
CREATE INDEX IF NOT EXISTS positions_symbol_idx   ON public.positions (symbol);

-- ── Equity Snapshots ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.equity_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker        text NOT NULL DEFAULT 'total',
  equity        numeric NOT NULL,
  cash          numeric NOT NULL,
  buying_power  numeric NOT NULL,
  snapshot_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.equity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own snapshots"
  ON public.equity_snapshots FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS equity_snapshots_user_id_idx    ON public.equity_snapshots (user_id);
CREATE INDEX IF NOT EXISTS equity_snapshots_snapshot_at_idx ON public.equity_snapshots (snapshot_at DESC);
