import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALPACA_TRADE = "https://paper-api.alpaca.markets"
const YAHOO_BASE = "https://query1.finance.yahoo.com/v10/finance/quoteSummary"
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseSvc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const alpacaKey = Deno.env.get("ALPACA_API_KEY")
  const alpacaSecret = Deno.env.get("ALPACA_SECRET_KEY")
  const fmpKey = Deno.env.get("FMP_API_KEY")
  const fmpBase = "https://financialmodelingprep.com/api/v3"

  if (!alpacaKey || !alpacaSecret) {
    return new Response(
      JSON.stringify({ error: "Alpaca keys not configured" }),
      { status: 500 },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseSvc)

  try {
    // ── Step 1: Fetch assets from Alpaca ──────────────────────────────────────
    console.log("[Sync] Step 1: Fetching assets from Alpaca...")
    const response = await fetch(
      `${ALPACA_TRADE}/v2/assets?status=active&asset_class=us_equity`,
      {
        headers: {
          "APCA-API-KEY-ID": alpacaKey,
          "APCA-API-SECRET-KEY": alpacaSecret,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.statusText}`)
    }

    const assets = await response.json()
    console.log(`[Sync] Received ${assets.length} assets from Alpaca`)

    // Filtros: NYSE/NASDAQ y que sean tradeables
    const filteredAssets = assets.filter(
      (a: any) =>
        (a.exchange === "NYSE" || a.exchange === "NASDAQ") &&
        a.tradable === true &&
        a.shortable === true,
    )

    console.log(`[Sync] Filtered to ${filteredAssets.length} assets (NYSE/NASDAQ)`)

    // Upsert en batches de 500 para evitar límites de Postgres
    const batchSize = 500
    for (let i = 0; i < filteredAssets.length; i += batchSize) {
      const batch = filteredAssets.slice(i, i + batchSize).map((a: any) => ({
        symbol: a.symbol,
        name: a.name,
        exchange: a.exchange,
        asset_class: "equity",
        synced_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from("screener_universe")
        .upsert(batch, { onConflict: "symbol" })

      if (error) {
        console.error(`[Sync] Error upserting batch ${i / batchSize}:`, error)
      }
    }

    const universalSymbols: string[] = filteredAssets.map((a: any) => a.symbol)
    console.log(`[Sync] Step 1 complete: ${universalSymbols.length} symbols upserted`)

    // ── Step 2: Find symbols needing fundamentals refresh ─────────────────────
    console.log("[Sync] Step 2: Querying fundamentals_cache for stale/missing symbols...")

    const { data: allUniverseSymbols, error: symError } = await supabase
      .from("screener_universe")
      .select("symbol, market_cap")
      .order("market_cap", { ascending: false, nullsLast: true })
      .limit(500)

    if (symError) {
      console.error("[Sync] Error querying screener_universe:", symError)
      throw symError
    }

    const { data: existingCache } = await supabase
      .from("fundamentals_cache")
      .select("symbol, week_52_high, fetched_at")

    const cacheMap = new Map(
      (existingCache ?? []).map((r: any) => [r.symbol, r]),
    )
    const now = Date.now()
    const TTL = 24 * 60 * 60 * 1000

    const prioritySymbols = new Set(existingCache?.map((r: any) => r.symbol) || [])

    const needsRefresh = (sym: string): boolean => {
      const cached = cacheMap.get(sym) as any
      if (!cached) return true
      if (!cached.week_52_high) return true
      return now - new Date(cached.fetched_at).getTime() > TTL
    }

    const allSymbols = (allUniverseSymbols ?? []).map((r: any) => r.symbol as string)

    const toFetch = [
      // Primero los que ya tienen cache pero necesitan refresh (screener los usa activamente)
      ...allSymbols.filter((s) => prioritySymbols.has(s) && needsRefresh(s)),
      // Luego los que no tienen cache aún
      ...allSymbols.filter((s) => !prioritySymbols.has(s) && needsRefresh(s)),
    ].slice(0, 50)

    console.log(
      `[Sync] Step 2: ${toFetch.length} symbols need fundamentals refresh (${cacheMap.size} already in cache)`,
    )
    console.log(`[Sync] toFetch count: ${toFetch.length}`)
    console.log(`[Sync] Sample toFetch:`, toFetch.slice(0, 5))

    // ── Step 3: Fetch fundamentals sequentially (150ms delay) ─────────────────
    console.log("[Sync] Step 3: Fetching fundamentals...")
    let fetched = 0
    let errors = 0

    for (const sym of toFetch) {
      try {
        const payload = fmpKey
          ? await fetchFmpFundamentals(sym, fmpKey, fmpBase)
          : await fetchYahooFundamentals(sym)

        if (payload) {
          const row: Record<string, unknown> = {
            symbol: sym,
            eps_current: payload.eps_current,
            eps_next_estimate: payload.eps_next_estimate,
            eps_growth_next_pct: payload.eps_growth_next_pct,
            revenue_growth_pct: payload.revenue_growth_pct,
            pe_ratio: payload.pe_ratio,
            next_earnings_date: payload.next_earnings_date,
            next_earnings_estimate_eps: payload.next_earnings_estimate_eps,
            price: payload.price,
            market_cap: payload.market_cap,
            price_change_pct_1d: payload.price_change_pct_1d,
            volume: payload.volume,
            name: payload.name,
            fetched_at: new Date().toISOString(),
          }
          // Never overwrite existing valid 52w data with null
          if (payload.week_52_high !== null) row.week_52_high = payload.week_52_high
          if (payload.week_52_low !== null) row.week_52_low = payload.week_52_low

          const { error: upsertErr } = await supabase
            .from("fundamentals_cache")
            .upsert(row, { onConflict: "symbol" })

          if (upsertErr) {
            console.error(`[Sync] Upsert error for ${sym}:`, JSON.stringify(upsertErr))
            errors++
          } else {
            fetched++
          }
        }
      } catch (e) {
        console.error(`[Sync] Error fetching fundamentals for ${sym}:`, e)
        errors++
      }

      await new Promise((r) => setTimeout(r, 150))
    }

    console.log(
      `[Sync] Step 3 complete: ${fetched} saved, ${errors} errors out of ${toFetch.length} attempted`,
    )

    return new Response(
      JSON.stringify({
        success: true,
        assets_synced: filteredAssets.length,
        fundamentals_fetched: fetched,
        fundamentals_errors: errors,
        fundamentals_already_fresh: cacheMap.size - toFetch.length,
      }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("[Sync] Fatal error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface FundamentalsPayload {
  eps_current: number | null
  eps_next_estimate: number | null
  eps_growth_next_pct: number | null
  revenue_growth_pct: number | null
  pe_ratio: number | null
  next_earnings_date: string | null
  next_earnings_estimate_eps: number | null
  price: number | null
  market_cap: number | null
  week_52_high: number | null
  week_52_low: number | null
  price_change_pct_1d: number | null
  volume: number | null
  name: string | null
}

async function fetchFmpFundamentals(
  symbol: string,
  fmpKey: string,
  fmpBase: string,
): Promise<FundamentalsPayload | null> {
  try {
    const [quoteRes, estimatesRes] = await Promise.all([
      fetch(`${fmpBase}/quote/${symbol}?apikey=${fmpKey}`),
      fetch(`${fmpBase}/analyst-estimates/${symbol}?limit=1&apikey=${fmpKey}`),
    ])
    const [quoteRaw, estimatesRaw] = await Promise.all([
      quoteRes.text(),
      estimatesRes.text(),
    ])

    const quoteData = JSON.parse(quoteRaw)
    const estimatesData = JSON.parse(estimatesRaw)
    const quote = Array.isArray(quoteData) ? quoteData[0] : null
    const estimates = Array.isArray(estimatesData) ? estimatesData[0] : null

    if (!quote) return await fetchYahooFundamentals(symbol)

    const epsCurr = quote.eps ?? null
    const epsNext = estimates?.estimatedEpsAvg ?? null
    const epsGrowthPct =
      epsNext && epsCurr && epsCurr !== 0
        ? ((epsNext - epsCurr) / Math.abs(epsCurr)) * 100
        : null

    console.log(`[Sync/FMP] ${symbol} yearHigh=${quote.yearHigh} yearLow=${quote.yearLow}`)

    return {
      eps_current: epsCurr,
      eps_next_estimate: epsNext,
      eps_growth_next_pct: epsGrowthPct,
      revenue_growth_pct: null,
      pe_ratio: quote.pe ?? null,
      next_earnings_date: quote.earningsAnnouncement
        ? quote.earningsAnnouncement.split("T")[0]
        : null,
      next_earnings_estimate_eps: epsNext,
      price: quote.price ?? null,
      market_cap: quote.marketCap ?? null,
      week_52_high: quote.yearHigh ?? null,
      week_52_low: quote.yearLow ?? null,
      price_change_pct_1d: quote.changesPercentage ?? null,
      volume: quote.volume ?? null,
      name: quote.name ?? symbol,
    }
  } catch (e) {
    console.error(`[Sync/FMP] Error for ${symbol}:`, e)
    return await fetchYahooFundamentals(symbol)
  }
}

async function fetchYahooFundamentals(symbol: string): Promise<FundamentalsPayload | null> {
  try {
    const modules =
      "financialData,defaultKeyStatistics,earningsTrend,summaryDetail,calendarEvents,quoteType"
    const res = await fetch(
      `${YAHOO_BASE}/${symbol}?modules=${modules}&corsDomain=finance.yahoo.com`,
      {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://finance.yahoo.com",
        },
      },
    )

    if (!res.ok) return null

    const body = await res.json()
    const result = body.quoteSummary?.result?.[0]
    if (!result) return null

    const stats = result.defaultKeyStatistics ?? {}
    const fin = result.financialData ?? {}
    const summary = result.summaryDetail ?? {}
    const trend = result.earningsTrend?.trend?.[0] ?? {}
    const calendar = result.calendarEvents?.earnings ?? {}
    const qType = result.quoteType ?? {}

    const epsCurr = stats.trailingEps?.raw ?? null
    const epsNextVal = trend.earningsEstimate?.avg?.raw ?? null
    const epsGrowthPct =
      epsNextVal && epsCurr && epsCurr !== 0
        ? ((epsNextVal - epsCurr) / Math.abs(epsCurr)) * 100
        : null
    const w52h = summary.fiftyTwoWeekHigh?.raw ?? stats.fiftyTwoWeekHigh?.raw ?? null
    const w52l = summary.fiftyTwoWeekLow?.raw ?? stats.fiftyTwoWeekLow?.raw ?? null

    console.log(`[Sync/Yahoo] ${symbol} 52w: high=${w52h} low=${w52l}`)

    return {
      eps_current: epsCurr,
      eps_next_estimate: epsNextVal,
      eps_growth_next_pct: epsGrowthPct,
      revenue_growth_pct: fin.revenueGrowth?.raw ? fin.revenueGrowth.raw * 100 : null,
      pe_ratio: summary.trailingPE?.raw ?? null,
      next_earnings_date: calendar.earningsDate?.[0]?.fmt ?? trend.endDate ?? null,
      next_earnings_estimate_eps: epsNextVal,
      price:
        fin.currentPrice?.raw ??
        summary.previousClose?.raw ??
        summary.regularMarketPrice?.raw ??
        null,
      market_cap: summary.marketCap?.raw ?? null,
      week_52_high: w52h,
      week_52_low: w52l,
      price_change_pct_1d: null,
      volume: summary.volume?.raw ?? null,
      name: qType.longName ?? qType.shortName ?? symbol,
    }
  } catch (e) {
    console.error(`[Sync/Yahoo] Error for ${symbol}:`, e)
    return null
  }
}
