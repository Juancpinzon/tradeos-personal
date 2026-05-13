# PROMPTS_POR_FASE.md — TradeOS Personal
## Prompts listos para Claude Code y Antigravity IDE

> Usa estos prompts al inicio de cada sesión de agente.
> Son compatibles con Claude Code (terminal) y Antigravity (Google IDE).
> Siempre empieza pegando el prompt completo de la fase actual.

---

## ─── FASE 2 — Trading Engine (Paper) ───────────────────────────────────────

```
CONTEXTO DEL PROYECTO
App: TradeOS Personal — plataforma de inversiones NYSE + Cripto (uso personal)
Repo: https://github.com/Juancpinzon/tradeos-personal (branch: master)
Supabase proyecto: pzuuovhhubdpbphfwcvw
Deploy: https://tradeos-personal.vercel.app
Stack: React/TypeScript/Vite/Tailwind/Supabase/Vercel

LEE ANTES DE TOCAR CÓDIGO
1. CLAUDE.md completo (raíz del repo)
2. supabase/functions/alpaca-proxy/index.ts (versión actual)
3. src/components/trading/ConfirmOrderModal.tsx (556 líneas — NO reemplazar)
4. src/components/trading/OrderForm.tsx (versión actual)
5. src/hooks/usePortfolio.ts (para seguir el mismo patrón)
6. src/types/index.ts (para no duplicar tipos)

NOTA TÉCNICA DE AUTH
El gateway de Supabase requiere:
- Header Authorization: Bearer <VITE_SUPABASE_ANON_KEY>
- Header x-user-token: <JWT del usuario obtenido de supabase.auth.getSession()>
Las Edge Functions tienen "Verify JWT with legacy secret" en OFF.
Sigue exactamente este patrón — está probado en producción.

TAREA — Fase 2: Trading Engine con órdenes reales de Alpaca paper

Paso 1 — Extender alpaca-proxy
- Agregar endpoint POST /orders → llama a Alpaca POST /v2/orders
- Agregar endpoint GET /orders → llama a Alpaca GET /v2/orders (params: status, limit, direction)
- Agregar endpoint GET /orders/:id → para polling de estado
- Agregar endpoint DELETE /orders/:id → cancelar orden
- Validar campos requeridos: symbol, qty, side, type, time_in_force
- Guardar la guarda del modo live: si ALPACA_BASE_URL contiene "live" y LIVE_TRADING_ENABLED !== "true", retornar 403

Paso 2 — Crear src/hooks/useOrders.ts
- Sigue el patrón exacto de usePortfolio.ts
- useQuery para GET /orders con staleTime: 15000
- refetchInterval: 5000 si status === "open", false si no
- useMutation para POST /orders (submitOrder) y DELETE (cancelOrder)
- onSuccess de submitOrder: invalidar queries ["orders"] y ["portfolio"]

Paso 3 — Tipos
- Añadir OrderPayload y AlpacaOrder a src/types/index.ts
- Añadir función helper simplifyOrderStatus() en el mismo archivo

Paso 4 — Integrar useOrders en ConfirmOrderModal y OrderForm
- Leer los archivos existentes completos antes de modificar
- ConfirmOrderModal debe recibir onConfirm como async que llama submitOrder
- OrderForm: el botón "Revisar" abre el modal; el modal ejecuta la orden
- NUNCA ejecutar una orden sin pasar por ConfirmOrderModal

Paso 5 — History.tsx
- Leer el archivo existente antes de modificar
- Mostrar órdenes desde GET /orders con filtros: todas / abiertas / cerradas
- Columnas: símbolo, side (COMPRA/VENTA), tipo, cantidad, precio límite, precio ejecución, estado, fecha
- Botón cancelar para órdenes abiertas (llama DELETE /orders/:id)
- Estados con Badge color-coded: open=azul, filled=verde, cancelled=gris, rejected=rojo

REGLAS IRROMPIBLES
- API keys nunca en el frontend
- ConfirmOrderModal obligatorio antes de cualquier orden
- TypeScript strict — sin any
- Precios y cantidades siempre en font-mono
- Positivo = text-emerald-400, negativo = text-red-400
- Try/catch + toast en toda llamada a Edge Function

CRITERIO DE ÉXITO FASE 2
✓ Se puede enviar una orden paper de AAPL desde OrderForm
✓ ConfirmOrderModal muestra resumen completo antes de ejecutar
✓ La orden aparece en History.tsx con estado real de Alpaca
✓ Se puede cancelar una orden abierta desde History.tsx
```

