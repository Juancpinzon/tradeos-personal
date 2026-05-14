# TradeOS Personal — Prompts por Fase

> Pegá cada prompt completo al inicio de la sesión correspondiente.
> Siempre tené el CLAUDE.md en la raíz del proyecto antes de empezar.

---

## FASE 1 — Setup + Auth + Dashboard Básico (con modo DEMO)

```
Lee el archivo CLAUDE.md completo antes de escribir cualquier línea de código.
Es tu contrato de comportamiento para todo el proyecto.

CONTEXTO DE DISEÑO (aplicar en todos los componentes visuales de esta fase):
Sos un diseñador de interfaces financieras de nivel institucional. El sistema de
diseño está definido en CLAUDE.md. El estilo es dark trading — industrial/utilitarian
con precisión quirúrgica. Tipografía: "Syne" para títulos (display weight, geométrica
y técnica), "IBM Plex Mono" para todos los números y precios. No uses Inter, Roboto
ni ninguna fuente genérica. Las animaciones deben ser rápidas y funcionales: fade-in
de 150ms en cards, no hay decoración innecesaria. Cada píxel debe justificar su
existencia. Alta densidad de información sin sensación de saturación.

MODO DEMO ACTIVO:
Las keys de Alpaca aún no están disponibles. Implementar un sistema de datos mock
que permita desarrollar y ver el dashboard completamente funcional. El mock debe
ser realista y fácil de reemplazar por datos reales cuando estén las keys.
La arquitectura real (Edge Functions, hooks, tipos) se construye igual — solo el
origen del dato cambia.

TAREA — Ejecutá la Fase 1 en este orden exacto:

1. Inicializar el proyecto:
   npm create vite@latest . -- --template react-ts
   Instalar: tailwindcss @tailwindcss/vite shadcn/ui zustand @tanstack/react-query
             @supabase/supabase-js recharts react-router-dom lucide-react

2. Configurar Tailwind con las variables CSS exactas del sistema de diseño del CLAUDE.md.
   Agregar "Syne" e "IBM Plex Mono" desde Google Fonts en index.html.
   Clase utilitaria `font-mono` debe usar IBM Plex Mono.

3. Inicializar shadcn/ui con tema "dark" y color base "slate".

4. Crear src/lib/supabase.ts con el cliente singleton.
   URL: https://ultpwclpjlkqaecdrjhi.supabase.co
   La anon key viene de import.meta.env.VITE_SUPABASE_ANON_KEY

5. Crear src/lib/formatters.ts con:
   - formatCurrency(value: number, decimals?: number): string  → "$1,234.56"
   - formatPercent(value: number, showSign?: boolean): string  → "+2.34%"
   - formatDate(date: Date | string): string
   - formatQty(value: number): string

6. Crear src/types/index.ts con TODAS las interfaces del schema del CLAUDE.md.

7. Crear src/lib/mockData.ts con datos demo realistas:
   Cuenta Alpaca paper:
   - equity: 125_430.50
   - cash: 18_200.00
   - buying_power: 36_400.00
   - pnl_today: +1_243.20
   - pnl_today_pct: +1.00

   Posiciones mock (usar los símbolos del seed data del CLAUDE.md):
   - AAPL: 45 acc, avg_entry $168.20, current $182.50, side long, asset_class equity
   - MSFT: 20 acc, avg_entry $378.00, current $415.30, side long, asset_class equity
   - NVDA: 15 acc, avg_entry $820.00, current $950.80, side long, asset_class equity
   - TSLA: 10 acc, avg_entry $195.00, current $178.40, side long, asset_class equity (pérdida)
   - SPY:  30 acc, avg_entry $490.00, current $528.60, side long, asset_class equity

   Equity snapshots últimos 30 días: generar array de 30 puntos con variación
   realista desde $118_000 hasta $125_430.

   Exportar: MOCK_ACCOUNT, MOCK_POSITIONS, MOCK_EQUITY_SNAPSHOTS

8. Ejecutar en Supabase SQL Editor las migrations:

   -- 001_auth_setup.sql
   CREATE TABLE public.user_settings (
     id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     alpaca_mode text NOT NULL DEFAULT 'paper' CHECK (alpaca_mode IN ('paper', 'live')),
     live_trading_enabled boolean NOT NULL DEFAULT false,
     default_broker text NOT NULL DEFAULT 'alpaca',
     risk_per_trade_pct numeric NOT NULL DEFAULT 2,
     max_position_size_pct numeric NOT NULL DEFAULT 15,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   );
   ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users can manage own settings"
     ON public.user_settings FOR ALL USING (auth.uid() = id);

   -- 002_portfolio_tables.sql
   CREATE TABLE public.positions (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     broker text NOT NULL,
     symbol text NOT NULL,
     qty numeric NOT NULL,
     avg_entry_price numeric NOT NULL,
     current_price numeric NOT NULL,
     market_value numeric NOT NULL,
     unrealized_pnl numeric NOT NULL,
     unrealized_pnl_pct numeric NOT NULL,
     portfolio_weight_pct numeric NOT NULL DEFAULT 0,
     side text NOT NULL DEFAULT 'long',
     asset_class text NOT NULL,
     synced_at timestamptz NOT NULL DEFAULT now(),
     created_at timestamptz NOT NULL DEFAULT now()
   );
   ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users see own positions"
     ON public.positions FOR ALL USING (auth.uid() = user_id);

   CREATE TABLE public.equity_snapshots (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     broker text NOT NULL DEFAULT 'total',
     equity numeric NOT NULL,
     cash numeric NOT NULL,
     buying_power numeric NOT NULL,
     snapshot_at timestamptz NOT NULL DEFAULT now()
   );
   ALTER TABLE public.equity_snapshots ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users see own snapshots"
     ON public.equity_snapshots FOR ALL USING (auth.uid() = user_id);

9. Crear src/pages/Login.tsx:
   - Formulario email + password con Supabase Auth
   - Estado de loading con spinner
   - Manejo de error con mensaje visible en rojo
   - Diseño: centrado verticalmente, logo "TradeOS" en Syne 700 con subtext
     "Personal Trading Platform", fondo --bg-base, card con --bg-surface,
     borde --border-default. Sin decoraciones innecesarias.

10. Crear src/components/layout/AppShell.tsx + Sidebar.tsx:
    - Sidebar colapsable (220px expandido, 60px colapsado con solo íconos)
    - 7 rutas con íconos lucide-react:
      LayoutDashboard → /
      TrendingUp → /trading
      Search → /research
      BookOpen → /journal
      Target → /screener
      History → /history
      Settings → /settings
    - Badge "PAPER" amarillo en el header, siempre visible
    - Transición collapse: 200ms ease
    - Email del usuario y botón logout al pie

11. Crear src/hooks/usePortfolio.ts:
    MODO DEMO: el hook retorna los datos de mockData.ts directamente.
    Estructura del retorno idéntica a la que usaría con datos reales:
    {
      account: MockAccount | null,
      positions: Position[],
      equitySnapshots: EquitySnapshot[],
      isLoading: boolean,
      isSyncing: boolean,
      refetch: () => void
    }
    Calcular portfolio_weight_pct para cada posición usando el equity total.
    Simular isSyncing: true por 1.5s al montar, luego false.
    Comentario en el hook: // TODO: reemplazar mock por llamada a alpaca-proxy
    cuando las keys estén disponibles.

12. Crear src/pages/Dashboard.tsx con:
    PortfolioSummary arriba:
    - Equity total grande en Syne 700
    - Cash y buying power como métricas secundarias
    - PnL del día con color semántico y signo explícito
    - Badges [Alpaca: $X] (Binance placeholder gris)

    Layout dos columnas:
    - Izquierda: lista de posiciones
    - Derecha: EquityChart

    Por cada posición en la lista:
    - Symbol en Syne 600, side badge
    - Qty y avg_entry en font-mono text-muted
    - Current price en font-mono
    - PnL en $ y % con colores semánticos, font-mono
    - portfolio_weight_pct como barra de progreso fina

    Sección "Próximos Eventos": placeholder con texto "—" en text-muted
    Botón "🩺 Portfolio Doctor": placeholder, disabled con tooltip "Disponible en Fase 5"
    Badge "actualizando..." visible cuando isSyncing es true

13. Crear src/components/portfolio/EquityChart.tsx:
    - Recharts LineChart con los 30 puntos de MOCK_EQUITY_SNAPSHOTS
    - Eje X: fechas abreviadas (Abr 15, Abr 16...)
    - Eje Y: oculto, valor en tooltip
    - Línea color --color-primary (#3b82f6), strokeWidth 2
    - Área bajo la curva con gradiente azul transparente (opacity 0.1)
    - Tooltip: fondo --bg-elevated, equity en font-mono, fecha formateada
    - Sin bordes ni decoración innecesaria

CRITERIO DE ÉXITO:
- Login funciona con Supabase Auth (email + password)
- Dashboard muestra los datos mock con diseño completo
- Todos los números en IBM Plex Mono
- PnL positivo en emerald-400, negativo en red-400
- Dashboard carga en < 2s
- Badge PAPER visible siempre
- No hay ningún `any` en TypeScript sin comentario explicativo
- El hook usePortfolio tiene el comentario TODO para el reemplazo futuro
```

