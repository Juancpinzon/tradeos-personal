# CLAUDE.md — TradeOS Personal
## Plataforma web de inversiones y trading NYSE + Cripto

> **Agente**: Lee este archivo completo antes de escribir cualquier línea de código. Es tu contrato de comportamiento para todo el proyecto. No omitas secciones. No asumas lo que no está escrito aquí.

---

## 🧠 Contexto del Negocio

TradeOS Personal es una plataforma de inversiones y trading unificada para un usuario individual. Centraliza NYSE (via Alpaca) y cripto (via Binance) en una sola interfaz, con análisis asistido por Claude API, gestión de riesgo integrada, y herramientas de mejora continua como el Trading Journal.

**El problema que resuelve**: las plataformas de brokers son fragmentadas, sin análisis inteligente integrado, sin visión unificada multi-activo, y sin herramientas que ayuden al trader a aprender de sus operaciones.

**Usuario**: trader/inversor individual con cuenta Alpaca paper/live y cuenta Binance.

**Tres flujos que NUNCA pueden bloquearse**:
1. Ver el estado actual del portafolio
2. Ver las posiciones abiertas con PnL en tiempo real
3. Acceder al historial de operaciones

---

## 🎯 Principios de Diseño Irrompibles

1. **Las API keys nunca tocan el frontend.** Todas las llamadas a Alpaca, Binance, FMP y Anthropic se hacen desde Supabase Edge Functions. El cliente solo llama a Supabase.

2. **Paper trading por defecto en Fase 1-2.** Ninguna orden real se ejecuta hasta que el módulo live trading esté explícitamente activado con el flag `live_trading_enabled` en `user_settings`.

3. **El dashboard carga en < 2s.** Los datos de mercado y fundamentales se cachean en Supabase. Nunca se llama directo a APIs externas desde el render del dashboard.

4. **El Research Agent siempre muestra su fuente.** Todo análisis incluye el snapshot exacto de datos que usó (precio, ATH dist, RSI, EPS, etc.) y el contexto de portafolio del usuario. Sin datos fuente visibles, el análisis no se muestra.

5. **Toda orden requiere confirmación explícita.** Ningún botón ejecuta una operación en un clic. Siempre hay un `ConfirmOrderModal` con resumen completo incluyendo impacto en el portafolio y riesgo calculado.

6. **El Journal cierra el loop de aprendizaje.** Toda orden ejecutada tiene una entrada de journal asociable. El sistema facilita documentar la tesis antes de entrar y el post-mortem al cerrar. Sin retrospectiva, no hay mejora.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Razón |
|------|-----------|-------|
| Frontend | React 18 + TypeScript | SPA, tipado estricto |
| Estilos | Tailwind CSS + shadcn/ui | Componentes financieros rápidos |
| Backend/DB | Supabase (Postgres + Auth + Edge Functions) | Auth, vault de keys, DB, cron jobs |
| Broker NYSE | Alpaca Markets API | Paper + live trading NYSE/NASDAQ + market data |
| Broker Cripto | Binance API | Spot trading cripto |
| Fundamentales | Financial Modeling Prep (FMP) API | EPS, revenue growth, guidance, P/E, earnings calendar |
| Análisis IA | Claude API (claude-sonnet-4-20250514) | Research Agent, Screener, Portfolio Doctor |
| Charts | Recharts + TradingView Widget (embed) | Equity chart histórico + OHLCV por símbolo |
| Estado | Zustand | Estado global liviano |
| Fetching | TanStack Query (React Query) | Cache, refetch, loading states |
| Build | Vite | Dev rápido |
| Deploy | Vercel (preferido) o EasyPanel | CI/CD automático |

---

## 📁 Estructura del Proyecto