---

## ─── FASE 3 — Research Agent ────────────────────────────────────────────────

```
CONTEXTO DEL PROYECTO
App: TradeOS Personal — plataforma de inversiones NYSE + Cripto (uso personal)
Repo: https://github.com/Juancpinzon/tradeos-personal (branch: master)
Supabase proyecto: pzuuovhhubdpbphfwcvw
Deploy: https://tradeos-personal.vercel.app
Stack: React/TypeScript/Vite/Tailwind/Supabase/Vercel

Fase 1 ✅ completa — Fase 2 ✅ completa

LEE ANTES DE TOCAR CÓDIGO
1. CLAUDE.md completo (raíz del repo)
2. supabase/functions/alpaca-proxy/index.ts (para reusar el patrón de auth)
3. supabase/functions/claude-research/index.ts (si ya existe, ver estado actual)
4. src/pages/Research.tsx (ver estado actual)
5. src/hooks/useOrders.ts (para seguir el mismo patrón de hooks)
6. src/types/index.ts

SECRETS DISPONIBLES EN SUPABASE
- ANTHROPIC_API_KEY ✓
- ALPACA_API_KEY ✓
- ALPACA_SECRET_KEY ✓
- FMP_API_KEY ✓ (Financial Modeling Prep — datos de mercado adicionales)

NOTA TÉCNICA DE AUTH (igual que fases anteriores)
- Header Authorization: Bearer <VITE_SUPABASE_ANON_KEY>
- Header x-user-token: <JWT del usuario>

TAREA — Fase 3: Research Agent con Claude API streaming

Paso 1 — Edge Function claude-research
Flujo interno:
  a) Validar JWT del usuario (patrón de alpaca-proxy)
  b) Recibir { symbol: string, query: string } del body
  c) Fetch de datos actuales del símbolo desde alpaca-proxy o FMP:
     - precio actual, cambio % del día, volumen, high/low del día
  d) Construir prompt con esos datos como contexto explícito
  e) Llamar Claude API (claude-sonnet-4-20250514) con streaming
  f) Retornar streaming response al cliente
  g) Guardar el análisis en tabla research_entries (symbol, query, analysis, data_used, model)

Prompt base para Claude API (adaptar en la Edge Function):
  "Eres un asistente de análisis financiero. Analiza ${symbol} basándote
   exclusivamente en los siguientes datos de mercado verificados:
   Precio: $${price} | Cambio hoy: ${change}% | Volumen: ${volume}
   High: $${high} | Low: $${low}
   Pregunta del usuario: ${query}
   Responde en español. Sé conciso y basado en datos. No hagas predicciones
   sin fundamento. Indica claramente qué datos estás usando."

Paso 2 — Migration 004: tabla research_entries
  CREATE TABLE research_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    symbol text NOT NULL,
    query text NOT NULL,
    analysis text NOT NULL,
    data_used jsonb NOT NULL,
    model text NOT NULL,
    created_at timestamptz DEFAULT now()
  );
  ALTER TABLE research_entries ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users see own research"
    ON research_entries FOR ALL USING (auth.uid() = user_id);

Paso 3 — src/hooks/useResearch.ts
- useMutation para POST a claude-research (devuelve streaming)
- useQuery para GET historial de research_entries desde Supabase directamente
- Manejar el stream: leer chunks y acumular en estado local para mostrar progreso
- staleTime: 60000 para el historial

Paso 4 — ResearchPanel.tsx y Research.tsx
- Input para símbolo + textarea para pregunta libre
- Botón "Analizar" → dispara la mutación
- Mostrar datos fuente usados SIEMPRE antes del análisis (precio, volumen, etc.)
  Ejemplo: "Datos al [timestamp]: AAPL $175.20 | +1.3% | Vol: 45.2M"
- Respuesta en streaming: mostrar texto a medida que llega (efecto typewriter)
- Historial de análisis anteriores abajo, colapsable por símbolo
- Loading state: skeleton mientras carga, spinner mientras genera

REGLAS IRROMPIBLES
- El Research Agent SIEMPRE muestra los datos exactos que usó (precio, volumen, fecha)
- Sin datos fuente visibles = no mostrar el análisis
- Streaming obligatorio — no esperar a que termine para mostrar
- Guardar cada análisis en research_entries
- TypeScript strict — sin any

CRITERIO DE ÉXITO FASE 3
✓ Análisis de AAPL muestra datos reales (precio actual, volumen) antes de la respuesta
✓ La respuesta de Claude aparece en streaming (letra a letra o por chunks)
✓ El análisis queda guardado en Supabase y aparece en el historial
✓ El Research Agent funciona desde /research
```