---

## FASE 2 — Trading Engine + Risk Calculator

```
Lee el CLAUDE.md completo. La Fase 1 ya está completada.

CONTEXTO DE DISEÑO:
Continuás con el mismo sistema: dark trading, Syne para títulos, IBM Plex Mono para
números. En esta fase el componente crítico es el OrderForm + RiskCalculator.
El formulario debe sentirse como una terminal profesional: inputs con borde sutil que
se ilumina en --color-primary al focusear, labels pequeños en text-muted, valores en
font-mono. El ConfirmOrderModal debe ser sobrio y contundente: fondo --bg-elevated,
datos en tabla limpia, botón de confirmar en rojo si es venta, verde si es compra.
Microanimación: el modal entra con scale 0.97 → 1 en 150ms.

TAREA — Ejecutá la Fase 2 en este orden:

1. Migration 003_orders.sql:
   - Tabla orders con todos los campos del schema del CLAUDE.md
   - Incluir portfolio_weight_at_order y risk_amount
   - RLS: usuario solo ve sus órdenes

2. Crear src/components/trading/RiskCalculator.tsx:
   Props: entryPrice, stopLoss, totalEquity, riskPct, maxPositionPct
   Calcula y muestra en tiempo real:
   - Qty sugerida: (totalEquity * riskPct/100) / (entryPrice - stopLoss)
   - Capital en riesgo: qty * (entryPrice - stopLoss) en $ y %
   - R/R ratio: (target - entry) / (entry - stop) si hay target
   - Advertencia visible si la posición resultante > maxPositionPct
   Todo en font-mono. Actualización reactiva a cada cambio de input.

3. Crear src/components/trading/OrderForm.tsx:
   Campos: symbol, side (BUY/SELL toggle), order_type, qty, limit_price (si aplica),
           stop_loss (obligatorio para calcular riesgo), target (opcional)
   - RiskCalculator integrado debajo de los campos, actualiza en tiempo real
   - Validación: symbol no vacío, qty > 0, stop_loss requerido para market orders
   - Botón "Revisar orden" — no ejecuta, abre el modal

4. Crear src/components/trading/ConfirmOrderModal.tsx:
   Muestra resumen completo antes de ejecutar:
   - Symbol, side, type, qty, precio estimado
   - Capital en riesgo ($, %)
   - Peso resultante en portafolio (%)
   - Advertencia prominente si supera max_position_size_pct
   - Dos botones: "Cancelar" (gris) y "Confirmar orden" (verde/rojo según side)
   - NUNCA ejecutar sin pasar por este modal

5. Actualizar supabase/functions/alpaca-proxy/index.ts:
   Agregar endpoint: POST /orders
   - Validar JWT al inicio
   - Validar que alpaca_mode sea 'paper' O que live_trading_enabled sea true
   - Si live_trading_enabled es false y alpaca_mode es 'live': rechazar con 403
   - Proxy a Alpaca POST /v2/orders
   - Guardar la orden en tabla orders con snapshot de riesgo

6. Crear src/hooks/useOrders.ts:
   - GET historial de órdenes del usuario desde tabla orders
   - POST nueva orden (llama a alpaca-proxy, luego guarda en DB)
   - Polling de status cada 3s para órdenes en estado 'pending' o 'accepted'
   - React Query con invalidación al completarse una orden

7. Crear src/components/trading/OrderHistory.tsx:
   Tabla de órdenes recientes con: symbol, side, type, qty, precio, status, fecha
   Status con color: filled=verde, cancelled=gris, rejected=rojo, pending=amarillo

8. Crear src/pages/Trading.tsx:
   Layout dos columnas:
   - Izquierda: OrderForm + RiskCalculator
   - Derecha: watchlist con precios en tiempo real (leer de market_data_cache o Alpaca)
     + OrderHistory debajo
   Símbolo seleccionado en watchlist → se precarga en OrderForm

CRITERIO DE ÉXITO:
- Se puede enviar una orden paper desde la UI
- El RiskCalculator actualiza en tiempo real al cambiar stop loss
- El ConfirmOrderModal aparece siempre antes de ejecutar
- La orden queda registrada en la tabla orders con status correcto
- No es posible ejecutar una orden live si live_trading_enabled es false
```