```
tradeos-personal/
├── src/
│   ├── components/
│   │   ├── ui/                          # shadcn/ui base components
│   │   ├── portfolio/
│   │   │   ├── PortfolioSummary.tsx     # Equity total, cash, buying power
│   │   │   ├── PositionCard.tsx         # Posición individual con PnL color-coded
│   │   │   ├── EquityChart.tsx          # Línea histórica de equity (Recharts)
│   │   │   ├── PnLWidget.tsx            # PnL del día, semana, mes
│   │   │   └── PortfolioDoctor.tsx      # Análisis holístico IA del portafolio completo
│   │   ├── trading/
│   │   │   ├── OrderForm.tsx            # Formulario de orden con risk calculator integrado
│   │   │   ├── RiskCalculator.tsx       # Qty sugerida dado capital, % riesgo, stop loss
│   │   │   ├── OrderBook.tsx            # Book de órdenes del símbolo activo
│   │   │   ├── OrderHistory.tsx         # Historial de órdenes con status
│   │   │   └── ConfirmOrderModal.tsx    # Modal obligatorio: resumen + impacto + riesgo
│   │   ├── research/
│   │   │   ├── ResearchPanel.tsx        # Input de símbolo/pregunta + historial
│   │   │   ├── AnalysisCard.tsx         # Card de resultado con KPIs + chart
│   │   │   ├── KpiGrid.tsx              # ATH dist, RSI, EPS actual vs guidance, rev growth
│   │   │   ├── TradingViewWidget.tsx    # Embed iframe TradingView para el símbolo
│   │   │   └── PortfolioContextPanel.tsx # "Tu exposición": posición actual, PnL, weight%
│   │   ├── journal/
│   │   │   ├── JournalEntry.tsx         # Vista de una entrada de journal
│   │   │   ├── JournalForm.tsx          # Crear/editar entrada (tesis, emociones, setup)
│   │   │   ├── JournalList.tsx          # Historial de entradas con filtros
│   │   │   ├── PostMortemPanel.tsx      # Review post-cierre: qué salió bien/mal
│   │   │   └── JournalStats.tsx         # Métricas: win rate, avg win/loss, errores comunes
│   │   ├── screener/
│   │   │   ├── ScreenerPanel.tsx        # Contenedor principal
│   │   │   ├── ScreenerCriteriaForm.tsx # Formulario de criterios con rangos y toggles
│   │   │   ├── ScreenerResultsTable.tsx # Tabla interactiva sortable con score badge
│   │   │   └── ScreenerSaveModal.tsx    # Guardar preset con nombre
│   │   ├── earnings/
│   │   │   └── EarningsCalendar.tsx     # Próximos earnings de watchlist + posiciones
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── AppShell.tsx
│   ├── hooks/
│   │   ├── usePortfolio.ts
│   │   ├── useOrders.ts
│   │   ├── useMarketData.ts
│   │   ├── useResearch.ts
│   │   ├── useJournal.ts
│   │   ├── useScreener.ts
│   │   ├── useEarnings.ts
│   │   └── useAuth.ts
│   ├── stores/
│   │   ├── portfolioStore.ts
│   │   ├── tradingStore.ts
│   │   ├── screenerStore.ts
│   │   └── uiStore.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── formatters.ts                # formatCurrency, formatPercent, formatDate, formatQty
│   │   └── constants.ts
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Trading.tsx
│   │   ├── Research.tsx
│   │   ├── Journal.tsx
│   │   ├── Screener.tsx
│   │   ├── History.tsx
│   │   ├── Settings.tsx
│   │   └── Login.tsx
│   ├── types/
│   │   └── index.ts
│   └── App.tsx
├── supabase/
│   ├── functions/
│   │   ├── alpaca-proxy/                # Proxy a Alpaca: account, positions, orders, data
│   │   │   └── index.ts
│   │   ├── binance-proxy/               # Proxy a Binance: spot balances, prices, orders
│   │   │   └── index.ts
│   │   ├── fmp-proxy/                   # Proxy a FMP: EPS, revenue, guidance, earnings
│   │   │   └── index.ts
│   │   ├── claude-research/             # Research Agent: datos → prompt → Claude streaming
│   │   │   └── index.ts
│   │   ├── claude-screener/             # Screener: universo filtrado → Claude scoring
│   │   │   └── index.ts
│   │   ├── claude-portfolio-doctor/     # Análisis holístico del portafolio completo
│   │   │   └── index.ts
│   │   ├── screener-universe-sync/      # Cron diario: cachea universo de tickers
│   │   │   └── index.ts
│   │   └── save-api-keys/               # Guarda keys en Vault + test de conexión
│   │       └── index.ts
│   └── migrations/
│       ├── 001_auth_setup.sql
│       ├── 002_portfolio_tables.sql
│       ├── 003_orders_tables.sql
│       ├── 004_market_cache.sql
│       ├── 005_research.sql
│       ├── 006_journal.sql
│       ├── 007_screener.sql
│       └── 008_watchlist_earnings.sql
├── .env.local
├── .env.example
├── CLAUDE.md
└── package.json
```

---

## 💾 Schema de Base de Datos

