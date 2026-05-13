-- ─────────────────────────────────────────────────────────────────────────────
-- 010_update_fundamentals_cache.sql
-- Agrega campos extra a fundamentals_cache para persistir el payload completo de FMP
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.fundamentals_cache
  ADD COLUMN IF NOT EXISTS price               NUMERIC,
  ADD COLUMN IF NOT EXISTS market_cap          NUMERIC,
  ADD COLUMN IF NOT EXISTS week_52_high        NUMERIC,
  ADD COLUMN IF NOT EXISTS week_52_low         NUMERIC,
  ADD COLUMN IF NOT EXISTS price_change_pct_1d NUMERIC,
  ADD COLUMN IF NOT EXISTS volume              NUMERIC,
  ADD COLUMN IF NOT EXISTS name                TEXT;