---

## FASE 3 — Fundamentales + Research Agent

```
Lee el CLAUDE.md completo. Las fases 1 y 2 están completadas.

CONTEXTO DE DISEÑO:
El Research Agent es la pantalla más densa de información de la app. Layout de dos
columnas: análisis en streaming a la izquierda (70% del ancho), datos fuente + chart
a la derecha (30%). La columna derecha tiene fondo --bg-elevated y sticky scroll.
El streaming de texto debe aparecer con un cursor parpadeante al final mientras llega.
El KpiGrid usa cards compactas: label en text-muted 10px, valor en IBM Plex Mono 16px
bold, variación con color semántico. El TradingView embed usa iframe con border-radius
8px y sin borde visible. Las 7 secciones del análisis tienen headers con emoji + Syne
600 12px uppercase tracking-wider.

TAREA — Ejecutá la Fase 3 en este orden:

1. Migration 004_market_cache.sql:
   Tablas market_data_cache y fundamentals_cache con todos los campos del schema.
   Index en symbol para queries rápidas.

2. Migration 005_research.sql:
   Tabla research_entries con campos data_used (jsonb) y portfolio_context (jsonb).
   RLS: usuario solo ve sus análisis.

3. Edge Function supabase/functions/fmp-proxy/index.ts:
   Validar JWT. Leer FMP_API_KEY desde Deno.env.
   Base URL: https://financialmodelingprep.com/api/v3
   Endpoints a implementar:
   - GET /quote/{symbol}       → precio, market cap, PE, 52w high/low, volumen
   - GET /income-statement/{symbol}?limit=2 → revenue growth YoY
   - GET /analyst-estimates/{symbol}?limit=1 → EPS guidance próximo trimestre
   - GET /earning_calendar?from=YYYY-MM-DD&to=YYYY-MM-DD → earnings próximos
   Cache: antes de llamar a FMP, verificar si hay dato en fundamentals_cache con
   fetched_at < 24h. Si existe, retornar cache. Si no, llamar FMP y guardar en cache.
   Esto es obligatorio para respetar el límite de 250 req/día del free tier.

4. Edge Function supabase/functions/claude-research/index.ts:
   Validar JWT. Leer ANTHROPIC_API_KEY desde Deno.env.
   Recibe: { symbol: string, query: string }
   Pasos:
   a) En paralelo (Promise.all):
      - Alpaca: GET /v2/stocks/{symbol}/bars para calcular RSI semanal (14 períodos)
      - Alpaca: GET /v2/assets/{symbol} para datos básicos
      - fmp-proxy: quote + fundamentals del símbolo
      - Supabase DB: posición actual del usuario en ese símbolo (tabla positions)
   b) Calcular ATH distance: (price - week_52_high) / week_52_high * 100
   c) Calcular RSI semanal desde las barras históricas
   d) Construir ResearchDataSnapshot y PortfolioContext completos
   e) Construir prompt con TODOS los datos antes de la pregunta del usuario:

   SYSTEM: "Sos un analista financiero senior. Respondés SIEMPRE en español.
   Estructurás tu respuesta en exactamente estas 7 secciones con estos headers:
   📊 CUADRO DE MANDO, 📈 TESIS DE INVERSIÓN, 📉 ANÁLISIS FUNDAMENTAL,
   💼 TU EXPOSICIÓN, ⚠️ RIESGOS, 📐 NIVELES TÉCNICOS, 📅 PRÓXIMO CATALIZADOR.
   Usás datos concretos. Sos directo. Máximo 3 riesgos. Si no hay posición del usuario,
   omitís la sección TU EXPOSICIÓN."

   USER: "Datos del activo al [fecha]:
   Precio: $X | ATH dist: X% | RSI semanal: X | Vol 30d: X
   EPS actual: $X | EPS est Q+1: $X (+X%) | Revenue growth: X% | P/E: X
   Próximo earnings: [fecha o 'no disponible']
   Posición del usuario: [datos o 'Sin posición']
   Equity total del portafolio: $X
   Pregunta: [query del usuario]"

   f) Llamar Claude API con streaming (claude-sonnet-4-20250514)
   g) Retornar stream al cliente
   h) Al completarse, guardar en research_entries con data_used y portfolio_context

5. Crear src/components/research/KpiGrid.tsx:
   Grid 2x4 de cards compactas mostrando los 8 KPIs clave del ResearchDataSnapshot.
   Highlight especial si earnings date < 7 días: badge amarillo parpadeante.

6. Crear src/components/research/TradingViewWidget.tsx:
   Iframe embed: https://www.tradingview.com/widgetembed/?symbol={symbol}&theme=dark
   &style=1&locale=es&toolbar_bg=%23111827&hide_side_toolbar=1
   Altura fija 300px. Borde redondeado. Sin scroll interno visible.

7. Crear src/components/research/PortfolioContextPanel.tsx:
   Si el usuario tiene posición: muestra qty, avg entry, precio actual, PnL $ y %,
   weight% del portafolio. Todo en font-mono con colores semánticos.
   Si no tiene posición: "Sin posición en {symbol}" en text-muted.

8. Crear src/components/research/ResearchPanel.tsx:
   - Input de símbolo + textarea de pregunta + botón "Analizar"
   - Streaming: recibe chunks del Edge Function y los agrega al estado
   - Cursor parpadeante al final del texto mientras llega el stream
   - Layout dos columnas: análisis (izquierda 70%) | KpiGrid + PortfolioContextPanel
     + TradingViewWidget (derecha 30%, sticky)
   - Historial de análisis anteriores colapsable al pie

9. Crear src/hooks/useResearch.ts:
   - Función analyzeSymbol(symbol, query) que llama a claude-research con fetch streaming
   - Estado: loading, streaming, error, result
   - Leer historial de research_entries desde Supabase

10. Crear src/pages/Research.tsx integrando ResearchPanel.

CRITERIO DE ÉXITO:
- Research de AAPL muestra ATH distance, RSI semanal, EPS guidance de FMP,
  sección "Tu exposición" si hay posición, y chart de TradingView
- Panel de datos fuente siempre visible junto al análisis
- FMP no se llama si hay cache de < 24h
- El análisis se guarda en research_entries con data_used completo
```