```typescript
// ─────────────────────────────────────────────
// USUARIOS Y CONFIGURACIÓN
// ─────────────────────────────────────────────

interface UserSettings {
  id: string                          // uuid, FK → auth.users
  alpaca_mode: 'paper' | 'live'      // SIEMPRE 'paper' en Fase 1 y 2
  live_trading_enabled: boolean       // flag explícito para habilitar live; default false
  default_broker: 'alpaca' | 'binance'
  risk_per_trade_pct: number          // % del portafolio por operación (default: 2)
  max_position_size_pct: number       // % máximo de portafolio en un solo activo (default: 15)
  created_at: Date
  updated_at: Date
}

// Las API keys se guardan como Supabase Vault Secrets, NUNCA en tablas
// Acceso solo desde Edge Functions autenticadas con JWT

// ─────────────────────────────────────────────
// PORTAFOLIO
// ─────────────────────────────────────────────

interface Position {
  id: string
  user_id: string
  broker: 'alpaca' | 'binance'
  symbol: string
  qty: number
  avg_entry_price: number
  current_price: number
  market_value: number                // calculado: qty * current_price
  unrealized_pnl: number              // calculado
  unrealized_pnl_pct: number          // calculado
  portfolio_weight_pct: number        // calculado: market_value / total_equity * 100
  side: 'long' | 'short'
  asset_class: 'equity' | 'crypto'
  synced_at: Date
  created_at: Date
}

interface EquitySnapshot {
  id: string
  user_id: string
  broker: 'alpaca' | 'binance' | 'total'
  equity: number
  cash: number
  buying_power: number
  snapshot_at: Date
}

// ─────────────────────────────────────────────
// ÓRDENES
// ─────────────────────────────────────────────

interface Order {
  id: string
  user_id: string
  broker_order_id: string
  broker: 'alpaca' | 'binance'
  symbol: string
  side: 'buy' | 'sell'
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit'
  qty: number
  limit_price?: number
  stop_price?: number
  filled_qty?: number
  filled_avg_price?: number
  status: 'pending' | 'accepted' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected'
  asset_class: 'equity' | 'crypto'
  portfolio_weight_at_order?: number  // % del portafolio antes de ejecutar
  risk_amount?: number                // capital en riesgo calculado al momento
  submitted_at: Date
  filled_at?: Date
  notes?: string
}

// ─────────────────────────────────────────────
// MARKET DATA CACHE
// ─────────────────────────────────────────────

interface MarketDataCache {
  symbol: string                      // PK
  asset_class: 'equity' | 'crypto'
  price: number
  price_change_pct_1d: number
  volume: number
  volume_avg_30d: number
  market_cap?: number
  week_52_high: number
  week_52_low: number
  ath_distance_pct: number            // calculado: (price - week_52_high) / week_52_high * 100
  rsi_weekly?: number
  fetched_at: Date                    // TTL: 60s para precio, 1h para resto
}

interface FundamentalsCache {
  symbol: string                      // PK
  eps_current?: number
  eps_next_estimate?: number          // consenso analistas próximo trimestre
  eps_growth_next_pct?: number        // calculado
  revenue_growth_pct?: number         // YoY
  pe_ratio?: number
  next_earnings_date?: Date
  next_earnings_estimate_eps?: number
  fetched_at: Date                    // TTL: 24 horas (FMP free: 250 req/día)
}

// ─────────────────────────────────────────────
// RESEARCH
// ─────────────────────────────────────────────

interface ResearchEntry {
  id: string
  user_id: string
  symbol: string                      // 'AAPL' o 'PORTFOLIO' para Portfolio Doctor
  query: string
  analysis: string
  data_used: ResearchDataSnapshot
  portfolio_context: PortfolioContext
  model: string                       // 'claude-sonnet-4-20250514'
  created_at: Date
}

interface ResearchDataSnapshot {
  price: number
  price_change_pct_1d: number
  volume: number
  volume_avg_30d: number
  market_cap?: number
  week_52_high: number
  week_52_low: number
  ath_distance_pct: number
  rsi_weekly?: number
  eps_current?: number
  eps_next_estimate?: number
  eps_growth_next_pct?: number
  revenue_growth_pct?: number
  pe_ratio?: number
  next_earnings_date?: Date
  fetched_at: Date
}

interface PortfolioContext {
  has_position: boolean
  qty?: number
  avg_entry_price?: number
  current_price?: number
  unrealized_pnl?: number
  unrealized_pnl_pct?: number
  portfolio_weight_pct?: number
  total_portfolio_equity?: number
}

// ─────────────────────────────────────────────
// TRADING JOURNAL
// ─────────────────────────────────────────────

interface JournalEntry {
  id: string
  user_id: string
  order_id?: string                   // FK → orders (opcional)
  symbol: string
  side: 'buy' | 'sell'
  asset_class: 'equity' | 'crypto'

  // PRE-TRADE
  entry_thesis: string                // obligatorio: por qué entrás
  setup_type?: 'breakout' | 'pullback' | 'earnings_play' | 'swing' | 'reversal' | 'other'
  planned_stop_loss?: number
  planned_target?: number
  planned_risk_reward?: number        // calculado: (target - entry) / (entry - stop)
  emotional_state: 'calm' | 'excited' | 'fearful' | 'uncertain' | 'confident'
  confidence_level: 1 | 2 | 3 | 4 | 5

  // POST-TRADE
  outcome?: 'win' | 'loss' | 'breakeven'
  actual_pnl?: number
  actual_pnl_pct?: number
  exit_reason?: string
  what_went_right?: string
  what_went_wrong?: string
  lesson?: string
  post_emotional_state?: 'satisfied' | 'regretful' | 'neutral' | 'anxious' | 'relieved'
  followed_plan: boolean

  tags?: string[]                     // ej: ['earnings', 'momentum', 'error-impulsivo']
  created_at: Date
  updated_at: Date
}

// ─────────────────────────────────────────────
// WATCHLIST Y EARNINGS
// ─────────────────────────────────────────────

interface WatchlistItem {
  id: string
  user_id: string
  symbol: string
  broker: 'alpaca' | 'binance'
  asset_class: 'equity' | 'crypto'
  alert_price_above?: number
  alert_price_below?: number
  notes?: string
  added_at: Date
}

interface EarningsEvent {
  symbol: string                      // PK compuesto con report_date
  report_date: Date
  report_time: 'before_market' | 'after_market' | 'unknown'
  eps_estimate?: number
  eps_actual?: number                 // null hasta que se reporte
  revenue_estimate?: number
  revenue_actual?: number
  surprise_pct?: number               // calculado post-earnings
  fetched_at: Date
}

// ─────────────────────────────────────────────
// SCREENER
// ─────────────────────────────────────────────

interface ScreenerUniverse {
  symbol: string                      // PK
  name: string
  exchange: string
  asset_class: 'equity' | 'crypto'
  market_cap: number
  price: number
  volume_avg_30d: number
  sector?: string
  industry?: string
  synced_at: Date                     // fecha del último cache diario
}

interface ScreenerPreset {
  id: string
  user_id: string
  name: string
  criteria: ScreenerCriteria
  last_run_at?: Date
  created_at: Date
}

interface ScreenerCriteria {
  market_cap_min?: number
  price_min?: number
  revenue_growth_min_pct?: number
  volume_avg_min?: number
  eps_next_positive: boolean
  ath_distance_max_pct?: number       // negativo: ej. -20 = máx 20% debajo del ATH
  rsi_weekly_min?: number
  rsi_weekly_max?: number
  exclude_dividends?: boolean
  sector?: string
  asset_class: 'equity' | 'crypto' | 'both'
}

interface ScreenerResult {
  id: string
  user_id: string
  preset_id?: string
  criteria: ScreenerCriteria
  results: ScreenerResultItem[]
  total_candidates_evaluated: number
  total_passed_filters: number
  ai_summary: string
  run_at: Date
}

interface ScreenerResultItem {
  symbol: string
  name: string
  price: number
  market_cap: number
  revenue_growth_pct: number
  ath_distance_pct: number
  rsi_weekly?: number
  eps_next_estimate?: number
  volume_avg: number
  next_earnings_date?: Date
  score: number                       // 0-100 calculado por Claude
  ai_note: string                     // 1-2 líneas explicando por qué destaca
  already_in_portfolio: boolean
  already_in_watchlist: boolean
}
```