---

## ─── FASE 4 — Binance + Cripto ──────────────────────────────────────────────

```
CONTEXTO DEL PROYECTO
App: TradeOS Personal — plataforma de inversiones NYSE + Cripto (uso personal)
Repo: https://github.com/Juancpinzon/tradeos-personal (branch: master)
Supabase proyecto: pzuuovhhubdpbphfwcvw
Deploy: https://tradeos-personal.vercel.app
Stack: React/TypeScript/Vite/Tailwind/Supabase/Vercel

Fase 1 ✅ — Fase 2 ✅ — Fase 3 ✅

LEE ANTES DE TOCAR CÓDIGO
1. CLAUDE.md completo
2. supabase/functions/alpaca-proxy/index.ts (para replicar el patrón exacto)
3. src/hooks/usePortfolio.ts (para extenderlo con datos de Binance)
4. src/components/portfolio/PortfolioSummary.tsx (para agregar sección cripto)
5. src/types/index.ts (Position, EquitySnapshot)

SECRETS A AGREGAR EN SUPABASE (el usuario los proveerá)
- BINANCE_API_KEY
- BINANCE_SECRET_KEY
Supabase dashboard → Settings → Edge Functions → Secrets

TAREA — Fase 4: Integración Binance + Dashboard unificado

Paso 1 — Edge Function binance-proxy
Endpoints a implementar:
  GET /account    → GET https://api.binance.com/api/v3/account (signed)
  GET /balances   → filtrar balances con free > 0 del response de /account
  GET /price/:symbol → GET https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT

Firma de requests a Binance (HMAC SHA-256):
  - Añadir timestamp al query string
  - Firmar con BINANCE_SECRET_KEY usando HMAC-SHA256
  - Header: X-MBX-APIKEY: <BINANCE_API_KEY>
  - Usar la Web Crypto API de Deno para firmar (no dependencias externas)

Ejemplo de firma:
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const key = await crypto.subtle.importKey("raw",
    new TextEncoder().encode(BINANCE_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key,
    new TextEncoder().encode(queryString));
  const signature = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0")).join("");

Paso 2 — Normalizar posiciones cripto
Función normalizeBinanceBalance() que convierte balance de Binance
al mismo formato que Position de Alpaca:
  { symbol: "BTC/USDT", qty, current_price, market_value,
    unrealized_pnl: 0, // Binance spot no tiene PnL automático
    side: "long", asset_class: "crypto", broker: "binance" }

Paso 3 — Extender usePortfolio.ts
- Agregar query paralela a binance-proxy GET /balances
- Combinar posiciones de Alpaca + Binance en un solo array positions[]
- Calcular equity total = alpaca_equity + binance_equity_usd
- Mantener breakdown por broker para el widget del dashboard

Paso 4 — Actualizar Dashboard
- PortfolioSummary: mostrar equity total unificado + breakdown Alpaca/Binance
- PositionCard: badge broker (NYSE / CRYPTO) con color diferente
- EquityChart: si solo hay datos de Alpaca, mostrar solo esos (no romper si Binance no está configurado)
- Manejar el caso donde Binance no está configurado (keys no seteadas): mostrar sección deshabilitada con CTA a Settings

REGLAS IRROMPIBLES
- La integración Binance es OPCIONAL — si no hay keys, el dashboard funciona igual con solo Alpaca
- Nunca mezclar fondos reales con el cálculo de paper trading
- Firma HMAC de Binance siempre del lado del servidor (Edge Function), nunca en el cliente
- TypeScript strict — sin any

CRITERIO DE ÉXITO FASE 4
✓ Dashboard muestra posiciones de Alpaca + Binance en la misma lista
✓ Equity total = suma de ambos brokers
✓ Si Binance no está configurado, el dashboard sigue funcionando sin errores
✓ Badge diferencia NYSE de CRYPTO en cada posición
```

---

## ─── FASE 5 — Alertas + Settings + Deploy Final ─────────────────────────────

