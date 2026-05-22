-- ─────────────────────────────────────────────────────────────────────────────
-- 013_add_trade_type_to_journal.sql
-- Agregar columna trade_type a journal_entries ('intraday' | 'swing')
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS trade_type text NOT NULL DEFAULT 'swing' CHECK (trade_type IN ('intraday', 'swing'));
