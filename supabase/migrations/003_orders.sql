-- ─────────────────────────────────────────────────────────────────────────────
-- 003_orders.sql — Tabla de órdenes con snapshot de riesgo
-- Ejecutar en Supabase SQL Editor DESPUÉS de 002_portfolio_tables.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.orders (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Datos del broker
  broker_order_id           text,                              -- ID devuelto por Alpaca/Binance
  broker                    text NOT NULL DEFAULT 'alpaca',   -- 'alpaca' | 'binance'

  -- Descripción de la orden
  symbol                    text NOT NULL,
  side                      text NOT NULL,                    -- 'buy' | 'sell'
  order_type                text NOT NULL,                    -- 'market' | 'limit' | 'stop' | 'stop_limit'
  qty                       numeric NOT NULL,
  limit_price               numeric,                          -- solo para limit / stop_limit
  stop_price                numeric,                          -- solo para stop / stop_limit

  -- Fill data (lo actualiza el polling)
  filled_qty                numeric,
  filled_avg_price          numeric,

  -- Estado
  status                    text NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected'

  -- Clasificación del activo
  asset_class               text NOT NULL DEFAULT 'equity',  -- 'equity' | 'crypto'

  -- Snapshot de riesgo al momento de ejecutar
  portfolio_weight_at_order numeric,    -- % del portafolio ANTES de la orden
  risk_amount               numeric,    -- capital en riesgo calculado ($)
  stop_loss_price           numeric,    -- stop loss ingresado en el form
  target_price              numeric,    -- target opcional
  risk_reward_ratio         numeric,    -- R/R calculado si había target

  -- Metadata
  submitted_at              timestamptz NOT NULL DEFAULT now(),
  filled_at                 timestamptz,
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own orders"
  ON public.orders FOR ALL
  USING (auth.uid() = user_id);

-- ── Índices ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS orders_user_id_idx       ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_symbol_idx         ON public.orders (symbol);
CREATE INDEX IF NOT EXISTS orders_status_idx         ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_submitted_at_idx   ON public.orders (submitted_at DESC);

-- ── Auto-update updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
