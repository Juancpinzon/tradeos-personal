-- ─────────────────────────────────────────────────────────────────────────────
-- 011_watchlist_v2.sql — Refinamiento de Watchlist y Seed Data
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Asegurar que la tabla existe con todos los campos (idempotente)
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

-- RLS ya debería estar, pero aseguramos
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'watchlist_items' AND policyname = 'Users manage own watchlist'
    ) THEN
        CREATE POLICY "Users manage own watchlist"
          ON public.watchlist_items FOR ALL 
          USING (auth.uid() = user_id);
    END IF;
END $$;

-- 2. Actualizar handle_new_user para incluir seed de watchlist
-- Reemplazamos la función existente en migration 001
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Crear settings por defecto
  INSERT INTO public.user_settings (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  -- Insertar watchlist por defecto (Equity)
  INSERT INTO public.watchlist_items (user_id, symbol, broker, asset_class)
  VALUES 
    (NEW.id, 'AAPL', 'alpaca', 'equity'),
    (NEW.id, 'MSFT', 'alpaca', 'equity'),
    (NEW.id, 'NVDA', 'alpaca', 'equity'),
    (NEW.id, 'TSLA', 'alpaca', 'equity'),
    (NEW.id, 'SPY',  'alpaca', 'equity')
  ON CONFLICT (user_id, symbol) DO NOTHING;

  -- Insertar watchlist por defecto (Crypto)
  INSERT INTO public.watchlist_items (user_id, symbol, broker, asset_class)
  VALUES 
    (NEW.id, 'BTC/USDT', 'binance', 'crypto'),
    (NEW.id, 'ETH/USDT', 'binance', 'crypto')
  ON CONFLICT (user_id, symbol) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