---

## FASE 4 — Trading Journal

```
Lee el CLAUDE.md completo. Las fases 1, 2 y 3 están completadas.

CONTEXTO DE DISEÑO:
El Journal es la pantalla más personal de la app. Tono ligeramente más cálido que
el resto pero mantiene el dark base. El JournalForm tiene secciones claramente
diferenciadas: PRE-TRADE (borde izquierdo azul) y POST-TRADE (borde izquierdo
verde si win, rojo si loss). El Emotional State usa botones pill seleccionables,
no un dropdown. El Confidence Level es un slider visual de 5 puntos con colores
de rojo a verde. JournalStats usa números grandes en Syne 700 para las métricas
clave (win rate, profit factor).

TAREA — Ejecutá la Fase 4 en este orden:

1. Migration 006_journal.sql:
   Tabla journal_entries con todos los campos del schema del CLAUDE.md.
   RLS: usuario solo ve sus entradas.
   Index en order_id, symbol, outcome para queries de stats.

2. Crear src/components/journal/JournalForm.tsx:
   Modo PRE-TRADE (campos obligatorios): entry_thesis, emotional_state, confidence_level
   Campos opcionales: setup_type, planned_stop_loss, planned_target
   - planned_risk_reward: calculado automáticamente si hay stop y target
   - emotional_state: 5 botones pill (Calm, Excited, Fearful, Uncertain, Confident)
   - confidence_level: 5 puntos visuales con colores semáforo
   Props: orderId? (si viene de una orden), symbol, side, onSave

3. Trigger automático: en useOrders.ts, cuando una orden pasa a status 'filled',
   abrir automáticamente el JournalForm en un Sheet (panel lateral de shadcn/ui)
   con el order_id prellenado. El usuario puede cerrarlo (no es bloqueante).

4. Crear src/components/journal/PostMortemPanel.tsx:
   Campos: outcome (win/loss/breakeven), actual_pnl, actual_pnl_pct, exit_reason,
           what_went_right, what_went_wrong, lesson, followed_plan, post_emotional_state
   Se muestra cuando una entrada de journal tiene order_id pero no tiene outcome.
   Notificación en sidebar (badge numérico) cuando hay post-mortems pendientes.

5. Crear src/hooks/useJournal.ts:
   - CRUD completo de journal_entries
   - getStats(): calcula win_rate, avg_win, avg_loss, profit_factor, followed_plan_pct
   - getFrequentTags(): agrupa errores por tag, retorna los más frecuentes
   - React Query con invalidación en cada save

6. Crear src/components/journal/JournalStats.tsx:
   Métricas en cards grandes:
   - Win Rate: número grande en Syne 700, color según valor (>60% verde, <40% rojo)
   - Profit Factor: ídem
   - Seguí el plan: % con barra de progreso
   - Error más frecuente: el tag con más ocurrencias en entries con outcome='loss'
   - Avg Win vs Avg Loss: visualización de barras horizontal comparativa

7. Crear src/components/journal/JournalList.tsx:
   Lista de entradas con: símbolo, side, fecha, outcome (emoji ✅❌⬜), PnL si existe
   Filtros: por símbolo, outcome, setup_type, rango de fechas
   Click en entrada → expande detalle inline o abre PostMortemPanel si está incompleta

8. Crear src/pages/Journal.tsx:
   Layout: JournalList (izquierda 60%) + JournalStats (derecha 40%)
   Botón "+ Nueva entrada" para journal sin orden vinculada (análisis independiente)

CRITERIO DE ÉXITO:
- Al ejecutar una orden, el JournalForm aparece automáticamente
- Se puede completar pre-trade y post-trade en entradas distintas
- JournalStats muestra win rate, profit factor y error más frecuente
- Los post-mortems pendientes generan badge en el sidebar
```