---

## 🔄 Flujos de Negocio Críticos

### Flujo 1: Ver estado del portafolio (< 2s)
1. Usuario abre Dashboard
2. `usePortfolio` lee `positions` y último `equity_snapshot` desde Supabase (cache React Query, stale 30s)
3. Si los datos tienen > 60s, sync en background via Edge Function `alpaca-proxy`
4. Dashboard renderiza con cache; badge "actualizando" visible si hay sync en curso
5. Al completar sync, React Query invalida y re-renderiza

### Flujo 2: Ejecutar una orden con riesgo calculado
1. Usuario selecciona símbolo, abre `OrderForm`
2. Ingresa side, tipo de orden, precio de stop loss
3. `RiskCalculator` calcula automáticamente qty sugerida dado `risk_per_trade_pct`, precio de entrada y stop
4. Muestra en tiempo real: capital en riesgo ($), % del portafolio, distancia al stop, R/R ratio
5. Si la posición resultante superaría `max_position_size_pct`, advertencia prominente
6. Click "Revisar orden" → `ConfirmOrderModal` con resumen completo
7. Al confirmar → Edge Function `alpaca-proxy` POST `/orders` → orden guardada con snapshot de riesgo
8. `JournalForm` se abre automáticamente para capturar tesis de entrada
9. Polling actualiza status; posición actualizada en `positions`

### Flujo 3: Research Agent (contexto completo)
1. Usuario ingresa símbolo o pregunta en `ResearchPanel`
2. Edge Function `claude-research` ejecuta en paralelo:
   - Alpaca: precio, volumen, high/low 52w, RSI semanal calculado
   - FMP cache: EPS actual + guidance, revenue growth YoY, P/E, próximo earnings date
   - Supabase: posición actual del usuario (qty, entry, PnL, weight%)
3. Prompt estructurado con todos esos datos → Claude API streaming con 7 secciones:
   - 📊 Cuadro de mando ejecutivo
   - 📈 Tesis de inversión y catalizadores
   - 📉 Análisis fundamental (EPS vs guidance, revenue growth, P/E)
   - 💼 Tu exposición (si tiene posición: mantener/recortar/ampliar con datos concretos)
   - ⚠️ Riesgos clave (máximo 3, concretos)
   - 📐 Niveles técnicos (soporte, resistencia, RSI semanal)
   - 📅 Próximo catalizador (earnings si existe en < 30 días)
4. Layout: análisis streaming (izquierda) + datos fuente + TradingView widget (derecha)
5. Guardado en `research_entries` con `data_used` y `portfolio_context` completos

### Flujo 4: Portfolio Doctor
1. Usuario hace click en "Portfolio Doctor" en Dashboard
2. Edge Function `claude-portfolio-doctor` recibe:
   - Todas las posiciones con PnL, weight%, avg entry
   - Equity total y composición por broker
   - Historial de equity últimos 30 días
   - Fundamentales cacheados de FMP de cada posición
3. Claude genera análisis holístico (no símbolo a símbolo):
   - Concentración por sector y activo (sobreexposición)
   - Correlación implícita entre posiciones
   - Posiciones con mayor riesgo relativo al portafolio
   - Recomendaciones concretas: qué recortaría, qué ampliaría, qué eliminaría y por qué
   - Nivel de riesgo general: Conservative / Moderate / Aggressive
