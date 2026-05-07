-- ─────────────────────────────────────────────────────────────────────────────
-- 004_market_cache.sql
-- TTL: 60s precios / 1h técnicos / 24h fundamentales FMP
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.market_data_cache (
  symbol               TEXT        PRIMARY KEY,
  asset_class          TEXT        NOT NULL CHECK (asset_class IN ('equity','crypto')),
  price                NUMERIC     NOT NULL,
  price_change_pct_1d  NUMERIC     NOT NULL DEFAULT 0,
  volume               NUMERIC     NOT NULL DEFAULT 0,
  volume_avg_30d       NUMERIC     NOT NULL DEFAULT 0,
  market_cap           NUMERIC,
  week_52_high         NUMERIC     NOT NULL DEFAULT 0,
  week_52_low          NUMERIC     NOT NULL DEFAULT 0,
  ath_distance_pct     NUMERIC     NOT NULL DEFAULT 0,
  rsi_weekly           NUMERIC,
  fetched_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mdc_fetched_at   ON public.market_data_cache (fetched_at);
CREATE INDEX IF NOT EXISTS idx_mdc_asset_class  ON public.market_data_cache (asset_class);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fundamentals_cache (
  symbol                     TEXT        PRIMARY KEY,
  eps_current                NUMERIC,
  eps_next_estimate          NUMERIC,
  eps_growth_next_pct        NUMERIC,
  revenue_growth_pct         NUMERIC,
  pe_ratio                   NUMERIC,
  next_earnings_date         DATE,
  next_earnings_estimate_eps NUMERIC,
  fetched_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fc_fetched_at
  ON public.fundamentals_cache (fetched_at);

CREATE INDEX IF NOT EXISTS idx_fc_next_earnings
  ON public.fundamentals_cache (next_earnings_date)
  WHERE next_earnings_date IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: cache compartido, solo Edge Functions (service_role) escriben.
-- Usuarios autenticados pueden leer.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.market_data_cache  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundamentals_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mdc_select_authenticated"
  ON public.market_data_cache FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "fc_select_authenticated"
  ON public.fundamentals_cache FOR SELECT
  USING (auth.role() = 'authenticated');