---

## FASE 5 — Binance + Portfolio Doctor + Earnings Calendar

```
Lee el CLAUDE.md completo. Las fases 1, 2, 3 y 4 están completadas.

CONTEXTO DE DISEÑO:
Portfolio Doctor es un modal grande (90vh) con estilo de informe ejecutivo.
Header con nivel de riesgo del portafolio en badge grande (Conservative=azul,
Moderate=amarillo, Aggressive=rojo). Las recomendaciones de Claude se muestran
como cards accionables: cada recomendación tiene un botón "→ Ver en Trading"
que navega a /trading con el símbolo precargado.
El Earnings Calendar es un timeline horizontal con puntos en la línea del tiempo,
coloreados por broker y con badge de días restantes.

TAREA — Ejecutá la Fase 5 en este orden:

1. Edge Function supabase/functions/binance-proxy/index.ts:
   Validar JWT. Leer BINANCE_API_KEY y BINANCE_SECRET_KEY desde Deno.env.
   Endpoints:
   - GET /account → balances spot (solo activos con balance > 0)
   - GET /ticker/price?symbol={symbol} → precio actual
   Normalizar respuesta al mismo formato que alpaca-proxy para positions.

2. Actualizar usePortfolio.ts:
   - Llamar a binance-proxy además de alpaca-proxy
   - Normalizar posiciones de ambos brokers al tipo Position del schema
   - Calcular portfolio_weight_pct considerando equity total (Alpaca + Binance)
   - Guardar equity_snapshot con broker='total'

3. Actualizar Dashboard.tsx:
   - Mostrar [Alpaca: $X] [Binance: $X] como sub-totales del equity total
   - Las posiciones de ambos brokers en la misma lista, con badge de broker

4. Migration 008_watchlist_earnings.sql:
   Tablas watchlist_items y earnings_events con todos los campos del schema.
   RLS en watchlist_items. earnings_events es pública (no tiene user_id).

5. Actualizar fmp-proxy con endpoint de earnings calendar:
   GET /earning_calendar?from={today}&to={today+30days}
   Filtrar por símbolos de posiciones + watchlist del usuario.
   Guardar en earnings_events con fetched_at para cache de 6h.

6. Crear src/hooks/useEarnings.ts:
   Obtiene earnings de los próximos 30 días para posiciones abiertas + watchlist.
   Retorna lista ordenada por fecha.

7. Crear src/components/earnings/EarningsCalendar.tsx:
   Timeline horizontal de los próximos 30 días.
   Cada evento: símbolo, fecha, before/after market, EPS estimate.
   Eventos en < 7 días: destacados con borde amarillo.
   Eventos en < 3 días: badge rojo parpadeante.

8. Actualizar PositionCard.tsx:
   Si la posición tiene earnings en < 7 días: mostrar badge amarillo "📅 Xd"
   Si earnings en < 3 días: badge rojo parpadeante

9. Actualizar Dashboard.tsx:
   Sección "Próximos Eventos" ahora real: muestra EarningsCalendar con los
   próximos 3 eventos más cercanos. Link "Ver todos →" a /history#earnings.

10. Edge Function supabase/functions/claude-portfolio-doctor/index.ts:
    Validar JWT. Leer ANTHROPIC_API_KEY.
    Recibe: (sin body, usa el user_id del JWT para obtener datos)
    Pasos:
    a) Leer todas las positions del usuario desde DB
    b) Para cada posición, leer fundamentals_cache de FMP (sin llamar FMP si hay cache)
    c) Leer equity_snapshots últimos 30 días para ver dirección del capital
    d) Construir prompt con portafolio completo estructurado
    e) Claude API (claude-sonnet-4-20250514, max_tokens: 2000):

    SYSTEM: "Sos un gestor de portafolio senior. Analizás el portafolio COMPLETO,
    no activo por activo. Respondés en español. Estructurás en estas secciones:
    🎯 NIVEL DE RIESGO (una palabra: Conservative/Moderate/Aggressive + justificación),
    📊 CONCENTRACIÓN (análisis de distribución por sector y activo),
    🔗 CORRELACIÓN (qué posiciones se mueven juntas y qué riesgo representa),
    ⚖️ POSICIONES DÉBILES (máximo 2, con datos fundamentales concretos),
    ✂️ QUÉ RECORTARÍA (con precio target de salida sugerido),
    📈 QUÉ AMPLIARÍA (con justificación basada en fundamentales),
    🚀 OPORTUNIDAD AUSENTE (qué sector o activo falta en este portafolio y por qué)"

    f) Retornar análisis completo (no streaming, esperar respuesta completa)
    g) Guardar en research_entries con symbol='PORTFOLIO'

11. Crear src/components/portfolio/PortfolioDoctor.tsx:
    Modal grande (Dialog de shadcn/ui, max-w-4xl).
    Header: nivel de riesgo en badge prominente.
    Contenido: secciones del análisis con separadores visuales.
    Footer: botón "Guardar análisis" + fecha del último análisis.
    Trigger: botón "🩺 Portfolio Doctor" en Dashboard (reemplazar placeholder).
    Loading state: "Analizando tu portafolio..." con spinner durante la llamada.

CRITERIO DE ÉXITO:
- Dashboard muestra posiciones de Alpaca y Binance unificadas
- Portfolio Doctor genera análisis holístico con nivel de riesgo visible
- Earnings Calendar muestra eventos reales de FMP para posiciones + watchlist
- Badge de earnings visible en PositionCard cuando corresponde
```

