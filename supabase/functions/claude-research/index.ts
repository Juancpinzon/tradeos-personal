// ─────────────────────────────────────────────────────────────────────────────
// supabase/functions/claude-research/index.ts
// Research Agent: datos en paralelo → prompt estructurado → Claude streaming
// Siempre incluye ResearchDataSnapshot + PortfolioContext antes del análisis
// ─────────────────────────────────────────────────────────────────────────────

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
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
  const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
  const alpacaKey    = Deno.env.get("ALPACA_API_KEY")
  const alpacaSecret = Deno.env.get("ALPACA_SECRET_KEY")

  if (!anthropicKey) return errJson("ANTHROPIC_API_KEY not configured", 500)

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return errJson("Unauthorized", 401)

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

  const [barsResult, fmpResult, positionResult] = await Promise.allSettled([
    // Barras semanales últimos 14 meses para calcular RSI(14)
    alpacaKey
      ? fetch(
          `${ALPACA_BASE}/v2/stocks/${sym}/bars?timeframe=1Week&start=${fromStr}&end=${toStr}&limit=60`,
          { headers: alpacaHeaders }
        ).then(r => r.json())
      : Promise.resolve(null),

    // FMP fundamentals (usa cache interno del fmp-proxy si está disponible)
    fetch(`${supabaseUrl}/functions/v1/fmp-proxy/fundamentals/${sym}`, {
      headers: { Authorization: authHeader },
    }).then(r => r.json()).catch(() => null),

    // Posición actual del usuario en ese símbolo
    supabase
      .from("positions")
      .select("*")
      .eq("user_id", user.id)
      .eq("symbol", sym)
      .maybeSingle(),
  ])

  // ── Equity total ─────────────────────────────────────────────────────────────
  const { data: latestSnap } = await supabase
    .from("equity_snapshots")
    .select("equity")
    .eq("user_id", user.id)
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const totalEquity = latestSnap?.equity ?? null

  // ── Procesar datos ──────────────────────────────────────────────────────────
  const bars: Bar[] = barsResult.status === "fulfilled" && barsResult.value?.bars
    ? barsResult.value.bars
    : []

  const fmpData = fmpResult.status === "fulfilled" ? fmpResult.value?.data : null

  const position = positionResult.status === "fulfilled"
    ? positionResult.value.data
    : null

  // Calcular RSI semanal (14 períodos)
  const rsiWeekly = bars.length >= 15 ? calculateRSI(bars.map((b: Bar) => b.c), 14) : null

  // Precio y ATH desde FMP o barras
  const price       = fmpData?.price        ?? (bars.length ? bars[bars.length - 1]?.c : null)
  const week52High  = fmpData?.week_52_high ?? (bars.length ? Math.max(...bars.map((b: Bar) => b.h)) : 0)
  const week52Low   = fmpData?.week_52_low  ?? (bars.length ? Math.min(...bars.map((b: Bar) => b.l)) : 0)
  const athDist     = week52High > 0 && price
    ? ((price - week52High) / week52High) * 100
    : null
  const volume      = fmpData?.volume        ?? (bars.length ? bars[bars.length - 1]?.v : null)
  const volumeAvg30 = bars.length
    ? bars.slice(-30).reduce((s: number, b: Bar) => s + b.v, 0) / Math.min(bars.length, 30)
    : null

  // ── Construir snapshots ─────────────────────────────────────────────────────
  const dataSnapshot = {
    price,
    price_change_pct_1d:  fmpData?.price_change_pct_1d  ?? null,
    volume,
    volume_avg_30d:       volumeAvg30,
    market_cap:           fmpData?.market_cap            ?? null,
    week_52_high:         week52High,
    week_52_low:          week52Low,
    ath_distance_pct:     athDist,
    rsi_weekly:           rsiWeekly,
    eps_current:          fmpData?.eps_current           ?? null,
    eps_next_estimate:    fmpData?.eps_next_estimate     ?? null,
    eps_growth_next_pct:  fmpData?.eps_growth_next_pct   ?? null,
    revenue_growth_pct:   fmpData?.revenue_growth_pct    ?? null,
    pe_ratio:             fmpData?.pe_ratio              ?? null,
    next_earnings_date:   fmpData?.next_earnings_date    ?? null,
    fetched_at:           new Date().toISOString(),
  }

  const portfolioCtx = {
    has_position:         !!position,
    qty:                  position?.qty,
    avg_entry_price:      position?.avg_entry_price,
    current_price:        position?.current_price,
    unrealized_pnl:       position?.unrealized_pnl,
    unrealized_pnl_pct:   position?.unrealized_pnl_pct,
    portfolio_weight_pct: position?.portfolio_weight_pct,
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

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined) return "N/D"
  return n.toFixed(decimals)
}

