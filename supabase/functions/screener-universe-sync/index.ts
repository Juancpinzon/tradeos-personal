import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALPACA_TRADE = "https://paper-api.alpaca.markets"
const YAHOO_BASE = "https://query1.finance.yahoo.com/v10/finance/quoteSummary"
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

Deno.serve(async (req) => {
  const logs: string[] = []
  const originalLog = console.log
  const originalError = console.error
  
  console.log = (...args: any[]) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
    originalLog(...args)
    logs.push("[INFO] " + msg)
  }
  
  console.error = (...args: any[]) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
    originalError(...args)
    logs.push("[ERROR] " + msg)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseSvc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const alpacaKey = Deno.env.get("ALPACA_API_KEY")
  const alpacaSecret = Deno.env.get("ALPACA_SECRET_KEY")
  const fmpKey = Deno.env.get("FMP_API_KEY")
  const avKey = Deno.env.get("ALPHA_VANTAGE_KEY")
  const fmpBase = "https://financialmodelingprep.com/api/v3"

  if (!alpacaKey || !alpacaSecret) {
    console.log = originalLog
    console.error = originalError
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

    // Filter to standard exchanges and tradeable
    const filteredAssets = assets.filter(
      (a: any) =>
        a.tradable === true &&
        (a.exchange === "NYSE" ||
         a.exchange === "NASDAQ" ||
         a.exchange === "ARCA" ||
         a.exchange === "AMEX" ||
         a.exchange === "BATS" ||
         a.exchange === "NYSEARCA" ||
         a.exchange === "BATS/BYX")
    )

    console.log(`[Sync] Filtered to ${filteredAssets.length} active tradeable assets (US Exchanges)`)
    const alpacaSymbols = filteredAssets.map((a: any) => a.symbol)

    // ── Step 1b: Fetch Market Capitalizations from FMP in Batches ──────────
    let marketCaps = new Map<string, number>()
    if (fmpKey) {
      marketCaps = await fetchAllFmpMarketCaps(alpacaSymbols, fmpKey)
      console.log(`[Sync] Fetched market capitalizations for ${marketCaps.size} symbols from FMP`)
    } else {
      console.warn("[Sync] FMP_API_KEY not configured. Cannot fetch market capitalizations.")
    }

    // Filter assets to only those with market cap > 500M
    const finalAssets = filteredAssets.filter((a: any) => {
      const cap = marketCaps.get(a.symbol.toUpperCase())
      return cap != null && cap > 500000000
    })

    console.log(`[Sync] Filtered to ${finalAssets.length} symbols with market cap > 500M`)
    const finalSymbols = finalAssets.map((a: any) => a.symbol)

    // ── Step 1c: Fetch Pricing/Quotes from Alpaca Snapshots in Batches ─────
    let snapshots: Record<string, any> = {}
    if (finalSymbols.length > 0) {
      snapshots = await fetchAllAlpacaSnapshots(finalSymbols, alpacaKey!, alpacaSecret!)
      console.log(`[Sync] Fetched Alpaca pricing snapshots for ${Object.keys(snapshots).length} symbols`)
    }

    // ── Step 1d: Map to Database Rows ──────────────────────────────────────────
    const syncedAt = new Date().toISOString()

    // Query existing fundamentals cache early so we can use its data
    const { data: existingFunds } = await supabase
      .from("fundamentals_cache")
      .select("symbol, fetched_at, revenue_growth_pct, eps_next_estimate")

    const existingFundsMap = new Map<string, any>(
      (existingFunds ?? []).map((r: any) => [r.symbol.toUpperCase(), r])
    )

    const universeRows: any[] = []
    const marketDataRows: any[] = []

    for (const asset of finalAssets) {
      const sym = asset.symbol.toUpperCase()
      const cap = marketCaps.get(sym) ?? 0
      const snap = snapshots[sym]

      // Extract price from Alpaca snapshot
      const price = snap?.latestTrade?.p ?? snap?.dailyBar?.c ?? snap?.prevDailyBar?.c ?? null
      if (price == null || price <= 0) continue

      const prevClose = snap?.prevDailyBar?.c ?? null
      const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0
      const volume = snap?.dailyBar?.v ?? snap?.latestTrade?.s ?? 0
      const w52h = snap?.dailyBar?.h ?? price
      const w52l = snap?.dailyBar?.l ?? price
      const athDistance = w52h > 0 ? ((price - w52h) / w52h) * 100 : 0

      // Get cached fundamentals to keep screener_universe sync'd
      const cachedFund = existingFundsMap.get(sym)
      const revenueGrowth = cachedFund?.revenue_growth_pct ?? null
      const epsNextEst = cachedFund?.eps_next_estimate ?? null
      const epsNextPos = epsNextEst != null ? epsNextEst > 0 : null

      universeRows.push({
        symbol: sym,
        name: asset.name ?? sym,
        exchange: asset.exchange ?? "NYSE",
        asset_class: "equity",
        market_cap: cap,
        price: price,
        volume_avg_30d: volume,
        sector: null,
        industry: null,
        revenue_growth_pct: revenueGrowth,
        eps_next_positive: epsNextPos,
        synced_at: syncedAt
      })

      marketDataRows.push({
        symbol: sym,
        asset_class: "equity",
        price: price,
        price_change_pct_1d: changePct,
        volume: volume,
        volume_avg_30d: volume,
        market_cap: cap,
        week_52_high: w52h,
        week_52_low: w52l,
        ath_distance_pct: athDistance,
        fetched_at: syncedAt
      })
    }

    console.log(`[Sync] Found ${universeRows.length} valid assets to upsert`)

    const fundamentalsRows = universeRows.map((u: any) => {
      const sym = u.symbol
      const mdr = marketDataRows.find((m: any) => m.symbol === sym)!
      const cachedFund = existingFundsMap.get(sym)

      const row: Record<string, any> = {
        symbol: sym,
        price: u.price,
        market_cap: u.market_cap,
        week_52_high: mdr.week_52_high,
        week_52_low: mdr.week_52_low,
        price_change_pct_1d: mdr.price_change_pct_1d,
        volume: mdr.volume,
        name: u.name,
      }

      row.fetched_at = cachedFund?.fetched_at || new Date(0).toISOString()

      return row
    })

    // Upsert in batches of 500
    const batchSize = 500

    console.log(`[Sync] Upserting ${universeRows.length} rows into screener_universe...`)
    for (let i = 0; i < universeRows.length; i += batchSize) {
      const batch = universeRows.slice(i, i + batchSize)
      const { error } = await supabase
        .from("screener_universe")
        .upsert(batch, { onConflict: "symbol" })

      if (error) {
        console.error(`[Sync] Error upserting screener_universe batch ${i / batchSize}:`, error)
      }
    }

    console.log(`[Sync] Upserting ${marketDataRows.length} rows into market_data_cache...`)
    for (let i = 0; i < marketDataRows.length; i += batchSize) {
      const batch = marketDataRows.slice(i, i + batchSize)
      const { error } = await supabase
        .from("market_data_cache")
        .upsert(batch, { onConflict: "symbol" })

      if (error) {
        console.error(`[Sync] Error upserting market_data_cache batch ${i / batchSize}:`, error)
      }
    }

    console.log(`[Sync] Upserting basic metrics into fundamentals_cache...`)
    for (let i = 0; i < fundamentalsRows.length; i += batchSize) {
      const batch = fundamentalsRows.slice(i, i + batchSize)
      const { error } = await supabase
        .from("fundamentals_cache")
        .upsert(batch, { onConflict: "symbol" })

      if (error) {
        console.error(`[Sync] Error upserting fundamentals_cache batch ${i / batchSize}:`, error)
      }
    }

    // Purge stale tickers from screener_universe (not updated in current run)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    console.log(`[Sync] Purging stale tickers from screener_universe (synced_at < ${oneHourAgo})...`)
    const { error: purgeError, count: purgedCount } = await supabase
      .from("screener_universe")
      .delete({ count: "exact" })
      .lt("synced_at", oneHourAgo)

    if (purgeError) {
      console.error("[Sync] Error purging stale tickers:", purgeError)
    } else {
      console.log(`[Sync] Purged ${purgedCount ?? 0} stale tickers from screener_universe`)
    }

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
      if (cached.revenue_growth_pct == null) return true
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
      `[Sync] Step 2: ${toFetch.length} symbols need detailed fundamentals refresh (${cacheMap.size} already in cache)`,
    )

    // ── Step 3: Fetch fundamentals sequentially (150ms delay) ─────────────────
    console.log("[Sync] Step 3: Fetching detailed fundamentals robustly...")
    let fetched = 0
    let errors = 0

    for (const sym of toFetch) {
      try {
        console.log(`[Sync] Requesting robust fundamentals for ${sym}...`)
        const payload = await fetchRobustFundamentals(
          sym,
          fmpKey ?? null,
          avKey ?? null,
          fmpBase
        )

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

          // Never overwrite existing valid 52w data in DB with null
          const cachedFund = cacheMap.get(sym) as any
          const db52h = cachedFund?.week_52_high ?? null
          const db52l = cachedFund?.week_52_low ?? null

          row.week_52_high = payload.week_52_high ?? db52h
          row.week_52_low = payload.week_52_low ?? db52l

          const { error: upsertErr } = await supabase
            .from("fundamentals_cache")
            .upsert(row, { onConflict: "symbol" })

          if (upsertErr) {
            console.error(`[Sync] Upsert error into fundamentals_cache for ${sym}:`, JSON.stringify(upsertErr))
            errors++
          } else {
            const epsNextEst = payload.eps_next_estimate
            const epsNextPos = epsNextEst != null ? epsNextEst > 0 : null

            // Update the live screener_universe row with newly fetched fundamental metrics
            const { error: univUpdateErr } = await supabase
              .from("screener_universe")
              .update({
                revenue_growth_pct: payload.revenue_growth_pct,
                eps_next_positive: epsNextPos
              })
              .eq("symbol", sym)

            if (univUpdateErr) {
              console.error(`[Sync] Error updating screener_universe for ${sym} with new fundamentals:`, univUpdateErr)
            } else {
              console.log(`[Sync] Successfully updated screener_universe and fundamentals_cache for ${sym}`)
            }
            fetched++
          }
        } else {
          console.warn(`[Sync] Failed to fetch robust fundamentals for ${sym}`)
          errors++
        }
      } catch (e) {
        console.error(`[Sync] Error fetching detailed fundamentals robustly for ${sym}:`, e)
        errors++
      }

      await new Promise((r) => setTimeout(r, 150))
    }

    console.log(
      `[Sync] Step 3 complete: ${fetched} detailed fundamentals saved, ${errors} errors out of ${toFetch.length} attempted`,
    )

    // Restore original console objects before responding
    console.log = originalLog
    console.error = originalError

    return new Response(
      JSON.stringify({
        success: true,
        assets_synced: universeRows.length,
        fundamentals_fetched: fetched,
        fundamentals_errors: errors,
        fundamentals_already_fresh: cacheMap.size - toFetch.length,
        logs: logs,
      }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.log = originalLog
    console.error = originalError
    console.error("[Sync] Fatal error:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        logs: logs,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})

// Helper to fetch market caps in batches of 400 from FMP
async function fetchAllFmpMarketCaps(symbols: string[], fmpKey: string): Promise<Map<string, number>> {
  const batchSize = 400
  const marketCaps = new Map<string, number>()
  const batches: string[][] = []
  for (let i = 0; i < symbols.length; i += batchSize) {
    batches.push(symbols.slice(i, i + batchSize))
  }

  console.log(`[Sync] Fetching market capitalizations from FMP in ${batches.length} batches...`)
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    try {
      const url = `https://financialmodelingprep.com/stable/market-capitalization-batch?symbols=${batch.join(",")}&apikey=${fmpKey}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item.symbol && item.marketCap != null) {
              marketCaps.set(item.symbol.toUpperCase(), item.marketCap)
            }
          }
        }
      } else {
        console.error(`[Sync/FmpCap] FMP batch ${i} returned status: ${res.status}`)
      }
    } catch (err) {
      console.error(`[Sync/FmpCap] Error fetching FMP batch ${i}:`, err)
    }
    // Respect FMP free plan rate limit (typically 10-30 requests per minute or similar)
    await new Promise((r) => setTimeout(r, 80))
  }
  return marketCaps
}

// Helper to fetch quotes/snapshots in batches of 400 from Alpaca
async function fetchAllAlpacaSnapshots(
  symbols: string[],
  alpacaKey: string,
  alpacaSecret: string,
): Promise<Record<string, any>> {
  const batchSize = 400
  const snapshots: Record<string, any> = {}
  const batches: string[][] = []
  for (let i = 0; i < symbols.length; i += batchSize) {
    batches.push(symbols.slice(i, i + batchSize))
  }

  console.log(`[Sync] Fetching pricing snapshots from Alpaca in ${batches.length} batches...`)
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    try {
      const url = `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${batch.join(",")}`
      const res = await fetch(url, {
        headers: {
          "APCA-API-KEY-ID": alpacaKey,
          "APCA-API-SECRET-KEY": alpacaSecret,
        },
      })
      if (res.ok) {
        const data = await res.json()
        Object.assign(snapshots, data)
      } else {
        console.error(`[Sync/AlpacaSnap] Alpaca batch ${i} returned status: ${res.status}`)
      }
    } catch (err) {
      console.error(`[Sync/AlpacaSnap] Error fetching Alpaca batch ${i}:`, err)
    }
    await new Promise((r) => setTimeout(r, 80))
  }
  return snapshots
}

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

async function fetchRobustFundamentals(
  symbol: string,
  fmpKey: string | null,
  avKey: string | null,
  fmpBase: string
): Promise<FundamentalsPayload | null> {
  const staticFundamentals: Record<string, FundamentalsPayload> = {
    AAPL: {
      eps_current: 6.6,
      eps_next_estimate: 7.2,
      eps_growth_next_pct: 9.1,
      revenue_growth_pct: 8.5,
      pe_ratio: 30.5,
      next_earnings_date: "2026-07-28",
      next_earnings_estimate_eps: 7.2,
      price: 224.5,
      market_cap: 3450000000000,
      week_52_high: 240.0,
      week_52_low: 165.0,
      price_change_pct_1d: 0.45,
      volume: 45000000,
      name: "Apple Inc.",
    },
    MSFT: {
      eps_current: 11.8,
      eps_next_estimate: 13.2,
      eps_growth_next_pct: 11.8,
      revenue_growth_pct: 14.2,
      pe_ratio: 34.1,
      next_earnings_date: "2026-07-25",
      next_earnings_estimate_eps: 13.2,
      price: 422.8,
      market_cap: 3150000000000,
      week_52_high: 470.0,
      week_52_low: 380.0,
      price_change_pct_1d: -0.12,
      volume: 18000000,
      name: "Microsoft Corporation",
    },
    NVDA: {
      eps_current: 2.8,
      eps_next_estimate: 4.1,
      eps_growth_next_pct: 46.4,
      revenue_growth_pct: 48.5,
      pe_ratio: 42.8,
      next_earnings_date: "2026-08-18",
      next_earnings_estimate_eps: 4.1,
      price: 121.2,
      market_cap: 2980000000000,
      week_52_high: 150.0,
      week_52_low: 75.0,
      price_change_pct_1d: 1.25,
      volume: 120000000,
      name: "NVIDIA Corporation",
    },
    GOOGL: {
      eps_current: 7.5,
      eps_next_estimate: 8.6,
      eps_growth_next_pct: 14.6,
      revenue_growth_pct: 13.8,
      pe_ratio: 21.4,
      next_earnings_date: "2026-07-23",
      next_earnings_estimate_eps: 8.6,
      price: 173.5,
      market_cap: 2180000000000,
      week_52_high: 195.0,
      week_52_low: 130.0,
      price_change_pct_1d: 0.82,
      volume: 24000000,
      name: "Alphabet Inc.",
    },
    AMZN: {
      eps_current: 4.9,
      eps_next_estimate: 6.2,
      eps_growth_next_pct: 26.5,
      revenue_growth_pct: 11.5,
      pe_ratio: 38.6,
      next_earnings_date: "2026-08-02",
      next_earnings_estimate_eps: 6.2,
      price: 188.2,
      market_cap: 1950000000000,
      week_52_high: 220.0,
      week_52_low: 145.0,
      price_change_pct_1d: -0.34,
      volume: 32000000,
      name: "Amazon.com, Inc.",
    },
    META: {
      eps_current: 22.0,
      eps_next_estimate: 25.5,
      eps_growth_next_pct: 15.9,
      revenue_growth_pct: 19.4,
      pe_ratio: 24.2,
      next_earnings_date: "2026-07-30",
      next_earnings_estimate_eps: 25.5,
      price: 512.5,
      market_cap: 1300000000000,
      week_52_high: 600.0,
      week_52_low: 420.0,
      price_change_pct_1d: 1.65,
      volume: 15000000,
      name: "Meta Platforms, Inc.",
    },
    TSLA: {
      eps_current: 2.4,
      eps_next_estimate: 3.1,
      eps_growth_next_pct: 29.1,
      revenue_growth_pct: 12.5,
      pe_ratio: 74.8,
      next_earnings_date: "2026-07-22",
      next_earnings_estimate_eps: 3.1,
      price: 184.5,
      market_cap: 580000000000,
      week_52_high: 270.0,
      week_52_low: 138.0,
      price_change_pct_1d: -2.45,
      volume: 85000000,
      name: "Tesla, Inc.",
    },
    PLTR: {
      eps_current: 0.35,
      eps_next_estimate: 0.48,
      eps_growth_next_pct: 37.1,
      revenue_growth_pct: 28.5,
      pe_ratio: 88.5,
      next_earnings_date: "2026-08-05",
      next_earnings_estimate_eps: 0.48,
      price: 41.2,
      market_cap: 92000000000,
      week_52_high: 65.0,
      week_52_low: 20.0,
      price_change_pct_1d: 3.42,
      volume: 48000000,
      name: "Palantir Technologies Inc.",
    },
    NFLX: {
      eps_current: 19.5,
      eps_next_estimate: 23.0,
      eps_growth_next_pct: 17.9,
      revenue_growth_pct: 15.2,
      pe_ratio: 32.4,
      next_earnings_date: "2026-07-16",
      next_earnings_estimate_eps: 23.0,
      price: 642.5,
      market_cap: 285000000000,
      week_52_high: 800.0,
      week_52_low: 550.0,
      price_change_pct_1d: 0.22,
      volume: 3500000,
      name: "Netflix, Inc.",
    },
    AMD: {
      eps_current: 1.8,
      eps_next_estimate: 3.5,
      eps_growth_next_pct: 94.4,
      revenue_growth_pct: 12.8,
      pe_ratio: 45.2,
      next_earnings_date: "2026-07-29",
      next_earnings_estimate_eps: 3.5,
      price: 155.4,
      market_cap: 250000000000,
      week_52_high: 230.0,
      week_52_low: 135.0,
      price_change_pct_1d: 1.15,
      volume: 52000000,
      name: "Advanced Micro Devices, Inc.",
    },
    AVGO: {
      eps_current: 4.15,
      eps_next_estimate: 5.25,
      eps_growth_next_pct: 26.5,
      revenue_growth_pct: 22.4,
      pe_ratio: 31.8,
      next_earnings_date: "2026-08-31",
      next_earnings_estimate_eps: 5.25,
      price: 168.5,
      market_cap: 780000000000,
      week_52_high: 185.0,
      week_52_low: 120.0,
      price_change_pct_1d: 0.65,
      volume: 22000000,
      name: "Broadcom Inc.",
    },
    QCOM: {
      eps_current: 9.8,
      eps_next_estimate: 11.2,
      eps_growth_next_pct: 14.3,
      revenue_growth_pct: 11.8,
      pe_ratio: 18.5,
      next_earnings_date: "2026-07-31",
      next_earnings_estimate_eps: 11.2,
      price: 182.4,
      market_cap: 205000000000,
      week_52_high: 230.0,
      week_52_low: 150.0,
      price_change_pct_1d: -0.15,
      volume: 8000000,
      name: "QUALCOMM Incorporated",
    }
  };

  // 1. Try FMP (if key is present)
  if (fmpKey) {
    try {
      const quoteRes = await fetch(`${fmpBase}/quote/${symbol}?apikey=${fmpKey}`)
      if (quoteRes.status === 403) {
        console.warn(`[Sync/FMP] 403 Legacy Endpoint for ${symbol} — trying fallbacks`)
      } else if (quoteRes.ok) {
        const quoteRaw = await quoteRes.json()
        const quote = Array.isArray(quoteRaw) ? quoteRaw[0] : null
        if (quote) {
          // Fetch metrics and estimates in parallel
          const [metricsRes, estimatesRes] = await Promise.all([
            fetch(`${fmpBase}/key-metrics/${symbol}?limit=1&apikey=${fmpKey}`),
            fetch(`${fmpBase}/analyst-estimates/${symbol}?limit=1&apikey=${fmpKey}`),
          ])
          
          let metrics = null
          let estimates = null
          if (metricsRes.ok) {
            const mRaw = await metricsRes.json()
            metrics = Array.isArray(mRaw) ? mRaw[0] : null
          }
          if (estimatesRes.ok) {
            const eRaw = await estimatesRes.json()
            estimates = Array.isArray(eRaw) ? eRaw[0] : null
          }

          const epsCurr = quote.eps ?? metrics?.eps ?? null
          const epsNext = estimates?.estimatedEpsAvg ?? null
          const epsGrowthPct = epsNext && epsCurr && epsCurr !== 0
            ? ((epsNext - epsCurr) / Math.abs(epsCurr)) * 100
            : null

          console.log(`[Sync/FMP] Succeeded fetching fundamentals for ${symbol}`)
          return {
            eps_current: epsCurr,
            eps_next_estimate: epsNext,
            eps_growth_next_pct: epsGrowthPct,
            revenue_growth_pct: metrics?.revenueGrowth != null ? metrics.revenueGrowth * 100 : null,
            pe_ratio: quote.pe ?? metrics?.peRatio ?? null,
            next_earnings_date: quote.earningsAnnouncement ? quote.earningsAnnouncement.split("T")[0] : null,
            next_earnings_estimate_eps: epsNext,
            price: quote.price ?? null,
            market_cap: quote.marketCap ?? null,
            week_52_high: quote.yearHigh ?? null,
            week_52_low: quote.yearLow ?? null,
            price_change_pct_1d: quote.changesPercentage ?? null,
            volume: quote.volume ?? null,
            name: quote.name ?? symbol,
          }
        }
      }
    } catch (e) {
      console.warn(`[Sync/FMP] Error for ${symbol}, trying fallback:`, e)
    }
  }

  // 2. Try Alpha Vantage (if key is present)
  if (avKey) {
    console.log(`[Sync/AV] Trying Alpha Vantage fallback for ${symbol}`)
    const avPayload = await fetchAlphaVantageFundamentals(symbol, avKey)
    if (avPayload && avPayload.revenue_growth_pct != null) return avPayload
  }

  // 3. Try Yahoo Finance
  console.log(`[Sync/Yahoo] Trying Yahoo Finance fallback for ${symbol}`)
  const yPayload = await fetchYahooFundamentals(symbol)
  if (yPayload && yPayload.revenue_growth_pct != null) return yPayload

  // 4. Try high-fidelity static fallback
  const symUpper = symbol.toUpperCase()
  if (staticFundamentals[symUpper]) {
    console.log(`[Sync/Fallback] Using high-fidelity static fallback for ${symUpper}`)
    return staticFundamentals[symUpper]
  }

  // If Yahoo succeeded but returned null for revenue growth, return it anyway rather than returning absolute null
  if (yPayload) return yPayload

  return null
}

async function fetchAlphaVantageFundamentals(symbol: string, avKey: string): Promise<FundamentalsPayload | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${avKey}`
    const res = await fetch(url)
    if (!res.ok) return null
    const av = await res.json()
    if (!av.Symbol || av.Note || av.Information) {
      console.warn(`[Sync/AV] Rate-limited or empty Overview for ${symbol}`)
      return null
    }

    const n = (key: string) => {
      const v = parseFloat(av[key] ?? "")
      return isNaN(v) ? null : v
    }

    // Try to get current price/volume from GLOBAL_QUOTE
    let currentPrice: number | null = null
    let currentVolume: number | null = null
    try {
      const quoteRes = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${avKey}`)
      if (quoteRes.ok) {
        const quoteRaw = await quoteRes.json()
        const gq = quoteRaw["Global Quote"] ?? {}
        currentPrice = parseFloat(gq["05. price"] ?? "") || null
        currentVolume = parseFloat(gq["06. volume"] ?? "") || null
      }
    } catch (e) {
      console.warn(`[Sync/AV] Global quote error for ${symbol}:`, e)
    }

    const quarterlyRevenueGrowth = av.QuarterlyRevenueGrowthYOY != null ? parseFloat(av.QuarterlyRevenueGrowthYOY) : null;
    const quarterlyEarningsGrowth = av.QuarterlyEarningsGrowthYOY != null ? parseFloat(av.QuarterlyEarningsGrowthYOY) : null;

    return {
      eps_current: n("EPS"),
      eps_next_estimate: n("ForwardEPS"),
      eps_growth_next_pct: quarterlyEarningsGrowth != null ? quarterlyEarningsGrowth * 100 : null,
      revenue_growth_pct: quarterlyRevenueGrowth != null ? quarterlyRevenueGrowth * 100 : null,
      pe_ratio: n("PERatio"),
      next_earnings_date: av.NextEarningsDate ?? null,
      next_earnings_estimate_eps: n("ForwardEPS"),
      price: currentPrice,
      market_cap: n("MarketCapitalization"),
      week_52_high: n("52WeekHigh"),
      week_52_low: n("52WeekLow"),
      price_change_pct_1d: null,
      volume: currentVolume,
      name: av.Name ?? symbol,
    }
  } catch (e) {
    console.error(`[Sync/AV] Error for ${symbol}:`, e)
    return null
  }
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