---

## FASE 6 — Screener + Settings + Deploy

```
Lee el CLAUDE.md completo. Las fases 1 a 5 están completadas.

CONTEXTO DE DISEÑO:
El Screener es la pantalla más "herramienta" de la app. Los criterios están en un
panel lateral izquierdo (300px fijo), los resultados ocupan el resto. La tabla de
resultados tiene hover state que ilumina toda la fila. El score badge es el elemento
más llamativo visualmente: 94 en verde brillante se ve desde lejos. Al hacer hover
en una fila, aparece un tooltip con la nota de Claude. Click en fila navega a Research
con ese símbolo. Settings es sobria: secciones claramente separadas con headers,
inputs de password para las API keys con toggle de visibilidad.

TAREA — Ejecutá la Fase 6 en este orden:

1. Migration 007_screener.sql:
   Tablas screener_universe, screener_presets y screener_results con todos los campos
   del schema del CLAUDE.md. RLS en presets y results. screener_universe es pública.

2. Edge Function supabase/functions/screener-universe-sync/index.ts:
   Sin JWT (es un cron job, se autentica con service role key).
   Llama a Alpaca GET /v2/assets?status=active&asset_class=us_equity
   Filtra: market cap > $500M (si Alpaca lo provee), exchange en NYSE/NASDAQ
   Hace upsert en screener_universe con los datos disponibles.
   Configura el cron en Supabase Dashboard: cada día a las 8:00 AM ET (13:00 UTC)
   llamando a esta Edge Function.

3. Edge Function supabase/functions/claude-screener/index.ts:
   Validar JWT. Leer ANTHROPIC_API_KEY y FMP_API_KEY.
   Recibe: { criteria: ScreenerCriteria }
   Pasos:
   a) Query a screener_universe en Supabase aplicando filtros objetivos:
      market_cap >= criteria.market_cap_min (si existe)
      price >= criteria.price_min (si existe)
      volume_avg_30d >= criteria.volume_avg_min (si existe)
      asset_class según criteria.asset_class
      Esto debe retornar máximo 200 candidatos.
   b) Para cada candidato, buscar en fundamentals_cache (sin llamar FMP si hay cache < 24h)
      Si no hay cache, hacer batch de llamadas a FMP para los que faltan
   c) Filtrar candidatos por criterios fundamentales:
      revenue_growth_pct >= criteria.revenue_growth_min_pct
      eps_next_estimate > 0 si criteria.eps_next_positive
      ath_distance_pct >= criteria.ath_distance_max_pct (ej: >= -20)
      rsi_weekly entre min y max si se especificaron
   d) Obtener posiciones actuales del usuario
   e) Llamar Claude API con la lista filtrada + portafolio del usuario:

   PROMPT USER: "Tengo estos {N} candidatos que pasaron los filtros:
   [{symbol, name, price, market_cap, revenue_growth_pct, ath_distance_pct,
     rsi_weekly, eps_next_estimate, next_earnings_date}]
   Mi portafolio actual: [{symbol, portfolio_weight_pct}]
   Para cada candidato: asignale un score de 0-100 y escribí una nota de máximo
   2 líneas en español explicando por qué destaca o no.
   Luego escribí un resumen ejecutivo de máximo 3 oraciones sobre los mejores
   resultados en el contexto de mi portafolio actual.
   Respondé SOLO en JSON con este formato exacto:
   {
     'summary': string,
     'items': [{'symbol': string, 'score': number, 'ai_note': string}]
   }"

   f) Parsear respuesta JSON de Claude
   g) Combinar con datos del candidato para construir ScreenerResultItem[]
   h) Marcar already_in_portfolio y already_in_watchlist
   i) Guardar en screener_results
   j) Retornar ScreenerResult completo

4. Crear src/stores/screenerStore.ts:
   Estado: activeCriteria, activePresetId, lastResult, isRunning

5. Crear src/hooks/useScreener.ts:
   - runScreener(criteria): llama a claude-screener, actualiza store
   - getPresets(): lista de presets del usuario
   - savePreset(name, criteria): guarda nuevo preset
   - loadPreset(id): carga criterios de un preset en el store

6. Crear src/components/screener/ScreenerCriteriaForm.tsx:
   Inputs para cada campo de ScreenerCriteria:
   - market_cap_min: input con formato "$2B", "$500M" etc.
   - revenue_growth_min_pct: slider + input numérico
   - ath_distance_max_pct: slider negativo (-50% a 0%)
   - rsi_weekly: rango doble (min-max)
   - eps_next_positive: toggle
   - exclude_dividends: toggle
   - asset_class: selector Equity / Crypto / Ambos

7. Crear src/components/screener/ScreenerResultsTable.tsx:
   Columnas: Symbol, Nombre, Precio, Market Cap, Rev Growth, ATH%, RSI, EPS Est, Score
   - Sorteable por cualquier columna (click en header)
   - Score badge con color según valor
   - Fila con ★ si already_in_portfolio, con 👁 si already_in_watchlist
   - Hover en fila: tooltip con ai_note de Claude
   - Click en fila: navegar a /research con el símbolo precargado

8. Crear src/components/screener/ScreenerPanel.tsx:
   Layout: criterios (izquierda 280px fijo) + resultados (resto)
   Header: selector de preset + botón "Guardar preset" + botón "▶ Correr"
   Resumen de Claude arriba de la tabla (ai_summary)
   Estado vacío: "Configurá los criterios y hacé clic en Correr"
   Estado loading: "Analizando {N} candidatos..." con barra de progreso animada

9. Crear src/pages/Screener.tsx integrando ScreenerPanel.
   Precargar los 2 presets default del seed data si el usuario no tiene presets aún.

10. Crear src/pages/Settings.tsx:
    Secciones:
    a) API Keys: inputs de password (con toggle show/hide) para Alpaca key+secret y Binance key+secret
       Botón "Guardar y verificar" → llama a save-api-keys Edge Function
       Badge de estado: ✅ Conectado / ❌ Error / ⬜ No configurado
    b) Risk Management: sliders para risk_per_trade_pct y max_position_size_pct
    c) Trading Mode: toggle Paper / Live con advertencia prominente al activar live

11. Edge Function supabase/functions/save-api-keys/index.ts:
    Validar JWT.
    Recibe: { broker: 'alpaca'|'binance', api_key: string, secret_key: string }
    Guarda en Supabase Vault con nombre '{broker}_api_key_{user_id}' y '{broker}_secret_{user_id}'
    Hace test de conexión al broker con las keys recibidas
    Retorna: { valid: boolean, error?: string }

12. Deploy en Vercel:
    - Conectar repositorio GitHub a Vercel
    - Variables de entorno: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
    - Las demás keys van en Supabase Vault, no en Vercel
    - Build command: npm run build | Output: dist
    - Verificar que el deploy funciona con Auth y Dashboard

CRITERIO DE ÉXITO:
- Screener corre sobre screener_universe cacheado (no llamadas en tiempo real a miles de tickers)
- Resultados aparecen con score de Claude y nota por ítem
- Click en resultado navega a Research con el símbolo
- Settings guarda keys en Supabase Vault y verifica conexión
- App funcionando en producción en Vercel
```