function fmtSign(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined) return "N/D"
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
    : "No disponible"

  const posLine = ctx.has_position
    ? [
        `${fmt(ctx.qty)} acciones @ $${fmt(ctx.avg_entry_price)}`,
        `PnL: ${fmtSign(ctx.unrealized_pnl)} (${fmtSign(ctx.unrealized_pnl_pct)}%)`,
        `Weight: ${fmt(ctx.portfolio_weight_pct)}% del portafolio`,
        `Equity total: $${fmt(ctx.total_portfolio_equity, 0)}`,
      ].join(" | ")
    : "Sin posición"

  return `Datos de ${symbol} al ${now.toLocaleDateString("es-AR")}:

Precio: $${fmt(snap.price)} | Cambio 1d: ${fmtSign(snap.price_change_pct_1d)}%
Dist. ATH (52w high): ${fmtSign(snap.ath_distance_pct)}%
RSI semanal (14): ${snap.rsi_weekly ?? "N/D"}
Volumen: ${snap.volume?.toLocaleString() ?? "N/D"} | Vol. prom. 30d: ${snap.volume_avg_30d?.toFixed(0) ?? "N/D"}
Market Cap: ${snap.market_cap ? "$" + (snap.market_cap / 1e9).toFixed(1) + "B" : "N/D"}

EPS actual: $${fmt(snap.eps_current)} | EPS est. Q+1: $${fmt(snap.eps_next_estimate)} (${fmtSign(snap.eps_growth_next_pct)}%)
Revenue growth YoY: ${fmtSign(snap.revenue_growth_pct)}%
P/E ratio: ${fmt(snap.pe_ratio, 1)}
52w High: $${fmt(snap.week_52_high)} | 52w Low: $${fmt(snap.week_52_low)}

Próximo earnings: ${earningsLine}

Posición del usuario: ${posLine}`
}

function buildSystemPrompt(): string {
  return `Sos un analista financiero senior especializado en mercados NYSE y cripto.
Respondés SIEMPRE en español. Sos directo, concreto y usás los datos proporcionados.
No inventés datos que no están en el contexto.

Estructurás tu respuesta en EXACTAMENTE estas 7 secciones con sus headers exactos:

📊 CUADRO DE MANDO
📈 TESIS DE INVERSIÓN
📉 ANÁLISIS FUNDAMENTAL
💼 TU EXPOSICIÓN
⚠️ RIESGOS
📐 NIVELES TÉCNICOS
📅 PRÓXIMO CATALIZADOR

Reglas:
- Si el usuario no tiene posición, omitís completamente la sección 💼 TU EXPOSICIÓN
- En ⚠️ RIESGOS listás máximo 3 riesgos concretos y específicos (no genéricos)
- En 📊 CUADRO DE MANDO incluís una línea con precio, dist. ATH y RSI como tabla rápida
- En 📉 ANÁLISIS FUNDAMENTAL usás EPS vs guidance, revenue growth y P/E con datos exactos
- En 📐 NIVELES TÉCNICOS citás soporte/resistencia y RSI con interpretación concreta
- En 📅 PRÓXIMO CATALIZADOR si hay earnings en < 30 días, marcás con ⚠️
- Tono: analítico, sin jerga innecesaria, sin frases vacías como "es importante considerar"`
}
