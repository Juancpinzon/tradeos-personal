// ─────────────────────────────────────────────────────────────────────────────
// src/types/index.ts — TradeOS Tipos Globales
// Todas las interfaces del schema definido en CLAUDE.md
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// USUARIOS Y CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

export interface UserSettings {
  id: string; // uuid, FK → auth.users
  alpaca_mode: "paper" | "live"; // SIEMPRE 'paper' en Fase 1 y 2
  live_trading_enabled: boolean; // flag explícito; default false
  default_broker: "alpaca" | "binance";
  risk_per_trade_pct: number; // % del portafolio por operación (default: 2)
  max_position_size_pct: number; // % máximo de portafolio en un activo (default: 15)
  created_at: string; // ISO 8601
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTAFOLIO
// ─────────────────────────────────────────────────────────────────────────────

export interface Position {
  id: string;
  user_id: string;
  broker: "alpaca" | "binance";
  symbol: string;
  name?: string; // Nombre de la compañía
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number; // calculado: qty * current_price
  unrealized_pnl: number; // calculado
  unrealized_pnl_pct: number; // calculado
  portfolio_weight_pct: number; // calculado: market_value / total_equity * 100
  side: "long" | "short";
  asset_class: "equity" | "crypto";
  synced_at: string;
  created_at: string;
}

export interface EquitySnapshot {
  id: string;
  user_id: string;
  broker: "alpaca" | "binance" | "total";
  equity: number;
  cash: number;
  buying_power: number;
  snapshot_at: string; // ISO 8601
}

export interface AccountSummary {
  equity: number;
  cash: number;
  buying_power: number;
  pnl_today: number;
  pnl_today_pct: number;
  broker: "alpaca" | "binance" | "total";
  mode: "paper" | "live";
}

// ─────────────────────────────────────────────────────────────────────────────
// ÓRDENES
// ─────────────────────────────────────────────────────────────────────────────

export interface Order {
  id: string;
  user_id: string;
  broker_order_id: string;
  broker: "alpaca" | "binance";
  symbol: string;
  side: "buy" | "sell";
  order_type: "market" | "limit" | "stop" | "stop_limit";
  qty: number;
  limit_price?: number;
  stop_price?: number;
  filled_qty?: number;
  filled_avg_price?: number;
  status:
    | "pending"
    | "accepted"
    | "filled"
    | "partially_filled"
    | "cancelled"
    | "rejected";
  asset_class: "equity" | "crypto";
  portfolio_weight_at_order?: number; // % del portafolio antes de ejecutar
  risk_amount?: number; // capital en riesgo calculado al momento
  submitted_at: string;
  filled_at?: string;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKET DATA CACHE
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketDataCache {
  symbol: string; // PK
  asset_class: "equity" | "crypto";
  price: number;
  price_change_pct_1d: number;
  volume: number;
  volume_avg_30d: number;
  market_cap?: number;
  week_52_high: number;
  week_52_low: number;
  ath_distance_pct: number; // (price - week_52_high) / week_52_high * 100
  rsi_weekly?: number;
  fetched_at: string; // TTL: 60s para precio, 1h para resto
}

export interface FundamentalsCache {
  symbol: string; // PK
  eps_current?: number;
  eps_next_estimate?: number; // consenso analistas próximo trimestre
  eps_growth_next_pct?: number; // calculado
  revenue_growth_pct?: number; // YoY
  pe_ratio?: number;
  next_earnings_date?: string;
  next_earnings_estimate_eps?: number;
  fetched_at: string; // TTL: 24 horas (FMP free: 250 req/día)
}

// ─────────────────────────────────────────────────────────────────────────────
// RESEARCH
// ─────────────────────────────────────────────────────────────────────────────

export interface ResearchDataSnapshot {
  price: number;
  price_change_pct_1d: number;
  volume: number;
  volume_avg_30d: number;
  market_cap?: number;
  week_52_high: number;
  week_52_low: number;
  ath_distance_pct: number;
  rsi_weekly?: number;
  eps_current?: number;
  eps_next_estimate?: number;
  eps_growth_next_pct?: number;
  revenue_growth_pct?: number;
  pe_ratio?: number;
  next_earnings_date?: string;
  name?: string;
  fetched_at: string;
}

export interface PortfolioContext {
  has_position: boolean;
  qty?: number;
  avg_entry_price?: number;
  current_price?: number;
  unrealized_pnl?: number;
  unrealized_pnl_pct?: number;
  portfolio_weight_pct?: number;
  total_portfolio_equity?: number;
}

export interface ResearchEntry {
  id: string;
  user_id: string;
  symbol: string; // 'AAPL' o 'PORTFOLIO' para Portfolio Doctor
  query: string;
  analysis: string;
  data_used: ResearchDataSnapshot;
  portfolio_context: PortfolioContext;
  model: string; // 'claude-sonnet-4-20250514'
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRADING JOURNAL
// ─────────────────────────────────────────────────────────────────────────────

export type SetupType =
  | "breakout"
  | "pullback"
  | "earnings_play"
  | "swing"
  | "reversal"
  | "other";
export type EmotionalState =
  | "calm"
  | "excited"
  | "fearful"
  | "uncertain"
  | "confident";
export type PostEmotionalState =
  | "satisfied"
  | "regretful"
  | "neutral"
  | "anxious"
  | "relieved";
export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;
export type TradeOutcome = "win" | "loss" | "breakeven";

export interface JournalEntry {
  id: string;
  user_id: string;
  order_id?: string; // FK → orders (opcional)
  symbol: string;
  side: "buy" | "sell";
  asset_class: "equity" | "crypto";