---

FASE 7 — Alertas de precio + Watchlist completa

Lee CLAUDE.md completo antes de escribir cualquier línea.

Fases 1-6 completadas.

TAREA:

1. Migration 010_watchlist.sql:
   CREATE TABLE public.watchlist_items (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   symbol text NOT NULL,
   broker text NOT NULL DEFAULT 'alpaca',
   asset_class text NOT NULL DEFAULT 'equity',
   alert_price_above numeric,
   alert_price_below numeric,
   notes text,
   added_at timestamptz NOT NULL DEFAULT now(),
   UNIQUE(user_id, symbol)
   );
   ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users manage own watchlist"
   ON public.watchlist_items FOR ALL USING (auth.uid() = user_id);

2. Seed data automático al crear cuenta:
   Insertar watchlist default: AAPL, MSFT, NVDA, TSLA, SPY (equity)
   BTC/USDT, ETH/USDT (crypto)

3. Crear src/hooks/useWatchlist.ts:
   - CRUD completo de watchlist_items
   - getWatchlistWithPrices(): combina items con precios actuales
     de market_data_cache o alpaca-proxy /quote
   - checkAlerts(): para cada item con alert_price_above/below,
     comparar con precio actual y disparar toast si se cruza el nivel
   - React Query con refetch cada 30s

4. Crear src/components/watchlist/WatchlistPanel.tsx:
   Lista de símbolos con precio actual, cambio % del día, bid/ask
   Botón "+" para agregar símbolo
   Botón de alerta por ítem (campana) → abre modal de configuración
   Click en símbolo → precarga en OrderForm si está en /trading
   Click en símbolo → precarga en Research si está en /research

5. Crear src/components/watchlist/AlertConfigModal.tsx:
   Inputs: alert_price_above y alert_price_below
   Preview: "Alerta si AAPL sube sobre $X o baja de $Y"
   Botón guardar → actualiza watchlist_items

6. Integrar checkAlerts() en useMarketData.ts:
   Cada vez que se refrescan precios, verificar alertas
   Toast de alerta con símbolo, dirección y precio actual
   Color: verde si cruza hacia arriba, rojo si cruza hacia abajo

7. Actualizar Trading.tsx:
   Panel derecho: WatchlistPanel en lugar de lista estática
   Precios en tiempo real desde useWatchlist

CRITERIO DE ÉXITO:
✓

## FASE 8 — Importador de Historial desde Excel