```
CONTEXTO DEL PROYECTO
App: TradeOS Personal — plataforma de inversiones NYSE + Cripto (uso personal)
Repo: https://github.com/Juancpinzon/tradeos-personal (branch: master)
Supabase proyecto: pzuuovhhubdpbphfwcvw
Deploy: https://tradeos-personal.vercel.app
Stack: React/TypeScript/Vite/Tailwind/Supabase/Vercel

Fase 1 ✅ — Fase 2 ✅ — Fase 3 ✅ — Fase 4 ✅

LEE ANTES DE TOCAR CÓDIGO
1. CLAUDE.md completo
2. src/pages/Settings.tsx (estado actual)
3. src/types/index.ts
4. Todas las Edge Functions existentes (para no romper nada en el refactor)

TAREA — Fase 5: Alertas + Settings completo + Deploy limpio

Paso 1 — Migration 005: tabla watchlist
  CREATE TABLE watchlist (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    symbol text NOT NULL,
    broker text CHECK (broker IN ('alpaca','binance')) NOT NULL,
    asset_class text CHECK (asset_class IN ('equity','crypto')) NOT NULL,
    alert_price_above numeric,
    alert_price_below numeric,
    notes text,
    added_at timestamptz DEFAULT now()
  );
  ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users manage own watchlist"
    ON watchlist FOR ALL USING (auth.uid() = user_id);

Paso 2 — Settings.tsx completo
Secciones:
  a) Cuenta: email del usuario, botón cerrar sesión
  b) Alpaca: mostrar si está configurado (✓/✗), botón "Reconectar"
     - Input para keys → llama Edge Function save-api-keys → test de conexión
     - Mostrar modo activo: PAPER / LIVE con badge
  c) Binance: misma UI que Alpaca
  d) Preferencias:
     - risk_per_trade_pct: input numérico (default 2%)
     - default_broker: select Alpaca / Binance
  e) Zona de peligro: "Borrar todos mis datos" con confirmación doble

Paso 3 — Edge Function save-api-keys
  - Recibe { broker: 'alpaca'|'binance', api_key: string, secret_key: string }
  - Guarda en Supabase Vault (supabase.vault.createSecret o update)
  - Hace test de conexión: GET /account al broker correspondiente
  - Retorna { valid: boolean, account_id?: string, error?: string }
  - NUNCA retorna las keys al cliente

Paso 4 — Sistema de alertas (básico)
  - WatchlistItem.tsx: muestra precio actual + alertas configuradas
  - Si precio cruza alert_price_above o alert_price_below → toast de alerta
  - La verificación de alertas se hace en useMarketData.ts al refrescar precios
  - NO push notifications en esta fase — solo toasts en UI (roadmap futuro)

Paso 5 — Watchlist en Trading.tsx
  - Panel derecho de /trading: lista de watchlist con precios en tiempo real
  - Click en símbolo → auto-fill del OrderForm con ese símbolo
  - Botón añadir símbolo a watchlist desde la búsqueda

Paso 6 — Deploy final limpio
  - Verificar todas las variables de entorno en Vercel:
    VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
  - Confirmar que todas las Edge Functions están deployadas:
    alpaca-proxy, binance-proxy, claude-research, save-api-keys
  - Verificar que los Secrets de Supabase están seteados
  - Correr build local (npm run build) sin errores TypeScript
  - Verificar que el dashboard carga en < 2s en producción

REGLAS IRROMPIBLES
- save-api-keys NUNCA devuelve las keys en la respuesta
- Las alertas no bloquean el flujo principal — son opcionales y silenciosas si fallan
- Settings no tiene acceso directo a Supabase Vault — todo via Edge Function
- El deploy no avanza si hay errores de TypeScript

CRITERIO DE ÉXITO FASE 5
✓ Settings permite configurar/reconfigurar keys de Alpaca y Binance
✓ Watchlist en /trading muestra precios en tiempo real
✓ Las alertas de precio disparan toast cuando se cruza el nivel
✓ npm run build sin errores
✓ App funcionando en producción sin errores de consola
✓ Dashboard carga en < 2s medido en producción
```

---

## Notas de compatibilidad IDE

### Claude Code (terminal)
- Pega el prompt directamente en la sesión
- Claude Code puede leer el repo completo — los "LEE ANTES" son instrucciones reales
- Usa `supabase functions deploy <nombre>` para deployar Edge Functions
- Usa `supabase db push` para correr migrations

### Antigravity (Google IDE)
- Pega el prompt completo al inicio de la conversación
- Proporciona los archivos clave manualmente si el IDE no tiene acceso al repo
  (alpaca-proxy/index.ts, usePortfolio.ts, types/index.ts)
- Los snippets de código generados: pégalos directamente en el editor
- Para migrations: copia el SQL y ejecútalo en Supabase SQL Editor
- Para Edge Functions: copia el .ts y usa `supabase functions deploy` desde terminal

---

*Última actualización: Fase 1 completada. Fases 2-5 pendientes.*