  // PRE-TRADE
  entry_thesis: string; // obligatorio
  trade_type: "intraday" | "swing";
  setup_type?: SetupType;
  planned_stop_loss?: number;
  planned_target?: number;
  planned_risk_reward?: number; // (target - entry) / (entry - stop)
  emotional_state: EmotionalState;
  confidence_level: ConfidenceLevel;

  // POST-TRADE
  outcome?: TradeOutcome;
  actual_pnl?: number;
  actual_pnl_pct?: number;
  exit_reason?: string;
  what_went_right?: string;
  what_went_wrong?: string;
  lesson?: string;
  post_emotional_state?: PostEmotionalState;
  followed_plan: boolean;

  tags?: string[];
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// WATCHLIST Y EARNINGS
// ─────────────────────────────────────────────────────────────────────────────

export interface WatchlistItem {
  id: string;
  user_id: string;
  symbol: string;
  broker: "alpaca" | "binance";
  asset_class: "equity" | "crypto";
  alert_price_above?: number;
  alert_price_below?: number;
  notes?: string;
  added_at: string;
}

export interface EarningsEvent {
  symbol: string; // PK compuesto con report_date
  report_date: string;
  report_time: "before_market" | "after_market" | "unknown";
  eps_estimate?: number;
  eps_actual?: number;
  revenue_estimate?: number;
  revenue_actual?: number;
  surprise_pct?: number;
  fetched_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREENER
// ─────────────────────────────────────────────────────────────────────────────

export interface ScreenerUniverse {
  symbol: string; // PK
  name: string;
  exchange: string;
  asset_class: "equity" | "crypto";
  market_cap: number;
  price: number;
  volume_avg_30d: number;
  sector?: string;
  industry?: string;
  synced_at: string;
}

export interface ScreenerCriteria {
  market_cap_min?: number;
  price_min?: number;
  revenue_growth_min_pct?: number;
  volume_avg_min?: number;
  eps_next_positive: boolean;
  ath_distance_max_pct?: number;
  rsi_weekly_min?: number;
  rsi_weekly_max?: number;
  exclude_dividends?: boolean;
  sector?: string;
  asset_class: "equity" | "crypto" | "both";
  symbol_query?: string; // Búsqueda por símbolo o nombre
}

export interface ScreenerPreset {
  id: string;
  user_id: string;
  name: string;
  criteria: ScreenerCriteria;
  last_run_at?: string;
  created_at: string;
}

export interface ScreenerResultItem {
  symbol: string;
  name: string;
  price: number;
  market_cap: number;
  revenue_growth_pct: number;
  ath_distance_pct: number;
  rsi_weekly?: number;
  eps_next_estimate?: number;
  volume_avg: number;
  next_earnings_date?: string;
  score: number; // 0-100 calculado por Claude
  ai_note: string;
  already_in_portfolio: boolean;
  already_in_watchlist: boolean;
}

export interface ScreenerResult {
  id: string;
  user_id: string;
  preset_id?: string;
  criteria: ScreenerCriteria;
  results: ScreenerResultItem[];
  total_candidates_evaluated: number;
  total_passed_filters: number;
  ai_summary: string;
  run_at: string;
}
// ─── Añadir a src/types/index.ts ─────────────────────────────────────────────
// (Estos tipos complementan los que ya tienes; no reemplaces los existentes)

// Payload que construye OrderForm y envía a useOrders → alpaca-proxy
export interface OrderPayload {
  symbol: string;
  qty: number;
  side: "buy" | "sell";
  order_type: "market" | "limit" | "stop" | "stop_limit";
  limit_price?: number;
  stop_price?: number;
  risk_amount?: number;
  portfolio_weight_at_order?: number;
  stop_loss_price: number;
  target_price?: number;
  risk_reward_ratio?: number;
}

// Respuesta de Alpaca (subset de campos relevantes)
export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  symbol: string;
  asset_class: "us_equity" | "crypto";
  qty: string;
  filled_qty: string;
  type: "market" | "limit" | "stop" | "stop_limit";
  side: "buy" | "sell";
  time_in_force: "day" | "gtc" | "ioc" | "fok";
  limit_price: string | null;
  stop_price: string | null;
  filled_avg_price: string | null;
  status:
    | "new"
    | "partially_filled"
    | "filled"
    | "done_for_day"
    | "canceled"
    | "expired"
    | "replaced"
    | "pending_cancel"
    | "pending_replace"
    | "held"
    | "accepted"
    | "pending_new"
    | "accepted_for_bidding"
    | "stopped"
    | "rejected"
    | "suspended"
    | "calculated";
  extended_hours: boolean;
  legs: null;
  notional: string | null;
}

// Estado de orden simplificado para la UI
export type OrderStatusSimple =
  | "open"
  | "filled"
  | "cancelled"
  | "rejected"
  | "pending";

export function simplifyOrderStatus(
  status: AlpacaOrder["status"],
): OrderStatusSimple {
  if (["filled"].includes(status)) return "filled";
  if (["canceled", "expired", "replaced"].includes(status)) return "cancelled";
  if (["rejected", "stopped", "suspended"].includes(status)) return "rejected";
  if (
    ["new", "accepted", "pending_new", "accepted_for_bidding"].includes(status)
  )
    return "open";
  return "pending";
}

// ─────────────────────────────────────────────────────────────────────────────
// FLIGHT PLAN
// ─────────────────────────────────────────────────────────────────────────────

export interface FlightPlan {
  id: string;
  user_id: string;
  date: string; // ISO date
  market: 'NYSE' | 'crypto' | 'both';
  
  spy_close_yesterday?: number;
  spy_trend_sma50?: 'above' | 'below' | 'at';
  vix_level?: number;
  market_bias?: 'bullish' | 'bearish' | 'neutral';
  pre_market_news?: string;
  
  max_daily_loss?: number;
  max_operations: number;
  stop_daily_triggered: boolean;
  
  checklist_completed: boolean;
  checklist_items: Record<string, boolean>;
  
  pnl_total?: number;
  trades_won: number;
  trades_lost: number;
  followed_plan?: 'yes' | 'partial' | 'no';
  daily_lesson?: string;
  emotional_state_close?: 'satisfied' | 'neutral' | 'frustrated' | 'anxious' | 'overexcited';
  
  created_at: string;
  updated_at: string;
  candidates?: FlightPlanCandidate[];
}

export interface FlightPlanCandidate {
  id: string;
  flight_plan_id: string;
  symbol: string;
  setup_type: string;
  current_price?: number;
  support_level?: number;
  stop_loss: number;
  target: number;
  risk_reward?: number;
  qty_suggested?: number;
  capital_at_risk?: number;
  entry_thesis?: string;
  screener_result_id?: string;
  journal_entry_id?: string;
  executed: boolean;
  created_at: string;
}
