-- ─────────────────────────────────────────────────────────────────────────────
-- 008_watchlist_earnings.sql — Watchlist y Earnings Calendar
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Watchlist Items ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol            text NOT NULL,
  broker            text NOT NULL DEFAULT 'alpaca',
  asset_class       text NOT NULL DEFAULT 'equity',
  alert_price_above numeric,
  alert_price_below numeric,
  notes             text,
  added_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own watchlist"
  ON public.watchlist_items FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS watchlist_items_user_id_idx ON public.watchlist_items (user_id);

-- ── Seed: watchlist por defecto para usuarios nuevos ─────────────────────────
-- Se inserta via trigger en la función handle_new_user (migration 001)
-- Los seeds reales se hacen en el onboarding desde el cliente.

-- ── Earnings Events ──────────────────────────────────────────────────────────
-- Tabla pública (sin user_id): cache de eventos de FMP, TTL 6h.

CREATE TABLE IF NOT EXISTS public.earnings_events (
  symbol            text NOT NULL,
  report_date       date NOT NULL,
  report_time       text NOT NULL DEFAULT 'unknown',
  eps_estimate      numeric,
  eps_actual        numeric,
  revenue_estimate  numeric,
  revenue_actual    numeric,
  surprise_pct      numeric,
  fetched_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (symbol, report_date)
);

-- Sin RLS — los datos son públicos (precios e earnings son información de mercado).
-- El acceso se controla vía JWT en la Edge Function que escribe aquí.

CREATE INDEX IF NOT EXISTS earnings_events_report_date_idx ON public.earnings_events (report_date);
CREATE INDEX IF NOT EXISTS earnings_events_symbol_idx       ON public.earnings_events (symbol);
