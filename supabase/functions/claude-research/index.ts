// ─────────────────────────────────────────────────────────────────────────────
// supabase/functions/claude-research/index.ts
// Research Agent: datos en paralelo → prompt estructurado → Claude streaming
// Siempre incluye ResearchDataSnapshot + PortfolioContext antes del análisis
// ─────────────────────────────────────────────────────────────────────────────

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Anthropic from "npm:@anthropic-ai/sdk"

const ALPACA_BASE  = "https://data.alpaca.markets"
const ALPACA_TRADE = "https://paper-api.alpaca.markets"

function errJson(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    })
  }

  // ── JWT validation ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return errJson("Missing Authorization header", 401)

  const supabaseUrl  = Deno.env.get("SUPABASE_URL")!
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!
  const supabaseSvc  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
  const alpacaKey    = Deno.env.get("ALPACA_API_KEY")
  const alpacaSecret = Deno.env.get("ALPACA_SECRET_KEY")
  const avKey        = Deno.env.get("ALPHA_VANTAGE_KEY")  // fallback técnico

  if (!anthropicKey) return errJson("ANTHROPIC_API_KEY not configured", 500)

  // Auth client — ANON_KEY + global.headers (ES256-compatible)
  const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) return errJson("Unauthorized", 401)

  // DB client — SERVICE_ROLE_KEY for all database operations (bypass RLS)
  const supabase = createClient(supabaseUrl, supabaseSvc)

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: { symbol?: string; query?: string }
  try {
    body = await req.json()
  } catch {
    return errJson("Invalid JSON body")
  }

  const { symbol, query } = body
  if (!symbol || !query) return errJson("symbol and query are required")

  const sym = symbol.toUpperCase()

  // ── Fetch en paralelo ───────────────────────────────────────────────────────
  const alpacaHeaders: Record<string, string> = alpacaKey && alpacaSecret
    ? { "APCA-API-KEY-ID": alpacaKey, "APCA-API-SECRET-KEY": alpacaSecret }
    : {}
  const now    = new Date()
  const from   = new Date(now); from.setMonth(from.getMonth() - 14)
  const fromStr = from.toISOString().split("T")[0]
  const toStr   = now.toISOString().split("T")[0]

  const [barsResult, fmpResult, positionResult, portfolioResult, accountResult, quoteResult, avWeeklyResult, finvizResult] = await Promise.allSettled([
    // Técnicos (Alpaca) — si no responde, usamos AV como fallback
    fetch(`${supabaseUrl}/functions/v1/alpaca-proxy/bars/${sym}?timeframe=1Week&limit=60`, {
      headers: { Authorization: authHeader },
    }).then(r => r.json()),

    // Fundamentales (FMP Proxy → AV fallback interno)
    fetch(`${supabaseUrl}/functions/v1/fmp-proxy/fundamentals/${sym}`, {
      headers: { Authorization: authHeader },
    }).then(r => r.json()).catch(() => null),

    // Posición del usuario
    supabase.from("positions").select("*").eq("user_id", user.id).eq("symbol", sym).maybeSingle(),

    // Datos portafolio (cache DB)
    supabase.from("portfolios").select("total_equity").eq("user_id", user.id).maybeSingle(),

    // Fresh equity (Alpaca)
    fetch(`${supabaseUrl}/functions/v1/alpaca-proxy/account`, {
      headers: { Authorization: authHeader },
    }).then(r => r.json()).catch(() => null),

    // Fresh quote (Alpaca fallback)
    fetch(`${supabaseUrl}/functions/v1/alpaca-proxy/quote/${sym}`, {
      headers: { Authorization: authHeader },
    }).then(r => r.json()).catch(() => null),

    // Alpha Vantage weekly series — fallback técnico si Alpaca no tiene barras
    avKey
      ? fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol=${sym}&apikey=${avKey}`)
          .then(r => r.json()).catch(() => null)
      : Promise.resolve(null),

    // Yahoo Finance — fuente de P/E, EPS, Sales Q/Q, Earnings Date (vía fmp-proxy)
    fetch(`${supabaseUrl}/functions/v1/fmp-proxy/finviz/${sym}`, {
      headers: { Authorization: authHeader },
    }).then(r => r.json()).catch(() => null),
  ])

  const barsResultData = barsResult.status === "fulfilled" ? barsResult.value : null
  let bars: Bar[] = barsResultData?.bars || []

  // ── Fallback técnico con Alpha Vantage cuando Alpaca no tiene barras suficientes ────────────
  const avWeeklyRaw = avWeeklyResult.status === "fulfilled" ? avWeeklyResult.value : null
  if (bars.length < 15 && avWeeklyRaw && avWeeklyRaw["Weekly Adjusted Time Series"]) {
    const weeklyTs = avWeeklyRaw["Weekly Adjusted Time Series"] as Record<string, Record<string, string>>
    const avBars: Bar[] = Object.entries(weeklyTs)
      .sort(([a], [b]) => a.localeCompare(b))  // cronológico asc
      .slice(-60)
      .map(([date, v]) => ({
        t: date,
        o: parseFloat(v["1. open"] ?? "0"),
        h: parseFloat(v["2. high"] ?? "0"),
        l: parseFloat(v["3. low"]  ?? "0"),
        c: parseFloat(v["5. adjusted close"] ?? v["4. close"] ?? "0"),
        v: parseFloat(v["6. volume"] ?? "0"),
      }))
    if (avBars.length >= 15) {
      console.log(`[AV BARS] Using ${avBars.length} weekly bars from Alpha Vantage for ${sym}`)
      bars = avBars
    }
  }

  const fmpData   = fmpResult.status   === "fulfilled" ? fmpResult.value?.data   : null
  const yahooData = finvizResult.status === "fulfilled" ? finvizResult.value?.data : null

  const position = positionResult.status === "fulfilled"
    ? positionResult.value.data
    : null

  const portfolioData = portfolioResult.status === "fulfilled"
    ? portfolioResult.value.data
    : null

  const accountData = accountResult.status === "fulfilled" ? accountResult.value : null
  const quoteData   = quoteResult.status   === "fulfilled" ? quoteResult.value   : null

  // Usar equity fresco si está disponible
  const totalEquity = accountData?.equity ?? portfolioData?.total_equity ?? 0

  // Precio fresco de Alpaca si FMP falla
  const alpacaPrice = quoteData?.price ?? (bars.length ? bars[bars.length - 1]?.c : null)

  // RSI: Yahoo no da RSI directamente, así que usamos el calculado desde las barras (Alpaca/AV)
  const rsiFromBars = bars.length >= 15 ? calculateRSI(bars.map((b: Bar) => b.c), 14) : null
  const rsiWeekly   = yahooData?.rsi_14 ?? rsiFromBars
  const rsiSource   = yahooData?.rsi_14 != null ? "yahoo" : (rsiFromBars != null ? "bars" : null)

  // Precio y ATH — prioridad: FMP > Yahoo > Alpaca > barras
  const price      = fmpData?.price       ?? yahooData?.price
                     ?? alpacaPrice
  const week52High = fmpData?.week_52_high ?? yahooData?.week_52_high
                     ?? (bars.length ? Math.max(...bars.map((b: Bar) => b.h)) : 0)
  const week52Low  = fmpData?.week_52_low  ?? yahooData?.week_52_low
                     ?? (bars.length ? Math.min(...bars.map((b: Bar) => b.l)) : 0)
  const athDist    = week52High > 0 && price
    ? ((price - week52High) / week52High) * 100
    : null
  const volume     = fmpData?.volume ?? yahooData?.volume
                     ?? (bars.length ? bars[bars.length - 1]?.v : null)
  const volumeAvg30 = bars.length
    ? bars.slice(-30).reduce((s: number, b: Bar) => s + b.v, 0) / Math.min(bars.length, 30)
    : null

  // ── Construir snapshots ─────────────────────────────────────────────────────
  const dataSnapshot = {
    price,
    price_change_pct_1d:  fmpData?.price_change_pct_1d  ?? yahooData?.price_change_pct_1d ?? null,
    volume,
    volume_avg_30d:       volumeAvg30,
    market_cap:           fmpData?.market_cap            ?? yahooData?.market_cap ?? null,
    week_52_high:         week52High,
    week_52_low:          week52Low,
    ath_distance_pct:     athDist,
    rsi_weekly:           rsiWeekly,
    rsi_source:           rsiSource,
    eps_current:          fmpData?.eps_current      ?? yahooData?.eps_current      ?? null,
    eps_next_estimate:    fmpData?.eps_next_estimate ?? yahooData?.eps_next_estimate ?? null,
    eps_growth_next_pct:  fmpData?.eps_growth_next_pct ?? yahooData?.eps_growth_next_pct ?? null,
    revenue_growth_pct:   fmpData?.revenue_growth_pct   ?? yahooData?.revenue_growth_pct   ?? null,
    pe_ratio:             fmpData?.pe_ratio          ?? yahooData?.pe_ratio          ?? null,
    next_earnings_date:   fmpData?.next_earnings_date ?? yahooData?.next_earnings_date ?? null,
    fetched_at:           new Date().toISOString(),
  }


  const currentPrice = price ?? position?.current_price ?? 0
  const marketValue  = (position?.qty ?? 0) * currentPrice
  const weightPct    = totalEquity && totalEquity > 0 
    ? (marketValue / totalEquity) * 100 
    : (position?.portfolio_weight_pct ?? 0)

  const portfolioCtx = {
    has_position:         !!position,
    qty:                  position?.qty,
    avg_entry_price:      position?.avg_entry_price,
    current_price:        currentPrice,
    unrealized_pnl:       position?.unrealized_pnl,
    unrealized_pnl_pct:   position?.unrealized_pnl_pct,
    portfolio_weight_pct: weightPct,
    total_portfolio_equity: totalEquity,
  }

  // ── Construir prompt ────────────────────────────────────────────────────────
  const dataCtx = buildDataContext(sym, dataSnapshot, portfolioCtx, now)
  const systemPrompt = buildSystemPrompt()

  // ── Llamar Claude con streaming ─────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: anthropicKey })

  const stream = await anthropic.messages.stream({
    model:      "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system:     systemPrompt,
    messages:   [{ role: "user", content: `${dataCtx}\n\nPregunta: ${query}` }],
  })

  // ── Streaming response al cliente ───────────────────────────────────────────
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  let fullAnalysis = ""

  ;(async () => {
    try {
      // ── Enviar metadatos como primer chunk ──────────────────────────────────
      const metadataChunk = JSON.stringify({
        type: "metadata",
        dataSnapshot,
        portfolioCtx,
      })
      await writer.write(encoder.encode(metadataChunk + "--METADATA_END--"))

      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          const text = chunk.delta.text
          fullAnalysis += text
          await writer.write(encoder.encode(text))
        }
      }

      // Al completarse, guardar en research_entries
      await supabase.from("research_entries").insert({
        user_id:           user.id,
        symbol:            sym,
        query,
        analysis:          fullAnalysis,
        data_used:         dataSnapshot,
        portfolio_context: portfolioCtx,
        model:             "claude-sonnet-4-20250514",
      })
    } catch (e) {
      console.error("Streaming error:", e)
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      "Content-Type":              "text/plain; charset=utf-8",
      "Transfer-Encoding":         "chunked",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options":    "nosniff",
    },
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface Bar {
  t: string
  o: number
  h: number
  l: number
  c: number
  v: number
}

function calculateRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null

  let gains = 0
  let losses = 0

  for (let i = closes.length - period; i < closes.length; i++) {
    const prev = closes[i - 1]
    const curr = closes[i]
    if (prev === undefined || curr === undefined) continue
    const delta = curr - prev
    if (delta > 0) gains  += delta
    else           losses -= delta
  }

  const avgGain = gains  / period
  const avgLoss = losses / period

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return Math.round(100 - 100 / (1 + rs))
}

function fmt(n: number | null | undefined, decimals = 2, fallback = "N/D"): string {
  if (n === null || n === undefined) return fallback
  return n.toFixed(decimals)
}

function fmtSign(n: number | null | undefined, decimals = 2, fallback = "N/D"): string {
  if (n === null || n === undefined) return fallback
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(decimals)}`
}

function buildDataContext(
  symbol: string,
  snap: ReturnType<typeof Object.create>,
  ctx: ReturnType<typeof Object.create>,
  now: Date,
): string {
  const earningsLine = snap.next_earnings_date
    ? (() => {
        const diff = Math.ceil(
          (new Date(snap.next_earnings_date).getTime() - now.getTime()) / 86400000
        )
        return diff > 0 ? `${snap.next_earnings_date} (en ${diff} días)` : snap.next_earnings_date
      })()
    : "No disponible vía datos fundamentales"

  const posLine = ctx.has_position
    ? [
        `${fmt(ctx.qty)} acciones @ $${fmt(ctx.avg_entry_price)}`,
        `PnL: ${fmtSign(ctx.unrealized_pnl)} (${fmtSign(ctx.unrealized_pnl_pct)}%)`,
        `Weight: ${fmt(ctx.portfolio_weight_pct)}% del portafolio`,
        `Equity total: $${fmt(ctx.total_portfolio_equity, 0)}`,
      ].join(" | ")
    : "Sin posición"

  const fundUnavailable = "No disponible vía datos técnicos"

  return `Datos de ${symbol} al ${now.toLocaleDateString("es-CO")}:

Precio: $${fmt(snap.price)} | Cambio 1d: ${fmtSign(snap.price_change_pct_1d)}%
Dist. ATH (52w high): ${fmtSign(snap.ath_distance_pct)}%
RSI (14): ${snap.rsi_weekly != null ? `${snap.rsi_weekly}${snap.rsi_source === "yahoo" ? " [Yahoo]" : snap.rsi_source === "finviz" ? " [Finviz]" : ""}` : "No disponible"}
Volumen: ${snap.volume?.toLocaleString() ?? "N/D"} | Vol. prom. 30d: ${snap.volume_avg_30d?.toFixed(0) ?? "N/D"}
Market Cap: ${snap.market_cap ? "$" + (snap.market_cap / 1e9).toFixed(1) + "B" : fundUnavailable}

EPS actual: $${fmt(snap.eps_current, 2, fundUnavailable)} | EPS est. Q+1: $${fmt(snap.eps_next_estimate, 2, fundUnavailable)} (${fmtSign(snap.eps_growth_next_pct, 2, fundUnavailable)})
Revenue growth YoY: ${fmtSign(snap.revenue_growth_pct, 2, fundUnavailable)}%
P/E ratio: ${fmt(snap.pe_ratio, 1, fundUnavailable)}
52w High: $${fmt(snap.week_52_high)} | 52w Low: $${fmt(snap.week_52_low)}

Próximo earnings: ${earningsLine}

Posición del usuario: ${posLine}`
}

function buildSystemPrompt(): string {
  return `Eres un analista financiero senior especializado en mercados NYSE y cripto.
Responde SIEMPRE en español neutro (evita el voseo). Eres directo, concreto y usas los datos proporcionados.
No inventes datos que no estén en el contexto.

Estructura tu respuesta en EXACTAMENTE estas 7 secciones con sus headers exactos:

📊 CUADRO DE MANDO
📈 TESIS DE INVERSIÓN
📉 ANÁLISIS FUNDAMENTAL
💼 TU EXPOSICIÓN
⚠️ RIESGOS
📐 NIVELES TÉCNICOS
📅 PRÓXIMO CATALIZADOR

Reglas:
- Si el usuario no tiene posición, omite completamente la sección 💼 TU EXPOSICIÓN
- En ⚠️ RIESGOS enlista máximo 3 riesgos concretos y específicos (no genéricos)
- En 📊 CUADRO DE MANDO incluye una línea con precio, dist. ATH y RSI como tabla rápida
- En 📉 ANÁLISIS FUNDAMENTAL usa EPS vs guidance, revenue growth y P/E con datos exactos. Si los datos no están disponibles, indícalo explícitamente mencionando que el análisis se centra en lo técnico por falta de datos fundamentales.
- En 6. **📐 NIVELES TÉCNICOS**: Menciona niveles clave de soporte/resistencia. Analiza el **patrón de velas (candlesticks)** y la acción del precio reciente (ej: martillos, envolventes, consolidación).
- En 7. **📅 PRÓXIMO CATALIZADOR**: Earnings, eventos o noticias. Si hay earnings en < 30 días, marca con ⚠️
- Tono: analítico, sin jerga innecesaria, sin frases vacías como "es importante considerar" o "en mi opinión"`
}
