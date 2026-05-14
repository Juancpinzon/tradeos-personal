// ─────────────────────────────────────────────────────────────────────────────
// supabase/functions/fmp-proxy/index.ts
// Proxy a Financial Modeling Prep API con cache de 24h en fundamentals_cache.
// Respeta el límite de 250 req/día del free tier de FMP.
// ─────────────────────────────────────────────────────────────────────────────

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const FMP_BASE = "https://financialmodelingprep.com/api/v3"
const AV_BASE  = "https://www.alphavantage.co/query"
const CACHE_TTL_MS = 24 * 60 * 60 * 1000  // 24 horas

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function err(message: string, status = 400) {
  return json({ error: message }, status)
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    })
  }

  // ── JWT validation ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return err("Missing Authorization header", 401)

  const supabaseUrl  = Deno.env.get("SUPABASE_URL")!
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!
  const supabaseSvc  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const fmpKey  = Deno.env.get("FMP_API_KEY")
  const avKey   = Deno.env.get("ALPHA_VANTAGE_KEY")  // optional — 25 req/day free

  if (!fmpKey) return err("FMP_API_KEY not configured", 500)

  // Auth client — ANON_KEY + global.headers (ES256-compatible)
  const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) return err("Unauthorized", 401)

  // DB client — SERVICE_ROLE_KEY for cache reads/writes (bypass RLS)
  const supabase = createClient(supabaseUrl, supabaseSvc)

  // ── Routing ─────────────────────────────────────────────────────────────────
  const url      = new URL(req.url)
  const pathname = url.pathname.replace(/^\/functions\/v1\/fmp-proxy/, "")
  const endpoint = pathname.split("/").filter(Boolean)

  try {
    // GET /fundamentals/{symbol}
    // Devuelve quote + income statement + analyst estimates en un solo payload
    if (endpoint[0] === "fundamentals" && endpoint[1]) {
      const symbol = endpoint[1].toUpperCase()
      return await getFundamentals(symbol, supabase, fmpKey, avKey ?? null)
    }

    // GET /earnings-calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
    if (endpoint[0] === "earnings-calendar") {
      const from = url.searchParams.get("from") ?? new Date().toISOString().split("T")[0]
      const to   = url.searchParams.get("to") ?? addDays(new Date(), 30)
      return await getEarningsCalendar(from, to, fmpKey)
    }

    return err("Unknown endpoint", 404)
  } catch (e) {
    console.error("fmp-proxy error:", e)
    return err("Internal server error", 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// getFundamentals — con cache de 24h
// ─────────────────────────────────────────────────────────────────────────────

async function getFundamentals(
  symbol: string,
  supabase: ReturnType<typeof createClient>,
  fmpKey: string,
  avKey: string | null = null,
) {
  // 1. Revisar cache
  const { data: cached } = await supabase
    .from("fundamentals_cache")
    .select("*")
    .eq("symbol", symbol)
    .single()

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime()
    if (age < CACHE_TTL_MS) {
      return json({ source: "cache", data: cached })
    }
  }

  // 2. Llamar FMP en paralelo
  const quoteUrl = `${FMP_BASE}/quote/${symbol}?apikey=${fmpKey}`;
  const incomeUrl = `${FMP_BASE}/income-statement/${symbol}?limit=2&apikey=${fmpKey}`;
  const estimatesUrl = `${FMP_BASE}/analyst-estimates/${symbol}?limit=1&apikey=${fmpKey}`;

  console.log(`[FMP DIAGNOSTIC] Symbol: ${symbol}`);
  console.log(`[FMP DIAGNOSTIC] Quote URL: ${quoteUrl.replace(fmpKey, '***')}`);

  const [quoteRes, incomeRes, estimatesRes] = await Promise.all([
    fetch(quoteUrl),
    fetch(incomeUrl),
    fetch(estimatesUrl),
  ])

  console.log(`[FMP DIAGNOSTIC] HTTP Statuses: quote=${quoteRes.status}, income=${incomeRes.status}, estimates=${estimatesRes.status}`);

  const [quoteRaw, incomeRaw, estimatesRaw] = await Promise.all([
    quoteRes.text(),
    incomeRes.text(),
    estimatesRes.text(),
  ])

  console.log(`[FMP DIAGNOSTIC] Quote Body (500 chars): ${quoteRaw.substring(0, 500)}`);
  console.log(`[FMP DIAGNOSTIC] Income Body (500 chars): ${incomeRaw.substring(0, 500)}`);

  let quoteData, incomeData, estimatesData;
  try {
    quoteData = JSON.parse(quoteRaw);
    incomeData = JSON.parse(incomeRaw);
    estimatesData = JSON.parse(estimatesRaw);
  } catch (e) {
    console.error(`[FMP DIAGNOSTIC] JSON Parse Error:`, e);
    return err("FMP returned invalid JSON", 502);
  }

  console.log(`[FMP Response for ${symbol}]:`, { 
    hasQuote: Array.isArray(quoteData) && quoteData.length > 0,
    hasIncome: Array.isArray(incomeData) && incomeData.length > 0,
    hasEstimates: Array.isArray(estimatesData) && estimatesData.length > 0
  })

  const quote     = Array.isArray(quoteData) ? quoteData[0] : null
  const thisYear  = Array.isArray(incomeData) ? incomeData[0] : null
  const lastYear  = Array.isArray(incomeData) ? incomeData[1] : null
  const estimates = Array.isArray(estimatesData) ? estimatesData[0] : null

  if (!quote) {
    console.warn(`[FMP DIAGNOSTIC] No quote found for ${symbol}. Full Body:`, quoteRaw);

    // ── Alpha Vantage fallback ─────────────────────────────────────────────
    if (avKey) {
      console.log(`[AV FALLBACK] Trying Alpha Vantage for ${symbol}`);
      return await fetchAlphaVantage(symbol, supabase, avKey)
    }

    return json({ source: "fmp", data: null }, 404)
  }

  // Calcular revenue growth YoY
  const revenueGrowthPct = thisYear && lastYear && lastYear.revenue > 0
    ? ((thisYear.revenue - lastYear.revenue) / Math.abs(lastYear.revenue)) * 100
    : null

  // EPS actual y próxima estimación
  const epsNext = estimates?.estimatedEpsAvg ?? null
  const epsCurr = quote.eps ?? null
  const epsGrowthPct = epsNext && epsCurr && epsCurr !== 0
    ? ((epsNext - epsCurr) / Math.abs(epsCurr)) * 100
    : null

  const payload = {
    symbol,
    eps_current:                epsCurr,
    eps_next_estimate:          epsNext,
    eps_growth_next_pct:        epsGrowthPct,
    revenue_growth_pct:         revenueGrowthPct,
    pe_ratio:                   quote.pe ?? null,
    next_earnings_date:         quote.earningsAnnouncement
                                  ? quote.earningsAnnouncement.split("T")[0]
                                  : null,
    next_earnings_estimate_eps: epsNext,
    // Extras que el cliente usa directamente
    price:                      quote.price,
    market_cap:                 quote.marketCap,
    week_52_high:               quote.yearHigh,
    week_52_low:                quote.yearLow,
    price_change_pct_1d:        quote.changesPercentage,
    volume:                     quote.volume,
    name:                       quote.name,
    fetched_at:                 new Date().toISOString(),
  }

  // 3. Guardar en cache (upsert)
  await supabase.from("fundamentals_cache").upsert({
    symbol,
    eps_current:                payload.eps_current,
    eps_next_estimate:          payload.eps_next_estimate,
    eps_growth_next_pct:        payload.eps_growth_next_pct,
    revenue_growth_pct:         payload.revenue_growth_pct,
    pe_ratio:                   payload.pe_ratio,
    next_earnings_date:         payload.next_earnings_date,
    next_earnings_estimate_eps: payload.next_earnings_estimate_eps,
    // Nuevos campos para cache completo
    price:                      payload.price,
    market_cap:                 payload.market_cap,
    week_52_high:               payload.week_52_high,
    week_52_low:                payload.week_52_low,
    price_change_pct_1d:        payload.price_change_pct_1d,
    volume:                     payload.volume,
    name:                       payload.name,
    fetched_at:                 new Date().toISOString(),
  })

  return json({ source: "fmp", data: payload })
}

// ─────────────────────────────────────────────────────────────────────────────
// getEarningsCalendar — sin cache (datos pequeños y cambian frecuentemente)
// ─────────────────────────────────────────────────────────────────────────────

async function getEarningsCalendar(from: string, to: string, fmpKey: string) {
  const res = await fetch(
    `${FMP_BASE}/earning_calendar?from=${from}&to=${to}&apikey=${fmpKey}`
  )
  const data = await res.json()
  return json({ source: "fmp", data })
}

// ─────────────────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchAlphaVantage — fallback cuando FMP no devuelve datos
// Campos: EPS, PERatio, ForwardPE, RevenueTTM, 52WeekHigh, 52WeekLow
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAlphaVantage(
  symbol: string,
  supabase: ReturnType<typeof createClient>,
  avKey: string,
) {
  const url = `${AV_BASE}?function=OVERVIEW&symbol=${symbol}&apikey=${avKey}`
  console.log(`[AV] Fetching OVERVIEW for ${symbol}`)

  const res  = await fetch(url)
  const body = await res.text()

  let av: Record<string, string>
  try {
    av = JSON.parse(body)
  } catch {
    console.error("[AV] JSON parse error:", body.slice(0, 200))
    return json({ source: "alpha_vantage", data: null }, 502)
  }

  // Alpha Vantage returns {"Note": "..."} or {"Information": "..."} on rate-limit
  if (!av.Symbol || av.Note || av.Information) {
    console.warn("[AV] Rate-limited or empty response:", body.slice(0, 200))
    return json({ source: "alpha_vantage", data: null }, 429)
  }

  const n = (key: string) => {
    const v = parseFloat(av[key] ?? "")
    return isNaN(v) ? null : v
  }

  const payload = {
    symbol,
    eps_current:                n("EPS"),
    eps_next_estimate:          n("ForwardEPS"),
    eps_growth_next_pct:        null,               // not available in OVERVIEW
    revenue_growth_pct:         null,               // not available in OVERVIEW
    pe_ratio:                   n("PERatio"),
    next_earnings_date:         av.NextEarningsDate ?? null,
    next_earnings_estimate_eps: n("ForwardEPS"),
    price:                      n("AnalystTargetPrice"),  // best available; real price from Alpaca
    market_cap:                 n("MarketCapitalization"),
    week_52_high:               n("52WeekHigh"),
    week_52_low:                n("52WeekLow"),
    price_change_pct_1d:        null,
    volume:                     null,
    name:                       av.Name ?? symbol,
    fetched_at:                 new Date().toISOString(),
  }

  // Upsert to cache (same schema as FMP path)
  await supabase.from("fundamentals_cache").upsert({
    symbol,
    eps_current:                payload.eps_current,
    eps_next_estimate:          payload.eps_next_estimate,
    eps_growth_next_pct:        payload.eps_growth_next_pct,
    revenue_growth_pct:         payload.revenue_growth_pct,
    pe_ratio:                   payload.pe_ratio,
    next_earnings_date:         payload.next_earnings_date,
    next_earnings_estimate_eps: payload.next_earnings_estimate_eps,
    price:                      payload.price,
    market_cap:                 payload.market_cap,
    week_52_high:               payload.week_52_high,
    week_52_low:                payload.week_52_low,
    price_change_pct_1d:        payload.price_change_pct_1d,
    volume:                     payload.volume,
    name:                       payload.name,
    fetched_at:                 new Date().toISOString(),
  })

  return json({ source: "alpha_vantage", data: payload })
}