4. Modal expandible en Dashboard; guardado en `research_entries` con symbol='PORTFOLIO'

### Flujo 5: Trading Journal
1. Al ejecutar una orden → `JournalForm` aparece automáticamente con order_id prellenado
2. Campos obligatorios: `entry_thesis`, `emotional_state`, `confidence_level`
3. Al cerrar posición (orden de venta) → notificación invita al post-mortem
4. Post-mortem: `outcome`, `what_went_right`, `what_went_wrong`, `lesson`, `followed_plan`
5. `JournalStats` calcula: win rate, avg win/loss, profit factor, tasa de "seguí el plan", errores frecuentes por tag

### Flujo 6: Screener
1. Cron diario `screener-universe-sync` cachea universo de Alpaca en `screener_universe` (filtro grueso: market cap > $500M)
2. Usuario configura criterios o carga preset → `claude-screener`:
   - Filtra `screener_universe` en Supabase (sin API calls, rápido)
   - Enriquece candidatos con `fundamentals_cache` de FMP
   - Claude: puntúa 0-100, escribe nota por ítem, genera resumen considerando portafolio actual
3. Tabla sortable con score badge; click en resultado → Research de ese símbolo precargado

### Flujo 7: Earnings Calendar
1. Al cargar la app, `useEarnings` obtiene próximos earnings de FMP para posiciones abiertas + watchlist
2. `EarningsCalendar`: timeline de 30 días
3. Posiciones con earnings en < 7 días muestran badge de alerta en `PositionCard`
4. Dashboard sección "Próximos eventos" si hay earnings en < 14 días

---

## 🎨 Sistema de Diseño

```css
/* Tema dark trading — profesional, alta densidad de información */
:root {
  /* Backgrounds */
  --bg-base:      #0a0e17;
  --bg-surface:   #111827;
  --bg-elevated:  #1f2937;
  --bg-hover:     #374151;

  /* Texto */
  --text-primary:   #f9fafb;
  --text-secondary: #9ca3af;
  --text-muted:     #6b7280;

  /* Semánticos financieros */
  --color-profit:  #10b981;
  --color-loss:    #ef4444;
  --color-neutral: #6b7280;
  --color-warning: #f59e0b;

  /* Accent */
  --color-primary:       #3b82f6;
  --color-primary-hover: #2563eb;

  /* Bordes */
  --border-subtle:  #1f2937;
  --border-default: #374151;
}
```

**Tipografía:**
- Display/títulos: `Inter` (weight 600-700)
- Cuerpo/UI: `Inter` (weight 400-500)
- Números/precios: `JetBrains Mono` — monospace obligatorio

**Reglas de display:**
- Precios y PnL siempre en `font-mono`
- Positivo = `text-emerald-400`, negativo = `text-red-400`, neutro = `text-gray-400`
- Porcentajes con signo explícito: `+2.3%` / `-1.1%`
- Score screener: badge verde (≥80), amarillo (60-79), gris (<60)
- Earnings badge: `bg-yellow-900 text-yellow-300` con ícono de calendario cuando < 7 días
- Confidence level journal: 5 puntos visuales tipo semáforo (1=rojo, 5=verde)

---

## 📦 Seed Data

Al completar onboarding (primer login), precargar automáticamente:

**Watchlist default:**
```
Equities (Alpaca):  AAPL, MSFT, NVDA, TSLA, SPY
Cripto (Binance):   BTC/USDT, ETH/USDT, SOL/USDT
```

**Screener presets default (2):**
```
1. "Momentum Growth"
   market_cap_min: 2_000_000_000 | revenue_growth_min_pct: 20
   volume_avg_min: 200_000 | ath_distance_max_pct: -20
   eps_next_positive: true | asset_class: 'equity'

2. "Breakout Técnico"
   market_cap_min: 1_000_000_000 | price_min: 10
   ath_distance_max_pct: -10 | rsi_weekly_min: 50 | rsi_weekly_max: 70
   eps_next_positive: true | asset_class: 'equity'
```

**UserSettings default:**
```
alpaca_mode: 'paper' | live_trading_enabled: false
risk_per_trade_pct: 2 | max_position_size_pct: 15
```

---

## 🖥️ Pantallas y Navegación

