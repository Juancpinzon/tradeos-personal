-- ─────────────────────────────────────────────────────────────────────────────
-- 012_flight_plan.sql
-- Tablas para la gestión del Plan de Vuelo Diario
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tabla de Planes de Vuelo
CREATE TABLE public.flight_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date date NOT NULL,
    market text NOT NULL CHECK (market IN ('NYSE', 'crypto', 'both')),
    
    -- Contexto pre-sesión
    spy_close_yesterday numeric,
    spy_trend_sma50 text CHECK (spy_trend_sma50 IN ('above', 'below', 'at')),
    vix_level numeric,
    market_bias text CHECK (market_bias IN ('bullish', 'bearish', 'neutral')),
    pre_market_news text,
    
    -- Reglas y límites
    max_daily_loss numeric,
    max_operations integer DEFAULT 5,
    stop_daily_triggered boolean DEFAULT false,
    
    -- Checklist
    checklist_completed boolean DEFAULT false,
    checklist_items jsonb DEFAULT '{}'::jsonb,
    
    -- Cierre
    pnl_total numeric,
    trades_won integer DEFAULT 0,
    trades_lost integer DEFAULT 0,
    followed_plan text CHECK (followed_plan IN ('yes', 'partial', 'no')),
    daily_lesson text,
    emotional_state_close text CHECK (emotional_state_close IN ('satisfied', 'neutral', 'frustrated', 'anxious', 'overexcited')),
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE(user_id, date)
);

-- 2. Tabla de Candidatos del Plan
CREATE TABLE public.flight_plan_candidates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_plan_id uuid NOT NULL REFERENCES public.flight_plans(id) ON DELETE CASCADE,
    symbol text NOT NULL,
    setup_type text NOT NULL,
    current_price numeric,
    support_level numeric,
    stop_loss numeric NOT NULL,
    target numeric NOT NULL,
    risk_reward numeric,
    qty_suggested numeric,
    capital_at_risk numeric,
    entry_thesis text,
    screener_result_id uuid, -- Opcional, si viene del screener
    journal_entry_id uuid, -- Opcional, cuando se ejecuta
    executed boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS
ALTER TABLE public.flight_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_plan_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own flight plans"
    ON public.flight_plans FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users manage own candidates"
    ON public.flight_plan_candidates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.flight_plans
            WHERE id = flight_plan_candidates.flight_plan_id
            AND user_id = auth.uid()
        )
    );

-- 4. Triggers para updated_at
CREATE TRIGGER set_updated_at_flight_plans
BEFORE UPDATE ON public.flight_plans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
