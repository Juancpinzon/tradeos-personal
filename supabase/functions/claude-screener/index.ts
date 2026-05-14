// ─────────────────────────────────────────────────────────────────────────────
// supabase/functions/claude-screener/index.ts
// Screener: universo filtrado → Claude scoring
// ─────────────────────────────────────────────────────────────────────────────

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Anthropic from "npm:@anthropic-ai/sdk"

function errJson(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

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
  const fmpKey       = Deno.env.get("FMP_API_KEY")

  if (!anthropicKey) return errJson("ANTHROPIC_API_KEY not configured", 500)

  const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) return errJson("Unauthorized", 401)

  const supabase = createClient(supabaseUrl, supabaseSvc)

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: { criteria: any }
  try {
    body = await req.json()
  } catch {
    return errJson("Invalid JSON body")
  }

  const { criteria } = body
  if (!criteria) return errJson("criteria is required")

  // ── Step A: Query screener_universe ─────────────────────────────────────────
  let query = supabase.from("screener_universe").select("*")

  if (criteria.market_cap_min) {
    query = query.gte("market_cap", criteria.market_cap_min)
  }
  if (criteria.price_min) {
    query = query.gte("price", criteria.price_min)
  }
  if (criteria.volume_avg_min) {
    query = query.gte("volume_avg_30d", criteria.volume_avg_min)
  }
  if (criteria.asset_class && criteria.asset_class !== 'both') {
    query = query.eq("asset_class", criteria.asset_class)
  }

  const { data: universe, error: universeError } = await query.limit(200)
  if (universeError) return errJson(`Universe query error: ${universeError.message}`, 500)

  if (!universe || universe.length === 0) {
    return new Response(JSON.stringify({ 
      summary: "No se encontraron candidatos que cumplan los filtros técnicos iniciales.",
      items: [],
      total_candidates_evaluated: 0,
      total_passed_filters: 0
    }), { headers: { "Content-Type": "application/json" } })
  }

  const totalEvaluated = universe.length

  // ── Step B & C: Fundamental Enrichment & Filtering ─────────────────────────
  const symbols = universe.map(u => u.symbol)
  
  // 1. Get from cache first
  const { data: cachedFunds } = await supabase
    .from("fundamentals_cache")
    .select("*")
    .in("symbol", symbols)

  const cacheMap = new Map(cachedFunds?.map(f => [f.symbol, f]) || [])
  const now = new Date()
  const TTL = 24 * 60 * 60 * 1000

  // 2. Identify missing or stale
  const missingSymbols = symbols.filter(sym => {
    const cached = cacheMap.get(sym)
    if (!cached) return true
    const age = now.getTime() - new Date(cached.fetched_at).getTime()
    return age > TTL
  })

  // 3. Fetch missing from FMP (sequential or small batches to respect rate limits if needed)
  // For screener, we might want to skip if many are missing or do a limited set
  if (missingSymbols.length > 0 && fmpKey) {
    console.log(`Fetching ${missingSymbols.length} missing fundamentals...`)
    // We only fetch up to a reasonable limit to avoid hitting FMP limits too hard in one go
    const toFetch = missingSymbols.slice(0, 10) 
    await Promise.all(toFetch.map(async (sym) => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/fmp-proxy/fundamentals/${sym}`, {
          headers: { Authorization: authHeader }
        })
        if (res.ok) {
          const { data } = await res.json()
          if (data) cacheMap.set(sym, data)
        }
      } catch (e) {
        console.error(`Error fetching fundamentals for ${sym}:`, e)
      }
    }))
  }

  // 4. Final filter of candidates based on fundamental criteria
  const candidates = universe.filter(u => {
    const funds = cacheMap.get(u.symbol)
    if (!funds) return false // No fundamentals, no screen (optional choice)

    // Apply fundamental filters
    if (criteria.revenue_growth_min_pct != null) {
      if ((funds.revenue_growth_pct ?? -999) < criteria.revenue_growth_min_pct) return false
    }
    if (criteria.eps_next_positive) {
      if ((funds.eps_next_estimate ?? -1) <= 0) return false
    }
    if (criteria.ath_distance_max_pct != null) {
      // ath_distance_pct is negative (e.g., -10 means max 10% below ATH)
      // distance >= -10 means -5 is ok, -15 is not.
      const athDist = funds.ath_distance_pct ?? u.ath_distance_pct ?? -999
      if (athDist < criteria.ath_distance_max_pct) return false
    }
    // RSI filters (if available in funds or universe)
    if (criteria.rsi_weekly_min != null || criteria.rsi_weekly_max != null) {
      const rsi = funds.rsi_weekly ?? u.rsi_weekly
      if (rsi == null) return false
      if (criteria.rsi_weekly_min != null && rsi < criteria.rsi_weekly_min) return false
      if (criteria.rsi_weekly_max != null && rsi > criteria.rsi_weekly_max) return false
    }

    return true
  }).slice(0, 20) // Limit to top 20 for Claude to keep it concise

  if (candidates.length === 0) {
    return new Response(JSON.stringify({ 
      summary: "Ningún candidato superó los filtros fundamentales y técnicos detallados.",
      items: [],
      total_candidates_evaluated: totalEvaluated,
      total_passed_filters: 0
    }), { headers: { "Content-Type": "application/json" } })
  }

  // ── Step D: Current Portfolio ──────────────────────────────────────────────
  const { data: positions } = await supabase
    .from("positions")
    .select("symbol, portfolio_weight_pct")
    .eq("user_id", user.id)

  const portfolioInfo = positions?.map(p => ({
    symbol: p.symbol,
    portfolio_weight_pct: p.portfolio_weight_pct
  })) || []

  // ── Step E: Call Claude ────────────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: anthropicKey })
  
  const candidateData = candidates.map(c => {
    const f = cacheMap.get(c.symbol)
    return {
      symbol: c.symbol,
      name: c.name,
      price: f?.price ?? c.price,
      market_cap: f?.market_cap ?? c.market_cap,
      revenue_growth_pct: f?.revenue_growth_pct,
      ath_distance_pct: f?.ath_distance_pct,
      rsi_weekly: f?.rsi_weekly,
      eps_next_estimate: f?.eps_next_estimate,
      next_earnings_date: f?.next_earnings_date
    }
  })

  const prompt = `Tengo estos ${candidateData.length} candidatos que pasaron los filtros:
${JSON.stringify(candidateData, null, 2)}

Mi portafolio actual: ${JSON.stringify(portfolioInfo, null, 2)}

Para cada candidato: asignale un score de 0-100 y escribí una nota de máximo 2 líneas en español explicando por qué destaca o no.
Luego escribí un resumen ejecutivo de máximo 3 oraciones sobre los mejores resultados en el contexto de mi portafolio actual.

Respondé SOLO en JSON con este formato exacto:
{
  "summary": string,
  "items": [{"symbol": string, "score": number, "ai_note": string}]
}`

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: "Eres un analista de inversiones experto. Respondes solo en formato JSON.",
    messages: [{ role: "user", content: prompt }]
  })

  let aiResult: { summary: string; items: any[] }
  try {
    const content = response.content[0].text
    aiResult = JSON.parse(content)
  } catch (e) {
    console.error("Error parsing Claude response:", e)
    return errJson("Error procesando la respuesta de la IA", 500)
  }

  // ── Step F: Combine & Save ─────────────────────────────────────────────────
  const watchlistRes = await supabase
    .from("watchlist")
    .select("symbol")
    .eq("user_id", user.id)
  const watchlistSymbols = new Set(watchlistRes.data?.map(w => w.symbol) || [])
  const portfolioSymbols = new Set(positions?.map(p => p.symbol) || [])

  const finalItems = aiResult.items.map(item => {
    const candidate = candidateData.find(c => c.symbol === item.symbol)
    return {
      ...candidate,
      score: item.score,
      ai_note: item.ai_note,
      already_in_portfolio: portfolioSymbols.has(item.symbol),
      already_in_watchlist: watchlistSymbols.has(item.symbol)
    }
  })

  const screenerResult = {
    user_id: user.id,
    criteria,
    results: finalItems,
    total_candidates_evaluated: totalEvaluated,
    total_passed_filters: candidates.length,
    ai_summary: aiResult.summary,
    run_at: new Date().toISOString()
  }

  const { data: savedResult, error: saveError } = await supabase
    .from("screener_results")
    .insert(screenerResult)
    .select()
    .single()

  if (saveError) {
    console.error("Error saving screener results:", saveError)
  }

  return new Response(JSON.stringify({
    ...screenerResult,
    id: savedResult?.id
  }), { headers: { "Content-Type": "application/json" } })
})