```
SIDEBAR (izquierda, colapsable)
├── 📊 Dashboard        → /
├── 📈 Trading          → /trading
├── 🔍 Research         → /research
├── 📓 Journal          → /journal
├── 🎯 Screener         → /screener
├── 📋 Historial        → /history
└── ⚙️  Settings        → /settings

DASHBOARD (/)
┌──────────────────────────────────────────────────────────┐
│  Total Equity: $XX,XXX   PnL Hoy: +X.X%   Cash: $XXX    │
│  [Alpaca: $XX,XXX] [Binance: $XX,XXX]  [🩺 Portfolio Dr] │
├───────────────────────┬──────────────────────────────────┤
│  POSICIONES           │  EQUITY CHART (30d)              │
│  ⚠️ AAPL  +2.3% $XXX │                                  │
│  NVDA    +8.1% $XXX  │  [línea equity histórica]        │
│  BTC     -1.1% $XXX  ├──────────────────────────────────┤
│  ...                 │  PRÓXIMOS EVENTOS                │
│                      │  📅 AAPL earnings — 3 días ⚠️    │
│                      │  📅 MSFT earnings — 12 días      │
└───────────────────────┴──────────────────────────────────┘

TRADING (/trading)
┌────────────────────┬──────────────────────────────────────┐
│  ORDER FORM        │  WATCHLIST                           │
│  Symbol:  [AAPL  ] │  AAPL  $XXX.XX  +X.X%  📅 3d       │
│  Side:    [BUY   ] │  NVDA  $XXX.XX  +X.X%              │
│  Type:    [MARKET] │  BTC   $XX,XXX  -X.X%              │
│  Stop:    [$XXX  ] │                                    │
│  ──────────────── │                                    │
│  RISK CALCULATOR   │                                    │
│  Capital riesgo: 2%│                                    │
│  Qty sugerida: XX  │                                    │
│  En riesgo: $XXX   │                                    │
│  R/R: 1:2.4        │                                    │
│  [REVISAR ORDEN]   │                                    │
└────────────────────┴──────────────────────────────────────┘

RESEARCH (/research)
┌──────────────────────────────────────────────────────────┐
│  [AAPL — pregunta o símbolo...]              [ANALIZAR]  │
├────────────────────────────────┬─────────────────────────┤
│  ANÁLISIS (streaming)          │  DATOS FUENTE           │
│                                │  Precio:      $XXX.XX   │
│  📊 CUADRO DE MANDO            │  ATH dist:    -8.3%     │
│  AAPL · $XXX · -8.3% ATH      │  RSI sem:     62        │
│  Market cap: $X.XT             │  EPS act:     $X.XX     │
│                                │  EPS est Q+1: $X.XX +X% │
│  📈 TESIS DE INVERSIÓN         │  Rev growth:  +XX%      │
│  [análisis...]                 │  P/E ratio:   XX.X      │
│                                │  Next earn:   3d ⚠️     │
│  📉 FUNDAMENTALES              ├─────────────────────────┤
│  EPS guidance supera...        │  TU POSICIÓN            │
│                                │  XX acc @ $XXX          │
│  💼 TU EXPOSICIÓN              │  PnL: +$XXX (+X.X%)    │
│  Tenés X% del portafolio       │  Weight: X% del total   │
│  Recomendación: mantener...   ├─────────────────────────┤
│                                │  [TradingView Chart]    │
│  ⚠️ RIESGOS                    │  AAPL · 1D · Velas      │
│  1. Earnings en 3 días...      │                         │
│                                │                         │
│  📐 NIVELES TÉCNICOS           │                         │
│  Soporte: $XXX                 │                         │
│  Resistencia: $XXX             │                         │
│  RSI semanal: 62 — neutro      │                         │
│                                │                         │
│  📅 PRÓXIMO CATALIZADOR        │                         │
│  Earnings en 3 días ⚠️         │                         │
└────────────────────────────────┴─────────────────────────┘
│  [Historial de análisis anteriores — expandible]         │
└──────────────────────────────────────────────────────────┘

JOURNAL (/journal)
┌──────────────────────────────────────────────────────────┐
│  📓 TRADING JOURNAL                   [+ Nueva entrada]  │
├────────────────────────┬─────────────────────────────────┤
│  HISTORIAL             │  ESTADÍSTICAS                   │
│  ✅ AAPL BUY — Win     │  Win Rate:       62%            │
│  ❌ BTC  BUY — Loss    │  Avg Win:        +$XXX          │
│  ✅ NVDA BUY — Win     │  Avg Loss:       -$XXX          │
│  ⬜ MSFT SELL — open   │  Profit Factor:  1.8            │
│  ...                   │  Seguí el plan:  71%            │
│  [Filtros: símbolo,    │  Error frecuente:               │
│   outcome, setup,      │  "Entré sin confirmación"       │
│   fecha]               │  [por tag]                      │
└────────────────────────┴─────────────────────────────────┘

SCREENER (/screener)
┌──────────────────────────────────────────────────────────┐
│  🎯 SCREENER  [Momentum Growth ▼]  [Guardar]  [▶ Correr] │
├──────────────────────────────────────────────────────────┤
│  Market Cap ≥ [$2B ]  Revenue growth ≥ [20%]            │
│  Precio ≥    [$9   ]  Dist. ATH ≤     [-20%]            │
│  Volumen ≥   [200K ]  RSI semanal:    [50–70]           │
│  ☑ EPS próximo positivo   ☐ Sin dividendos              │
├──────────────────────────────────────────────────────────┤
│  12 resultados · 847 evaluados                           │
│  IA: "NVDA extiende tu posición con momentum técnico     │
│  sólido. CRWD es exposición nueva en ciberseguridad..."  │
│                                                          │
│  SYMBOL  PRECIO  GROW%  ATH%   RSI  EPS EST  SCORE      │
│  NVDA    $XXX   +45%  -5.2%   65  $X.XX    94 🟢 ★     │
│  META    $XXX   +22%  -8.1%   58  $X.XX    87 🟢        │
│  CRWD    $XXX   +31%  -12%    61  $X.XX    79 🟡        │
│  ★ = ya en portafolio · Click en fila → Research        │
└──────────────────────────────────────────────────────────┘
```