```
Lee el CLAUDE.md completo antes de escribir cualquier línea de código.

CONTEXTO DE DISEÑO:
Mismo sistema de diseño de toda la app: dark trading, IBM Plex Mono para números,
Syne para títulos. El importador debe sentirse como una herramienta profesional —
drag & drop limpio, preview de datos antes de confirmar, feedback claro en cada paso.
Usar shadcn/ui Sheet o Dialog para el flujo de importación paso a paso.

OBJETIVO:
Construir un importador de historial de operaciones desde Excel (.xlsx) que permita
al usuario cargar operaciones históricas previas a TradeOS. Esto alimenta el Journal
y el historial de órdenes con datos reales, generando estadísticas desde el primer día.

TAREA — Ejecutá la Fase 8 en este orden:

1. Migration 009_import_history.sql:
   Tabla import_sessions para trackear cada importación:
   CREATE TABLE public.import_sessions (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     filename text NOT NULL,
     total_rows integer NOT NULL,
     imported_rows integer NOT NULL DEFAULT 0,
     skipped_rows integer NOT NULL DEFAULT 0,
     status text NOT NULL DEFAULT 'pending'
       CHECK (status IN ('pending', 'preview', 'importing', 'completed', 'failed')),
     errors jsonb DEFAULT '[]',
     created_at timestamptz NOT NULL DEFAULT now(),
     completed_at timestamptz
   );
   ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users manage own imports"
     ON public.import_sessions FOR ALL USING (auth.uid() = user_id);

2. Instalar dependencia: npm install xlsx
   Esta librería lee archivos .xlsx directamente en el frontend sin backend.

3. Crear src/lib/importParser.ts con estas funciones:

   // Detecta automáticamente el formato del Excel subido
   // Soporta el formato de Copia_de_Compra_y_venta_de_acciones.xlsx
   // y un formato genérico alternativo
   detectFormat(rows: unknown[][]): 'tradeos' | 'generic' | 'unknown'

   // Parsea el formato específico del historial del usuario:
   // Columnas: Ticker, Movimiento (Compra/Venta), Cantidad, Precio, Fecha
   parseTradeOSFormat(rows: unknown[][]): ParsedTrade[]

   // Parsea formato genérico con columnas estándar:
   // Symbol, Side (buy/sell), Qty, Price, Date
   parseGenericFormat(rows: unknown[][]): ParsedTrade[]

   interface ParsedTrade {
     symbol: string
     side: 'buy' | 'sell'
     qty: number
     price: number
     date: Date
     total: number          // calculado: qty * price
     asset_class: 'equity' | 'crypto'  // detectado por el símbolo
     raw_row: unknown[]     // fila original para mostrar en preview
     error?: string         // si hay problema con esta fila
   }

   // Reglas de detección asset_class:
   // Si el símbolo contiene '/' o termina en USDT/BTC/ETH → crypto
   // Resto → equity

4. Crear src/components/importer/ImporterModal.tsx:
   Modal grande (max-w-3xl) con flujo de 4 pasos:

   PASO 1 — UPLOAD:
   - Zona de drag & drop con borde punteado azul
   - También acepta click para seleccionar archivo
   - Solo acepta .xlsx
   - Al soltar el archivo, parsea inmediatamente con importParser.ts
   - Mensaje de error claro si el formato no es reconocido

   PASO 2 — PREVIEW:
   - Tabla con las primeras 10 filas parseadas
   - Columnas: Fecha, Symbol, Side (badge BUY/SELL), Qty, Precio, Total, Estado
   - Estado: ✅ OK o ⚠️ con descripción del error por fila
   - Resumen arriba: "X operaciones encontradas · Y válidas · Z con errores"
   - Selector de broker: Alpaca / Binance / Manual (default: Manual)
   - Checkbox: "Crear entrada de Journal para cada operación importada"
   - Botones: "Cancelar" y "Importar X operaciones válidas"

   PASO 3 — IMPORTANDO:
   - Barra de progreso animada
   - Contador: "Importando 15 de 45 operaciones..."
   - No se puede cerrar el modal durante este paso

   PASO 4 — COMPLETADO:
   - Resumen final: importadas, omitidas, errores
   - Si hubo errores: lista descargable de filas que fallaron
   - Botón "Ver en Historial" → navega a /history
   - Botón "Ver estadísticas del Journal" → navega a /journal

5. Crear src/hooks/useImporter.ts:
   Estado del importador: step, parsedTrades, validTrades, errors, progress

   Función importTrades(trades: ParsedTrade[], options: ImportOptions):
   - Procesa en lotes de 10 para no saturar Supabase
   - Por cada trade válido:
     a) Inserta en tabla orders con status='filled', broker según selección
        y filled_at = date del trade, filled_avg_price = price
     b) Si checkbox de Journal activo: inserta en journal_entries con
        entry_thesis = 'Operación importada desde historial' y
        outcome según side (si es venta, marcar como cerrada)
   - Actualiza progreso en tiempo real
   - Guarda resultado en import_sessions

6. Actualizar src/pages/Settings.tsx:
   Agregar nueva sección "Historial" después de "Gestión de Riesgo":
   - Título: "Importar historial de operaciones"
   - Descripción: "Cargá operaciones previas desde Excel para alimentar
     el Journal con datos reales."
   - Botón "Importar desde Excel" → abre ImporterModal
   - Lista de importaciones anteriores con: fecha, archivo, cantidad importada, estado
   - Formato soportado mostrado como referencia:
     Columnas requeridas: Ticker | Movimiento | Cantidad | Precio | Fecha
     Formatos de fecha aceptados: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD

7. Crear src/components/importer/FormatGuide.tsx:
   Componente colapsable dentro del modal que muestra:
   - Tabla de ejemplo con el formato esperado
   - Nota: "Si tu Excel tiene columnas distintas, el importador
     intenta detectarlas automáticamente"
   - Link de descarga a una plantilla Excel vacía con el formato correcto

8. Generar plantilla Excel descargable:
   Crear public/template_historial.xlsx con:
   - Hoja "Movimientos" con headers: Ticker | Movimiento | Cantidad | Precio | Fecha
   - 3 filas de ejemplo: AAPL Compra 10 182.50 15/04/2024
   - Instrucciones en una segunda hoja "Instrucciones"
   Usar la librería xlsx para generarla en el frontend on-demand.

9. Actualizar src/pages/History.tsx:
   Agregar badge "Importado" en las órdenes que vinieron de una importación.
   Filtro adicional en la barra: "Mostrar: Todas | Ejecutadas | Importadas"

CRITERIO DE ÉXITO:
- Se puede subir el archivo Copia_de_Compra_y_venta_de_acciones.xlsx
  y el sistema detecta automáticamente el formato
- El preview muestra las 9 operaciones del archivo con datos correctos
- Al confirmar la importación, las órdenes aparecen en /history
- Si se marcó el checkbox de Journal, aparecen entradas en /journal
- Las estadísticas de JournalStats se actualizan con los datos importados
- Las operaciones importadas tienen badge "Importado" en el historial
- No se pueden importar el mismo archivo dos veces (validar por filename + fecha)
```
