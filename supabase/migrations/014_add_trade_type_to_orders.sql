-- ─────────────────────────────────────────────────────────────────────────────
-- 014_add_trade_type_to_orders.sql
-- Agregar columna trade_type a orders ('intraday' | 'swing')
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS trade_type text CHECK (trade_type IN ('intraday', 'swing'));