---

## ⚙️ Configuración Técnica

**.env.example:**
```
# Supabase (sí van en frontend)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Solo en Supabase Vault / Edge Functions — NUNCA en .env del frontend
# ALPACA_API_KEY=
# ALPACA_SECRET_KEY=
# ALPACA_BASE_URL=https://paper-api.alpaca.markets
# BINANCE_API_KEY=
# BINANCE_SECRET_KEY=
# FMP_API_KEY=                ← financialmodelingprep.com (free: 250 req/día)
# ANTHROPIC_API_KEY=
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Límites de rate — el agente debe respetarlos:**
```
FMP free:         250 req/día  → cache 24h en fundamentals_cache (obligatorio)
Alpaca data:      sin límite   → cache 60s para precio, 1h para técnicos
Anthropic API:    sin límite fijo → prompts concisos con datos pre-estructurados
Screener sync:    1 vez al día → cron Supabase, nunca en cada screener run
```

---

## 🚀 Orden de Construcción para Claude Code

### Fase 1: Setup + Auth + Dashboard Básico

- [ ] `npm create vite@latest tradeos-personal -- --template react-ts`
- [ ] Instalar: `tailwindcss shadcn/ui zustand @tanstack/react-query @supabase/supabase-js recharts`
- [ ] Tailwind con variables CSS del sistema de diseño (tema dark)
- [ ] shadcn/ui con tema custom
- [ ] Supabase: proyecto nuevo + Auth email/password
- [ ] Migration `001`: `user_settings`
- [ ] Migration `002`: `positions`, `equity_snapshots`
- [ ] `Login.tsx` con Supabase Auth
- [ ] `AppShell.tsx` con Sidebar colapsable y 7 rutas
- [ ] Edge Function `alpaca-proxy`: GET `/account`, GET `/positions`
- [ ] Alpaca paper keys como Supabase Secrets
- [ ] Hook `usePortfolio` → React Query, stale 30s
- [ ] `Dashboard.tsx`: equity total + posiciones PnL color-coded + sección eventos placeholder
- [ ] `EquityChart.tsx`: Recharts
- [ ] Seed data al primer login
- [ ] **Criterio de éxito**: Login → posiciones Alpaca paper visibles → dashboard < 2s

### Fase 2: Trading Engine + Risk Calculator

- [ ] Migration `003`: `orders`
- [ ] `RiskCalculator.tsx`: qty sugerida dado stop loss y `risk_per_trade_pct`
- [ ] `OrderForm.tsx` integrado con RiskCalculator
- [ ] `ConfirmOrderModal.tsx`: resumen + advertencia si supera `max_position_size_pct`
- [ ] Edge Function `alpaca-proxy` POST `/orders` con validación paper/live
- [ ] Hook `useOrders` con polling de status
- [ ] `Trading.tsx`: order form + watchlist
- [ ] **Criterio de éxito**: Orden paper ejecutada con riesgo calculado y modal de confirmación

### Fase 3: Fundamentales + Research Agent

- [ ] Migration `004`: `market_data_cache`, `fundamentals_cache`
- [ ] Edge Function `fmp-proxy`: EPS, revenue growth, guidance, earnings calendar
- [ ] Edge Function `claude-research`:
  - Fetch paralelo: Alpaca (técnicos) + FMP cache (fundamentales) + portafolio usuario
  - Calcula ATH distance y RSI semanal desde data histórica de Alpaca
  - Prompt con las 7 secciones definidas en Flujo 3 → streaming
- [ ] `KpiGrid.tsx`, `TradingViewWidget.tsx`, `PortfolioContextPanel.tsx`
- [ ] `ResearchPanel.tsx`: layout dos columnas + streaming + historial
- [ ] Migration `005`: `research_entries`
- [ ] **Criterio de éxito**: Research de AAPL muestra ATH dist + RSI + EPS guidance FMP + sección exposición + chart TradingView

### Fase 4: Trading Journal

- [ ] Migration `006`: `journal_entries`
- [ ] `JournalForm.tsx`: pre-trade (tesis, emotional state, confidence, stop/target)
- [ ] Trigger automático: al confirmar orden → `JournalForm` con order_id prellenado
- [ ] `PostMortemPanel.tsx`: post-trade vinculado a entry existente
- [ ] Notificación al cerrar posición invitando al post-mortem
- [ ] `JournalList.tsx`: historial con filtros
- [ ] `JournalStats.tsx`: win rate, profit factor, followed_plan%, errores frecuentes
- [ ] `Journal.tsx`: página completa
- [ ] **Criterio de éxito**: Orden → Journal form → post-mortem → stats actualizadas

### Fase 5: Binance + Portfolio Doctor + Earnings Calendar

- [ ] Edge Function `binance-proxy` con endpoints spot
- [ ] Normalizar `positions` para equity + crypto con `portfolio_weight_pct`
- [ ] Unified equity total en `equity_snapshots`
- [ ] Migration `008`: `earnings_events`
- [ ] `fmp-proxy` actualizado con endpoint de earnings calendar por lista de símbolos
- [ ] `EarningsCalendar.tsx`: timeline 30 días
- [ ] Badge de earnings en `PositionCard` cuando < 7 días
- [ ] Edge Function `claude-portfolio-doctor`: portafolio completo + fundamentales → análisis holístico
- [ ] `PortfolioDoctor.tsx`: modal en Dashboard
- [ ] **Criterio de éxito**: Dashboard Alpaca + Binance unificados + Portfolio Doctor activo + earnings calendar

### Fase 6: Screener + Deploy

- [ ] Migration `007`: `screener_universe`, `screener_presets`, `screener_results`
- [ ] Edge Function `screener-universe-sync`: cachea universo de Alpaca diariamente
- [ ] Supabase cron: `screener-universe-sync` a las 8:00 AM ET cada día de mercado
- [ ] Edge Function `claude-screener`: filtra DB → enriquece con FMP cache → Claude scoring
- [ ] `ScreenerCriteriaForm.tsx`, `ScreenerResultsTable.tsx`, `ScreenerPanel.tsx`
- [ ] Presets default precargados en seed
- [ ] Click resultado → Research con símbolo precargado
- [ ] `Settings.tsx`: gestión de API keys + preferencias de riesgo
- [ ] Deploy en Vercel con todas las variables configuradas
- [ ] **Criterio de éxito**: Screener corre sobre universo cacheado → resultados puntuados → navegación a Research funciona

---

## 🚨 Reglas de Código

### SIEMPRE:
- TypeScript strict — `noImplicitAny` en todo el proyecto
- Acceso a Supabase solo desde hooks en `src/hooks/`; nunca en componentes directamente
- Formatear con `formatCurrency()`, `formatPercent()`, `formatDate()`, `formatQty()` de `lib/formatters.ts`
- Precios en `font-mono`; positivo `text-emerald-400`, negativo `text-red-400`
- Toda Edge Function con `try/catch` + `toast` de error para el usuario
- Edge Functions: validación de JWT de Supabase como primer paso antes de cualquier lógica
- Prompt de `claude-research`: incluir `ResearchDataSnapshot` completo + `PortfolioContext` antes de la pregunta
- Prompt de `claude-screener`: incluir portafolio actual para que Claude identifique qué complementa las posiciones
- Prompt de `claude-portfolio-doctor`: incluir todas las posiciones + fundamentales cacheados de cada una
- Respetar TTLs: 60s precios, 1h técnicos, 24h fundamentales FMP
- `RiskCalculator` siempre calcula desde `user_settings.risk_per_trade_pct` y `max_position_size_pct`

### NUNCA:
- API keys en el frontend o en tablas de Supabase
- Ejecutar órdenes sin `ConfirmOrderModal`
- Llamadas directas a APIs externas desde el cliente
- `any` en TypeScript sin comentario explicativo
- Estado local para datos de la DB (usar React Query)
- `live_trading_enabled: true` hardcodeado en ninguna parte
- Mostrar análisis de Research sin panel de datos fuente visible
- Mostrar resultados de Screener sin score y nota de Claude por ítem
- Llamar a FMP sin revisar el cache de 24h primero
- Correr `screener-universe-sync` en cada ejecución del screener

---

## 📋 Comandos de Desarrollo

```bash
# Setup inicial
npm create vite@latest tradeos-personal -- --template react-ts
cd tradeos-personal
npm install

# Dev
npm run dev

# Supabase local
supabase start
supabase functions serve alpaca-proxy --env-file .env.local
supabase functions serve fmp-proxy --env-file .env.local
supabase functions serve claude-research --env-file .env.local
supabase functions serve claude-screener --env-file .env.local
supabase functions serve claude-portfolio-doctor --env-file .env.local

# Test de Edge Function
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/claude-research' \
  --header 'Authorization: Bearer <SUPABASE_ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{"symbol":"AAPL","query":"¿Conviene mantener?"}'

# Migrations
supabase db push

# Deploy
vercel --prod
```

---

## 🔮 Roadmap Futuro (no construir ahora)

- **Live trading**: activar `live_trading_enabled` (requiere cuenta real Alpaca + auditoría de seguridad)
- **Screener push matutino**: cron que notifica cuando preset encuentra oportunidades nuevas
- **Journal analytics avanzados**: correlación entre emotional_state y win rate; heatmap de errores por setup type
- **Backtesting**: probar estrategias con datos históricos de Alpaca
- **Alertas de precio en tiempo real**: WebSocket Alpaca + browser notifications
- **Lightweight Charts**: reemplazar embed TradingView por charts nativos con datos propios
- **Portfolio analytics cuantitativos**: Sharpe ratio, max drawdown, beta vs SPY, correlación activos
- **Estrategias automatizadas**: reglas if/then para órdenes programáticas (paper only primero)
- **Mobile PWA**: versión táctil optimizada
- **Multi-usuario SaaS**: RLS ya está en Supabase; habilitar registro público
